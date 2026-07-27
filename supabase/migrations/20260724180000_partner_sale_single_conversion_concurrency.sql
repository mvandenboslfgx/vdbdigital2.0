-- =============================================================================
-- RC2 P0-1: single canonical partner_sale per partner_lead
--
-- Root cause: confirm_partner_sale locked the lead but allowed multiple sales
-- with distinct idempotency keys (no UNIQUE on partner_lead_id).
--
-- Invariant: a partner lead may attach to at most one partner_sale.
-- NULL partner_lead_id remains allowed for leadless sales (Postgres UNIQUE).
-- Outside production exact-17 baseline ending at 20260719170000.
-- =============================================================================

DO $$
DECLARE
  v_dup int;
BEGIN
  SELECT COUNT(*) INTO v_dup FROM (
    SELECT partner_lead_id
    FROM public.partner_sales
    WHERE partner_lead_id IS NOT NULL
    GROUP BY partner_lead_id
    HAVING COUNT(*) > 1
  ) d;
  IF v_dup > 0 THEN
    RAISE EXCEPTION
      'PRECONDITION_FAILED: % duplicate partner_lead_id groups in partner_sales — resolve before applying single-conversion constraint',
      v_dup;
  END IF;
END $$;

ALTER TABLE public.partner_sales
  DROP CONSTRAINT IF EXISTS partner_sales_one_per_lead;

ALTER TABLE public.partner_sales
  ADD CONSTRAINT partner_sales_one_per_lead UNIQUE (partner_lead_id);

COMMENT ON CONSTRAINT partner_sales_one_per_lead ON public.partner_sales IS
  'RC2 concurrency: at most one canonical sale per partner lead (NULL lead_id allowed for leadless sales)';

-- Hardened confirm path: lock lead, enforce one sale, idempotent same-key retry,
-- deterministic conflict for distinct keys after conversion.
CREATE OR REPLACE FUNCTION public.confirm_partner_sale(
  p_lead_id uuid,
  p_gross_amount_cents bigint,
  p_idempotency_key text,
  p_rate_bps int DEFAULT 1000,
  p_currency text DEFAULT 'EUR',
  p_order_id uuid DEFAULT NULL,
  p_payment_id text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead public.partner_leads%ROWTYPE;
  v_sale_id uuid;
  v_existing public.partner_sales%ROWTYPE;
  v_comm_id uuid;
  v_amount bigint;
BEGIN
  IF NOT public.is_staff_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p_gross_amount_cents < 0 THEN RAISE EXCEPTION 'VALIDATION_FAILED'; END IF;
  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  SELECT * INTO v_lead
  FROM public.partner_leads
  WHERE id = p_lead_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  -- Canonical sale for this lead (constraint-backed)
  SELECT * INTO v_existing
  FROM public.partner_sales
  WHERE partner_lead_id = p_lead_id;

  IF FOUND THEN
    IF v_existing.idempotency_key = p_idempotency_key THEN
      -- Idempotent retry of the same business operation
      RETURN v_existing.id;
    END IF;
    RAISE EXCEPTION 'PARTNER_LEAD_ALREADY_CONVERTED';
  END IF;

  -- Soft idempotency by key (may reference another lead — treat as conflict if lead differs)
  SELECT * INTO v_existing
  FROM public.partner_sales
  WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_existing.partner_lead_id IS DISTINCT FROM p_lead_id THEN
      RAISE EXCEPTION 'CONFLICT';
    END IF;
    RETURN v_existing.id;
  END IF;

  v_amount := (p_gross_amount_cents * p_rate_bps) / 10000;

  BEGIN
    INSERT INTO public.partner_sales (
      partner_id, partner_lead_id, order_id, payment_id, status,
      gross_amount_cents, currency, idempotency_key, confirmed_at, settled_at
    ) VALUES (
      v_lead.partner_id, p_lead_id, p_order_id, p_payment_id, 'SETTLED',
      p_gross_amount_cents, p_currency, p_idempotency_key, NOW(), NOW()
    )
    RETURNING id INTO v_sale_id;
  EXCEPTION WHEN unique_violation THEN
    -- Race: another session converted the lead or claimed the idempotency key
    SELECT * INTO v_existing
    FROM public.partner_sales
    WHERE partner_lead_id = p_lead_id
       OR idempotency_key = p_idempotency_key
    ORDER BY CASE WHEN partner_lead_id = p_lead_id THEN 0 ELSE 1 END
    LIMIT 1;
    IF NOT FOUND THEN
      RAISE;
    END IF;
    IF v_existing.idempotency_key = p_idempotency_key
       AND v_existing.partner_lead_id IS NOT DISTINCT FROM p_lead_id THEN
      RETURN v_existing.id;
    END IF;
    RAISE EXCEPTION 'PARTNER_LEAD_ALREADY_CONVERTED';
  END;

  UPDATE public.partner_leads
  SET status = 'CONVERTED', converted_sale_id = v_sale_id, updated_at = NOW()
  WHERE id = p_lead_id;

  BEGIN
    INSERT INTO public.partner_commissions (
      partner_id, partner_sale_id, status, basis_amount_cents, rate_bps, amount_cents,
      currency, calculation_rule_version, idempotency_key, approved_at
    ) VALUES (
      v_lead.partner_id, v_sale_id, 'APPROVED', p_gross_amount_cents, p_rate_bps, v_amount,
      p_currency, 'v1_flat_bps', p_idempotency_key || ':commission', NOW()
    )
    ON CONFLICT (idempotency_key) DO UPDATE SET updated_at = NOW()
    RETURNING id INTO v_comm_id;
  EXCEPTION WHEN unique_violation THEN
    -- one_per_sale race — reuse existing commission for this sale
    SELECT id INTO v_comm_id
    FROM public.partner_commissions
    WHERE partner_sale_id = v_sale_id;
    IF v_comm_id IS NULL THEN
      RAISE;
    END IF;
  END;

  PERFORM public._partner_post_ledger(
    'COMMISSION_ACCRUAL',
    'partner_commission',
    v_comm_id,
    p_currency,
    p_idempotency_key || ':ledger',
    auth.uid(),
    jsonb_build_array(
      jsonb_build_object('account', 'COMMISSION_LIABILITY', 'partner_id', v_lead.partner_id, 'credit_cents', v_amount, 'debit_cents', 0),
      jsonb_build_object('account', 'REVENUE_CLEARING', 'partner_id', NULL, 'debit_cents', v_amount, 'credit_cents', 0)
    )
  );

  RETURN v_sale_id;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_partner_sale(uuid,bigint,text,int,text,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_partner_sale(uuid,bigint,text,int,text,uuid,text) TO authenticated;

-- review_partner_lead remains status-only (no sale creation). Conversion boundary
-- is exclusively confirm_partner_sale above.
