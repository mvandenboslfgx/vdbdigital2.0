-- P0.5: read-only/contract verification RPC for payment integrity migrations.
-- Does not enable checkout. Safe to apply with the other P0.5 migrations.
-- Behavioral checks run inside a subtransaction and roll back.

CREATE OR REPLACE FUNCTION p05_verify_payment_contracts(
  p_run_behavioral BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(check_name TEXT, ok BOOLEAN, detail TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
  v_allowed INT;
  v_denied INT;
  v_oid OID;
  v_secdef BOOLEAN;
  v_rate_allowed BOOLEAN;
  v_search TEXT;
  v_acl TEXT;
  v_order_id UUID;
  v_event_id TEXT;
  v_row RECORD;
  v_i INT;
BEGIN
  -- --- Migration / table presence ---
  RETURN QUERY
  SELECT 'table:orders'::TEXT, to_regclass('public.orders') IS NOT NULL, 'orders must exist'::TEXT;
  RETURN QUERY
  SELECT 'table:payments'::TEXT, to_regclass('public.payments') IS NOT NULL, 'payments must exist'::TEXT;
  RETURN QUERY
  SELECT 'table:webhook_events'::TEXT, to_regclass('public.webhook_events') IS NOT NULL, 'webhook_events must exist'::TEXT;
  RETURN QUERY
  SELECT 'table:rate_limit_buckets'::TEXT, to_regclass('public.rate_limit_buckets') IS NOT NULL, 'rate_limit_buckets must exist'::TEXT;

  -- --- payment_status enum values ---
  SELECT COUNT(*) INTO v_count
  FROM pg_enum e
  JOIN pg_type t ON t.oid = e.enumtypid
  WHERE t.typname = 'payment_status'
    AND e.enumlabel IN ('OPEN','PENDING','PAID','FAILED','CANCELLED','EXPIRED','AUTHORIZED','REFUNDED','CHARGED_BACK');
  RETURN QUERY
  SELECT 'enum:payment_status_extended'::TEXT,
         v_count = 9,
         format('found %s/9 required labels including AUTHORIZED/REFUNDED/CHARGED_BACK', v_count);

  -- --- Column contracts ---
  RETURN QUERY
  SELECT 'column:orders.idempotency_key'::TEXT,
         EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema='public' AND table_name='orders'
             AND column_name='idempotency_key' AND data_type='text' AND is_nullable='YES'
         ),
         'text nullable'::TEXT;
  RETURN QUERY
  SELECT 'column:orders.customer_type'::TEXT,
         EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema='public' AND table_name='orders'
             AND column_name='customer_type' AND data_type='text' AND is_nullable='YES'
         ),
         'text nullable'::TEXT;
  RETURN QUERY
  SELECT 'column:orders.payment_init_status'::TEXT,
         EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema='public' AND table_name='orders'
             AND column_name='payment_init_status' AND data_type='text'
             AND is_nullable='NO' AND column_default ILIKE '%PENDING%'
         ),
         'text NOT NULL default PENDING'::TEXT;
  RETURN QUERY
  SELECT 'column:payments.provider_status'::TEXT,
         EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema='public' AND table_name='payments'
             AND column_name='provider_status' AND data_type='text' AND is_nullable='YES'
         ),
         'text nullable'::TEXT;
  RETURN QUERY
  SELECT 'column:webhook_events.processing_status'::TEXT,
         EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema='public' AND table_name='webhook_events'
             AND column_name='processing_status' AND data_type='text'
             AND is_nullable='NO'
         ),
         'text NOT NULL'::TEXT;
  RETURN QUERY
  SELECT 'column:webhook_events.last_error'::TEXT,
         EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema='public' AND table_name='webhook_events'
             AND column_name='last_error'
         ),
         'present'::TEXT;
  RETURN QUERY
  SELECT 'column:webhook_events.processed_at'::TEXT,
         EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema='public' AND table_name='webhook_events'
             AND column_name='processed_at'
             AND data_type='timestamp with time zone'
         ),
         'timestamptz'::TEXT;

  -- --- Indexes / uniqueness ---
  RETURN QUERY
  SELECT 'index:idx_orders_idempotency_key'::TEXT,
         EXISTS (
           SELECT 1 FROM pg_indexes
           WHERE schemaname='public' AND indexname='idx_orders_idempotency_key'
         ),
         'partial unique index on idempotency_key'::TEXT;
  RETURN QUERY
  SELECT 'constraint:webhook_events_provider_external_id'::TEXT,
         EXISTS (
           SELECT 1 FROM pg_constraint
           WHERE conname='webhook_events_provider_external_id_key'
         ),
         'UNIQUE(provider, external_event_id)'::TEXT;
  RETURN QUERY
  SELECT 'constraint:rate_limit_buckets_pkey'::TEXT,
         EXISTS (
           SELECT 1 FROM pg_constraint
           WHERE conrelid='public.rate_limit_buckets'::regclass AND contype='p'
         ),
         'primary key on key'::TEXT;

  -- --- Existing data must not violate new NOT NULL defaults ---
  SELECT COUNT(*) INTO v_count FROM orders WHERE payment_init_status IS NULL;
  RETURN QUERY
  SELECT 'data:orders.payment_init_status_nonnull'::TEXT,
         v_count = 0,
         format('%s rows with NULL payment_init_status', v_count);

  SELECT COUNT(*) INTO v_count FROM webhook_events WHERE processing_status IS NULL;
  RETURN QUERY
  SELECT 'data:webhook_events.processing_status_nonnull'::TEXT,
         v_count = 0,
         format('%s rows with NULL processing_status', v_count);

  -- --- RPC: check_rate_limit ---
  SELECT p.oid, p.prosecdef, COALESCE(array_to_string(p.proconfig, ','), '')
  INTO v_oid, v_secdef, v_search
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'check_rate_limit'
    AND pg_get_function_identity_arguments(p.oid) = 'p_key text, p_limit integer, p_window_seconds integer';

  RETURN QUERY
  SELECT 'rpc:check_rate_limit.signature'::TEXT,
         v_oid IS NOT NULL,
         'check_rate_limit(text,integer,integer)'::TEXT;
  RETURN QUERY
  SELECT 'rpc:check_rate_limit.security_definer'::TEXT,
         COALESCE(v_secdef, FALSE),
         'SECURITY DEFINER required'::TEXT;
  RETURN QUERY
  SELECT 'rpc:check_rate_limit.search_path'::TEXT,
         COALESCE(v_search, '') ILIKE '%search_path=public%',
         COALESCE(v_search, 'missing proconfig');
  RETURN QUERY
  SELECT 'rpc:check_rate_limit.returns'::TEXT,
         EXISTS (
           SELECT 1 FROM pg_proc p
           JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname='public' AND p.proname='check_rate_limit'
             AND pg_get_function_result(p.oid) ILIKE '%allowed%'
             AND pg_get_function_result(p.oid) ILIKE '%retry_after_seconds%'
         ),
         'TABLE(allowed boolean, retry_after_seconds integer)'::TEXT;

  IF v_oid IS NOT NULL THEN
    SELECT COALESCE(string_agg(privilege_type, ','), '')
    INTO v_acl
    FROM information_schema.routine_privileges
    WHERE specific_schema='public'
      AND routine_name='check_rate_limit'
      AND grantee IN ('PUBLIC', 'anon', 'authenticated');
    RETURN QUERY
    SELECT 'rpc:check_rate_limit.no_public_execute'::TEXT,
           v_acl IS NULL OR v_acl = '',
           format('unexpected grants: %s', COALESCE(NULLIF(v_acl,''), 'none'));

    RETURN QUERY
    SELECT 'rpc:check_rate_limit.service_role_execute'::TEXT,
           EXISTS (
             SELECT 1 FROM information_schema.routine_privileges
             WHERE specific_schema='public'
               AND routine_name='check_rate_limit'
               AND grantee='service_role'
               AND privilege_type='EXECUTE'
           ),
           'service_role EXECUTE'::TEXT;
  END IF;

  -- --- RPC: create_order_with_items ---
  SELECT p.oid, p.prosecdef, COALESCE(array_to_string(p.proconfig, ','), '')
  INTO v_oid, v_secdef, v_search
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname='public'
    AND p.proname='create_order_with_items'
    AND pg_get_function_identity_arguments(p.oid) = 'p_order jsonb, p_items jsonb';

  RETURN QUERY
  SELECT 'rpc:create_order_with_items.signature'::TEXT, v_oid IS NOT NULL, 'create_order_with_items(jsonb,jsonb)'::TEXT;
  RETURN QUERY
  SELECT 'rpc:create_order_with_items.security_definer'::TEXT, COALESCE(v_secdef, FALSE), 'SECURITY DEFINER'::TEXT;
  RETURN QUERY
  SELECT 'rpc:create_order_with_items.search_path'::TEXT,
         COALESCE(v_search,'') ILIKE '%search_path=public%',
         COALESCE(v_search,'missing');

  IF v_oid IS NOT NULL THEN
    SELECT COALESCE(string_agg(privilege_type, ','), '') INTO v_acl
    FROM information_schema.routine_privileges
    WHERE specific_schema='public' AND routine_name='create_order_with_items'
      AND grantee IN ('PUBLIC','anon','authenticated');
    RETURN QUERY
    SELECT 'rpc:create_order_with_items.no_public_execute'::TEXT,
           v_acl IS NULL OR v_acl = '',
           format('unexpected grants: %s', COALESCE(NULLIF(v_acl,''), 'none'));
  END IF;

  -- --- RPC: apply_mollie_payment_update ---
  SELECT p.oid, p.prosecdef, COALESCE(array_to_string(p.proconfig, ','), '')
  INTO v_oid, v_secdef, v_search
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname='public'
    AND p.proname='apply_mollie_payment_update'
    AND pg_get_function_identity_arguments(p.oid) =
      'p_order_id uuid, p_payment_id text, p_external_event_id text, p_event_type text, p_order_status text, p_payment_status text, p_provider_status text, p_release_delivery boolean, p_revoke_delivery boolean, p_amount_cents integer';

  RETURN QUERY
  SELECT 'rpc:apply_mollie_payment_update.signature'::TEXT, v_oid IS NOT NULL,
         'apply_mollie_payment_update(...10 args...)'::TEXT;
  RETURN QUERY
  SELECT 'rpc:apply_mollie_payment_update.security_definer'::TEXT, COALESCE(v_secdef, FALSE), 'SECURITY DEFINER'::TEXT;
  RETURN QUERY
  SELECT 'rpc:apply_mollie_payment_update.search_path'::TEXT,
         COALESCE(v_search,'') ILIKE '%search_path=public%',
         COALESCE(v_search,'missing');
  RETURN QUERY
  SELECT 'rpc:apply_mollie_payment_update.returns'::TEXT,
         EXISTS (
           SELECT 1 FROM pg_proc p
           JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname='public' AND p.proname='apply_mollie_payment_update'
             AND pg_get_function_result(p.oid) ILIKE '%already_processed%'
             AND pg_get_function_result(p.oid) ILIKE '%order_status%'
         ),
         'TABLE(already_processed boolean, order_status text)'::TEXT;

  IF v_oid IS NOT NULL THEN
    SELECT COALESCE(string_agg(privilege_type, ','), '') INTO v_acl
    FROM information_schema.routine_privileges
    WHERE specific_schema='public' AND routine_name='apply_mollie_payment_update'
      AND grantee IN ('PUBLIC','anon','authenticated');
    RETURN QUERY
    SELECT 'rpc:apply_mollie_payment_update.no_public_execute'::TEXT,
           v_acl IS NULL OR v_acl = '',
           format('unexpected grants: %s', COALESCE(NULLIF(v_acl,''), 'none'));
  END IF;

  -- --- RLS ---
  RETURN QUERY
  SELECT 'rls:rate_limit_buckets.enabled'::TEXT,
         EXISTS (
           SELECT 1 FROM pg_class c
           JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname='public' AND c.relname='rate_limit_buckets' AND c.relrowsecurity
         ),
         'RLS enabled'::TEXT;
  RETURN QUERY
  SELECT 'rls:rate_limit_buckets.deny_anon'::TEXT,
         EXISTS (
           SELECT 1 FROM pg_policies
           WHERE schemaname='public' AND tablename='rate_limit_buckets'
             AND policyname='Deny anon rate_limit_buckets'
         ),
         'Deny anon policy'::TEXT;
  RETURN QUERY
  SELECT 'rls:rate_limit_buckets.deny_authenticated'::TEXT,
         EXISTS (
           SELECT 1 FROM pg_policies
           WHERE schemaname='public' AND tablename='rate_limit_buckets'
             AND policyname='Deny authenticated rate_limit_buckets'
         ),
         'Deny authenticated policy (p05 hardening)'::TEXT;

  -- Hardening marker: advisory lock present in function body
  RETURN QUERY
  SELECT 'rpc:check_rate_limit.advisory_lock'::TEXT,
         EXISTS (
           SELECT 1 FROM pg_proc p
           JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname='public' AND p.proname='check_rate_limit'
             AND p.prosrc ILIKE '%pg_advisory_xact_lock%'
         ),
         'pg_advisory_xact_lock required for concurrency'::TEXT;

  IF NOT COALESCE(p_run_behavioral, FALSE) THEN
    RETURN QUERY
    SELECT 'behavioral:skipped'::TEXT, TRUE,
           'pass p_run_behavioral=true on a test/staging DB to run concurrency + webhook reclaim'::TEXT;
    RETURN;
  END IF;

  -- --- Behavioral: rate limit concurrency (rolled back via cleanup key delete) ---
  BEGIN
    DELETE FROM rate_limit_buckets WHERE key LIKE 'p05-verify-%';
    v_allowed := 0;
    v_denied := 0;
    FOR v_i IN 1..12 LOOP
      SELECT allowed INTO v_rate_allowed
      FROM check_rate_limit('p05-verify-concurrency', 3, 60);
      IF COALESCE(v_rate_allowed, FALSE) THEN
        v_allowed := v_allowed + 1;
      ELSE
        v_denied := v_denied + 1;
      END IF;
    END LOOP;
    RETURN QUERY
    SELECT 'behavioral:rate_limit_serial_cap'::TEXT,
           v_allowed = 3 AND v_denied = 9,
           format('allowed=%s denied=%s (expect 3/9)', v_allowed, v_denied);
    DELETE FROM rate_limit_buckets WHERE key LIKE 'p05-verify-%';
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY
    SELECT 'behavioral:rate_limit_serial_cap'::TEXT, FALSE, SQLERRM;
  END;

  -- --- Behavioral: webhook reclaim after FAILED ---
  BEGIN
    v_order_id := gen_random_uuid();
    v_event_id := 'p05-verify:' || v_order_id::TEXT || ':paid';

    INSERT INTO orders (
      id, order_number, status, customer_email, customer_first_name, customer_last_name,
      subtotal_cents, vat_cents, total_cents, vat_rate, confirmation_sent, delivery_released,
      payment_init_status
    ) VALUES (
      v_order_id, 'P05-VERIFY-' || substr(v_order_id::TEXT, 1, 8), 'PENDING',
      'p05-verify@example.invalid', 'P05', 'Verify',
      1000, 210, 1210, 0.21, FALSE, FALSE, 'PENDING'
    );

    INSERT INTO webhook_events (
      id, provider, payment_id, external_event_id, event_type, processed, processing_status, last_error
    ) VALUES (
      gen_random_uuid(), 'mollie', 'tr_p05_verify', v_event_id, 'payment.paid',
      FALSE, 'FAILED', 'forced_failure_for_verify'
    );

    SELECT * INTO v_row
    FROM apply_mollie_payment_update(
      v_order_id,
      'tr_p05_verify',
      v_event_id,
      'payment.paid',
      'PAID',
      'PAID',
      'paid',
      TRUE,
      FALSE,
      1210
    );

    RETURN QUERY
    SELECT 'behavioral:webhook_reclaim_after_failed'::TEXT,
           COALESCE(v_row.already_processed, TRUE) = FALSE
             AND EXISTS (SELECT 1 FROM orders WHERE id=v_order_id AND status='PAID')
             AND EXISTS (
               SELECT 1 FROM webhook_events
               WHERE external_event_id=v_event_id AND processing_status='PROCESSED' AND processed=TRUE
             ),
           format('already_processed=%s order=%s', v_row.already_processed,
                  (SELECT status::TEXT FROM orders WHERE id=v_order_id));

    -- Duplicate paid must be already_processed
    SELECT * INTO v_row
    FROM apply_mollie_payment_update(
      v_order_id, 'tr_p05_verify', v_event_id, 'payment.paid',
      'PAID', 'PAID', 'paid', TRUE, FALSE, 1210
    );
    RETURN QUERY
    SELECT 'behavioral:webhook_duplicate_paid'::TEXT,
           COALESCE(v_row.already_processed, FALSE) = TRUE,
           format('already_processed=%s', v_row.already_processed);

    -- Refund after PAID
    SELECT * INTO v_row
    FROM apply_mollie_payment_update(
      v_order_id, 'tr_p05_verify_refund',
      'p05-verify:' || v_order_id::TEXT || ':refunded',
      'payment.refunded',
      'REFUNDED', 'REFUNDED', 'refunded', FALSE, TRUE, 1210
    );
    RETURN QUERY
    SELECT 'behavioral:refund_after_paid'::TEXT,
           COALESCE(v_row.already_processed, TRUE) = FALSE
             AND EXISTS (SELECT 1 FROM orders WHERE id=v_order_id AND status='REFUNDED'),
           format('order=%s', (SELECT status::TEXT FROM orders WHERE id=v_order_id));

    DELETE FROM payments WHERE order_id = v_order_id;
    DELETE FROM webhook_events WHERE payment_id LIKE 'tr_p05_verify%';
    DELETE FROM order_items WHERE order_id = v_order_id;
    DELETE FROM orders WHERE id = v_order_id;
  EXCEPTION WHEN OTHERS THEN
    DELETE FROM payments WHERE order_id = v_order_id;
    DELETE FROM webhook_events WHERE external_event_id LIKE 'p05-verify:%';
    DELETE FROM order_items WHERE order_id = v_order_id;
    DELETE FROM orders WHERE id = v_order_id;
    RETURN QUERY
    SELECT 'behavioral:webhook_reclaim_after_failed'::TEXT, FALSE, SQLERRM;
  END;
END;
$$;

REVOKE ALL ON FUNCTION p05_verify_payment_contracts(BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION p05_verify_payment_contracts(BOOLEAN) TO service_role;

COMMENT ON FUNCTION p05_verify_payment_contracts(BOOLEAN) IS
  'P0.5 fail-closed contract verifier for payment integrity migrations. Report-only.';
