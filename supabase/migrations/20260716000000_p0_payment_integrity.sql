-- P0 payment integrity: transactional order/webhook helpers, extended payment statuses

-- Extended payment statuses (Mollie map)
DO $$
BEGIN
  ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'AUTHORIZED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'REFUNDED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'CHARGED_BACK';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS provider_status TEXT;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_type TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS payment_init_status TEXT NOT NULL DEFAULT 'PENDING';

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key
  ON orders (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

ALTER TABLE webhook_events
  ADD COLUMN IF NOT EXISTS processing_status TEXT NOT NULL DEFAULT 'PROCESSED',
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- Rate limit helper for application-layer production limiting
CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  key TEXT PRIMARY KEY,
  count INT NOT NULL DEFAULT 0,
  reset_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE rate_limit_buckets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny anon rate_limit_buckets" ON rate_limit_buckets;
CREATE POLICY "Deny anon rate_limit_buckets" ON rate_limit_buckets
  FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key TEXT,
  p_limit INT,
  p_window_seconds INT
)
RETURNS TABLE(allowed BOOLEAN, retry_after_seconds INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_count INT;
  v_reset TIMESTAMPTZ;
BEGIN
  SELECT count, reset_at INTO v_count, v_reset
  FROM rate_limit_buckets
  WHERE key = p_key
  FOR UPDATE;

  IF NOT FOUND OR v_reset <= v_now THEN
    INSERT INTO rate_limit_buckets(key, count, reset_at)
    VALUES (p_key, 1, v_now + make_interval(secs => p_window_seconds))
    ON CONFLICT (key) DO UPDATE
      SET count = 1,
          reset_at = v_now + make_interval(secs => p_window_seconds);
    allowed := TRUE;
    retry_after_seconds := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  UPDATE rate_limit_buckets
  SET count = count + 1
  WHERE key = p_key
  RETURNING count INTO v_count;

  IF v_count > p_limit THEN
    allowed := FALSE;
    retry_after_seconds := GREATEST(1, EXTRACT(EPOCH FROM (v_reset - v_now))::INT);
  ELSE
    allowed := TRUE;
    retry_after_seconds := 0;
  END IF;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION create_order_with_items(
  p_order JSONB,
  p_items JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO orders (
    id, order_number, status, customer_email, customer_first_name, customer_last_name,
    customer_company, customer_phone, customer_type, subtotal_cents, vat_cents, total_cents,
    vat_rate, notes, confirmation_sent, delivery_released, idempotency_key, payment_init_status
  )
  VALUES (
    (p_order->>'id')::UUID,
    p_order->>'order_number',
    COALESCE(p_order->>'status', 'PENDING')::order_status,
    p_order->>'customer_email',
    p_order->>'customer_first_name',
    p_order->>'customer_last_name',
    p_order->>'customer_company',
    p_order->>'customer_phone',
    p_order->>'customer_type',
    (p_order->>'subtotal_cents')::INT,
    (p_order->>'vat_cents')::INT,
    (p_order->>'total_cents')::INT,
    (p_order->>'vat_rate')::NUMERIC,
    p_order->>'notes',
    COALESCE((p_order->>'confirmation_sent')::BOOLEAN, FALSE),
    COALESCE((p_order->>'delivery_released')::BOOLEAN, FALSE),
    NULLIF(p_order->>'idempotency_key', ''),
    COALESCE(p_order->>'payment_init_status', 'PENDING')
  );

  INSERT INTO order_items (
    order_id, product_id, product_name, product_slug, quantity,
    unit_price_cents, total_cents, billing_type
  )
  SELECT
    (item->>'order_id')::UUID,
    (item->>'product_id')::UUID,
    item->>'product_name',
    item->>'product_slug',
    (item->>'quantity')::INT,
    (item->>'unit_price_cents')::INT,
    (item->>'total_cents')::INT,
    (item->>'billing_type')::billing_type
  FROM jsonb_array_elements(p_items) AS item;
END;
$$;

CREATE OR REPLACE FUNCTION apply_mollie_payment_update(
  p_order_id UUID,
  p_payment_id TEXT,
  p_external_event_id TEXT,
  p_event_type TEXT,
  p_order_status TEXT,
  p_payment_status TEXT,
  p_provider_status TEXT,
  p_release_delivery BOOLEAN,
  p_revoke_delivery BOOLEAN,
  p_amount_cents INT
)
RETURNS TABLE(already_processed BOOLEAN, order_status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
  v_current TEXT;
  v_new_status TEXT;
BEGIN
  BEGIN
    INSERT INTO webhook_events (
      id, provider, payment_id, external_event_id, event_type,
      processed, processing_status
    )
    VALUES (
      gen_random_uuid(), 'mollie', p_payment_id, p_external_event_id, p_event_type,
      FALSE, 'PROCESSING'
    )
    RETURNING id INTO v_event_id;
  EXCEPTION WHEN unique_violation THEN
    SELECT id, processing_status, processed
    INTO v_event_id, v_current, already_processed
    FROM webhook_events
    WHERE provider = 'mollie' AND external_event_id = p_external_event_id;

    IF already_processed IS TRUE OR v_current = 'PROCESSED' THEN
      already_processed := TRUE;
      SELECT status::TEXT INTO order_status FROM orders WHERE id = p_order_id;
      RETURN NEXT;
      RETURN;
    END IF;

    UPDATE webhook_events
    SET processing_status = 'PROCESSING', processed = FALSE, last_error = NULL
    WHERE id = v_event_id;
  END;

  SELECT status::TEXT INTO v_current FROM orders WHERE id = p_order_id FOR UPDATE;
  IF v_current IS NULL THEN
    UPDATE webhook_events
    SET processing_status = 'FAILED', last_error = 'order_not_found', processed = FALSE
    WHERE id = v_event_id;
    RAISE EXCEPTION 'order_not_found';
  END IF;

  -- Duplicate paid: no-op
  IF v_current = 'PAID' AND p_order_status = 'PAID' THEN
    UPDATE webhook_events
    SET processed = TRUE, processing_status = 'PROCESSED', processed_at = NOW()
    WHERE id = v_event_id;
    already_processed := TRUE;
    order_status := v_current;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Block non-refund transitions after PAID
  IF v_current = 'PAID'
     AND p_payment_status NOT IN ('REFUNDED', 'CHARGED_BACK')
     AND COALESCE(p_order_status, '') <> 'REFUNDED' THEN
    UPDATE webhook_events
    SET processed = TRUE, processing_status = 'PROCESSED', processed_at = NOW()
    WHERE id = v_event_id;
    already_processed := TRUE;
    order_status := v_current;
    RETURN NEXT;
    RETURN;
  END IF;

  v_new_status := COALESCE(p_order_status, v_current);

  UPDATE orders
  SET
    status = v_new_status::order_status,
    delivery_released = CASE
      WHEN p_release_delivery THEN TRUE
      WHEN p_revoke_delivery THEN FALSE
      ELSE delivery_released
    END,
    updated_at = NOW()
  WHERE id = p_order_id;

  INSERT INTO payments (id, order_id, status, amount_cents, provider_status, updated_at)
  VALUES (
    p_payment_id,
    p_order_id,
    p_payment_status::payment_status,
    p_amount_cents,
    p_provider_status,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    status = EXCLUDED.status,
    amount_cents = EXCLUDED.amount_cents,
    provider_status = EXCLUDED.provider_status,
    updated_at = NOW();

  UPDATE webhook_events
  SET processed = TRUE, processing_status = 'PROCESSED', processed_at = NOW(), last_error = NULL
  WHERE id = v_event_id;

  already_processed := FALSE;
  order_status := v_new_status;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION check_rate_limit(TEXT, INT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION create_order_with_items(JSONB, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION apply_mollie_payment_update(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, INT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION check_rate_limit(TEXT, INT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION create_order_with_items(JSONB, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION apply_mollie_payment_update(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, INT) TO service_role;
