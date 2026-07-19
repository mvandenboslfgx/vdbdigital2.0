-- Forward-only: manual payment reversal integrity for portal_invoice_payment_records.
-- Does NOT modify 20260719160000. No Mollie / provider refund / checkout.
-- Local apply only.

-- ---------------------------------------------------------------------------
-- Columns + constraints (immutable history; no DELETE)
-- ---------------------------------------------------------------------------
ALTER TABLE public.portal_invoice_payment_records
  ADD COLUMN IF NOT EXISTS reversal_reason TEXT,
  ADD COLUMN IF NOT EXISTS reversal_idempotency_key TEXT;

COMMENT ON COLUMN public.portal_invoice_payment_records.reversal_reason IS
  'Internal staff reason for administrative reversal. Never expose to customers.';
COMMENT ON COLUMN public.portal_invoice_payment_records.reversal_idempotency_key IS
  'Unique key for idempotent administrative reversal. Not a provider refund id.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_portal_invoice_payment_reversal_idempotency
  ON public.portal_invoice_payment_records (reversal_idempotency_key)
  WHERE reversal_idempotency_key IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Permission helper: OWNER / ADMIN only (not CONTENT / SUPPORT)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_reverse_invoice_payment()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_roles ar
    JOIN public.profiles p ON p.id = ar.user_id
    WHERE ar.user_id = auth.uid()
      AND ar.role IN ('OWNER', 'ADMIN')
      AND p.is_active IS DISTINCT FROM FALSE
  );
$$;

REVOKE ALL ON FUNCTION public.can_reverse_invoice_payment() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_reverse_invoice_payment() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Immutable payment-record history (no delete; freeze original money fields)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_portal_invoice_payment_record()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'PAYMENT_RECORD_DELETE_FORBIDDEN'
      USING ERRCODE = 'P0001';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.amount_cents IS DISTINCT FROM OLD.amount_cents
      OR NEW.currency IS DISTINCT FROM OLD.currency
      OR NEW.payment_date IS DISTINCT FROM OLD.payment_date
      OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
      OR NEW.recorded_by IS DISTINCT FROM OLD.recorded_by
      OR NEW.invoice_id IS DISTINCT FROM OLD.invoice_id
      OR NEW.created_at IS DISTINCT FROM OLD.created_at
      OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
    THEN
      RAISE EXCEPTION 'PAYMENT_RECORD_IMMUTABLE_FIELDS'
        USING ERRCODE = 'P0001';
    END IF;

    IF OLD.reversed_at IS NOT NULL THEN
      IF NEW.reversed_at IS DISTINCT FROM OLD.reversed_at
        OR NEW.reversed_by IS DISTINCT FROM OLD.reversed_by
        OR NEW.reversal_reason IS DISTINCT FROM OLD.reversal_reason
        OR NEW.reversal_idempotency_key IS DISTINCT FROM OLD.reversal_idempotency_key
      THEN
        RAISE EXCEPTION 'PAYMENT_ALREADY_REVERSED'
          USING ERRCODE = 'P0001';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_portal_invoice_payment_record
  ON public.portal_invoice_payment_records;
CREATE TRIGGER trg_protect_portal_invoice_payment_record
  BEFORE UPDATE OR DELETE ON public.portal_invoice_payment_records
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_portal_invoice_payment_record();

-- ---------------------------------------------------------------------------
-- Server-side status recomputation (single source of truth for payment-driven)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recompute_portal_invoice_status_from_payments(
  p_current_status public.portal_invoice_status,
  p_total_cents INT,
  p_amount_paid_cents INT,
  p_due_date DATE,
  p_now TIMESTAMPTZ DEFAULT NOW()
)
RETURNS public.portal_invoice_status
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_due INT;
  v_today DATE := (p_now AT TIME ZONE 'UTC')::date;
BEGIN
  -- Terminal / non-operational statuses must never silently reopen.
  IF p_current_status IN ('CANCELED', 'CREDITED', 'ARCHIVED') THEN
    RAISE EXCEPTION 'REVERSAL_STATUS_LOCKED:%', p_current_status
      USING ERRCODE = 'P0001';
  END IF;

  IF p_current_status IN ('DRAFT', 'IN_REVIEW', 'READY') THEN
    RAISE EXCEPTION 'REVERSAL_STATUS_INVALID:%', p_current_status
      USING ERRCODE = 'P0001';
  END IF;

  v_due := GREATEST(COALESCE(p_total_cents, 0) - GREATEST(COALESCE(p_amount_paid_cents, 0), 0), 0);

  IF v_due = 0 THEN
    RETURN 'PAID';
  END IF;

  IF GREATEST(COALESCE(p_amount_paid_cents, 0), 0) > 0 THEN
    RETURN 'PARTIALLY_PAID';
  END IF;

  IF p_due_date IS NOT NULL AND p_due_date < v_today THEN
    RETURN 'OVERDUE';
  END IF;

  -- ISSUED with zero active payments becomes OPEN for operational clarity.
  RETURN 'OPEN';
END;
$$;

REVOKE ALL ON FUNCTION public.recompute_portal_invoice_status_from_payments(
  public.portal_invoice_status, INT, INT, DATE, TIMESTAMPTZ
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recompute_portal_invoice_status_from_payments(
  public.portal_invoice_status, INT, INT, DATE, TIMESTAMPTZ
) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Transactional reverse RPC
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reverse_portal_invoice_payment(
  p_invoice_id UUID,
  p_payment_record_id UUID,
  p_expected_version INT,
  p_reversal_reason TEXT,
  p_reversal_idempotency_key TEXT DEFAULT NULL,
  p_correlation_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  ok boolean,
  detail text,
  invoice_status text,
  amount_paid_cents int,
  amount_due_cents int,
  payment_record_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_inv public.portal_invoices%ROWTYPE;
  v_pay public.portal_invoice_payment_records%ROWTYPE;
  v_existing public.portal_invoice_payment_records%ROWTYPE;
  v_reason TEXT := btrim(COALESCE(p_reversal_reason, ''));
  v_key TEXT := NULLIF(btrim(COALESCE(p_reversal_idempotency_key, '')), '');
  v_paid INT;
  v_due INT;
  v_old_paid INT;
  v_old_due INT;
  v_old_status public.portal_invoice_status;
  v_new_status public.portal_invoice_status;
  v_corr TEXT := NULLIF(btrim(COALESCE(p_correlation_id, '')), '');
BEGIN
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT FALSE, 'NOT_AUTHENTICATED', NULL::text, NULL::int, NULL::int, NULL::uuid;
    RETURN;
  END IF;

  IF NOT public.can_reverse_invoice_payment() THEN
    RETURN QUERY SELECT FALSE, 'FORBIDDEN', NULL::text, NULL::int, NULL::int, NULL::uuid;
    RETURN;
  END IF;

  IF char_length(v_reason) < 3 OR char_length(v_reason) > 500 THEN
    RETURN QUERY SELECT FALSE, 'REASON_REQUIRED', NULL::text, NULL::int, NULL::int, NULL::uuid;
    RETURN;
  END IF;

  -- Idempotency: same key → same safe result; other payment → reject.
  IF v_key IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM public.portal_invoice_payment_records
    WHERE reversal_idempotency_key = v_key
    LIMIT 1;

    IF FOUND THEN
      IF v_existing.id IS DISTINCT FROM p_payment_record_id THEN
        RETURN QUERY SELECT FALSE, 'IDEMPOTENCY_KEY_REUSED', NULL::text, NULL::int, NULL::int, NULL::uuid;
        RETURN;
      END IF;
      IF v_existing.invoice_id IS DISTINCT FROM p_invoice_id THEN
        RETURN QUERY SELECT FALSE, 'PAYMENT_INVOICE_MISMATCH', NULL::text, NULL::int, NULL::int, NULL::uuid;
        RETURN;
      END IF;

      SELECT * INTO v_inv FROM public.portal_invoices WHERE id = p_invoice_id;
      RETURN QUERY SELECT
        TRUE,
        'ALREADY_REVERSED'::text,
        v_inv.status::text,
        v_inv.amount_paid_cents,
        v_inv.amount_due_cents,
        v_existing.id;
      RETURN;
    END IF;
  END IF;

  -- Lock invoice first, then payment (consistent lock order).
  SELECT * INTO v_inv
  FROM public.portal_invoices
  WHERE id = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'INVOICE_NOT_FOUND', NULL::text, NULL::int, NULL::int, NULL::uuid;
    RETURN;
  END IF;

  IF v_inv.version IS DISTINCT FROM p_expected_version THEN
    RETURN QUERY SELECT FALSE, 'VERSION_CONFLICT', NULL::text, NULL::int, NULL::int, NULL::uuid;
    RETURN;
  END IF;

  IF v_inv.status IN ('CANCELED', 'CREDITED', 'ARCHIVED') THEN
    RETURN QUERY SELECT FALSE, 'STATUS_LOCKED:' || v_inv.status::text, NULL::text, NULL::int, NULL::int, NULL::uuid;
    RETURN;
  END IF;

  IF v_inv.invoice_type = 'CREDIT_NOTE' THEN
    RETURN QUERY SELECT FALSE, 'CREDIT_NOTE_LOCKED', NULL::text, NULL::int, NULL::int, NULL::uuid;
    RETURN;
  END IF;

  SELECT * INTO v_pay
  FROM public.portal_invoice_payment_records
  WHERE id = p_payment_record_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'PAYMENT_NOT_FOUND', NULL::text, NULL::int, NULL::int, NULL::uuid;
    RETURN;
  END IF;

  IF v_pay.invoice_id IS DISTINCT FROM p_invoice_id THEN
    RETURN QUERY SELECT FALSE, 'PAYMENT_INVOICE_MISMATCH', NULL::text, NULL::int, NULL::int, NULL::uuid;
    RETURN;
  END IF;

  IF v_pay.reversed_at IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, 'ALREADY_REVERSED', v_inv.status::text, v_inv.amount_paid_cents, v_inv.amount_due_cents, v_pay.id;
    RETURN;
  END IF;

  IF upper(v_pay.currency) IS DISTINCT FROM upper(v_inv.currency) THEN
    RETURN QUERY SELECT FALSE, 'CURRENCY_MISMATCH', NULL::text, NULL::int, NULL::int, NULL::uuid;
    RETURN;
  END IF;

  v_old_paid := COALESCE(v_inv.amount_paid_cents, 0);
  v_old_due := COALESCE(v_inv.amount_due_cents, 0);
  v_old_status := v_inv.status;

  UPDATE public.portal_invoice_payment_records SET
    reversed_at = NOW(),
    reversed_by = v_uid,
    reversal_reason = v_reason,
    reversal_idempotency_key = v_key
  WHERE id = p_payment_record_id
    AND reversed_at IS NULL;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'ALREADY_REVERSED', v_inv.status::text, v_inv.amount_paid_cents, v_inv.amount_due_cents, p_payment_record_id;
    RETURN;
  END IF;

  SELECT COALESCE(SUM(amount_cents), 0)::int INTO v_paid
  FROM public.portal_invoice_payment_records
  WHERE invoice_id = p_invoice_id
    AND reversed_at IS NULL;

  v_due := GREATEST(v_inv.total_cents - v_paid, 0);

  BEGIN
    v_new_status := public.recompute_portal_invoice_status_from_payments(
      v_inv.status,
      v_inv.total_cents,
      v_paid,
      v_inv.due_date,
      NOW()
    );
  EXCEPTION
    WHEN others THEN
      RETURN QUERY SELECT FALSE, SQLERRM, NULL::text, NULL::int, NULL::int, NULL::uuid;
      RETURN;
  END;

  UPDATE public.portal_invoices SET
    amount_paid_cents = v_paid,
    amount_due_cents = v_due,
    status = v_new_status,
    paid_at = CASE WHEN v_due = 0 THEN paid_at ELSE NULL END,
    version = version + 1,
    status_updated_by = v_uid,
    updated_at = NOW()
  WHERE id = p_invoice_id
    AND version = p_expected_version;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'VERSION_CONFLICT', NULL::text, NULL::int, NULL::int, NULL::uuid;
    RETURN;
  END IF;

  INSERT INTO public.audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    metadata
  ) VALUES (
    v_uid,
    'admin.invoice_payment_reversed',
    'portal_invoice_payment_records',
    p_payment_record_id::text,
    jsonb_build_object(
      'invoiceId', p_invoice_id,
      'paymentRecordId', p_payment_record_id,
      'amountCents', v_pay.amount_cents,
      'currency', v_pay.currency,
      'reasonCategory', 'ADMINISTRATIVE_CORRECTION',
      'reasonLength', char_length(v_reason),
      'oldStatus', v_old_status,
      'newStatus', v_new_status,
      'oldAmountPaidCents', v_old_paid,
      'newAmountPaidCents', v_paid,
      'oldAmountDueCents', v_old_due,
      'newAmountDueCents', v_due,
      'correlationId', v_corr,
      'providerRefund', false,
      'mollieCall', false
    )
  );

  RETURN QUERY SELECT
    TRUE,
    'REVERSED'::text,
    v_new_status::text,
    v_paid,
    v_due,
    p_payment_record_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reverse_portal_invoice_payment(
  UUID, UUID, INT, TEXT, TEXT, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reverse_portal_invoice_payment(
  UUID, UUID, INT, TEXT, TEXT, TEXT
) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Extend verification contracts (replace function body)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_invoices_financial_contracts()
RETURNS TABLE (check_name text, ok boolean, detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT 'table:portal_invoices'::text,
    to_regclass('public.portal_invoices') IS NOT NULL, 'portal_invoices';
  RETURN QUERY SELECT 'table:portal_invoice_items'::text,
    to_regclass('public.portal_invoice_items') IS NOT NULL, 'items';
  RETURN QUERY SELECT 'table:portal_invoice_versions'::text,
    to_regclass('public.portal_invoice_versions') IS NOT NULL, 'versions';
  RETURN QUERY SELECT 'table:portal_invoice_payment_records'::text,
    to_regclass('public.portal_invoice_payment_records') IS NOT NULL, 'payment_records';
  RETURN QUERY SELECT 'fn:issue_portal_invoice'::text,
    to_regprocedure('public.issue_portal_invoice(uuid,integer)') IS NOT NULL, 'issue RPC';
  RETURN QUERY SELECT 'fn:record_portal_invoice_payment'::text,
    to_regprocedure('public.record_portal_invoice_payment(uuid,integer,integer,text,date,public.portal_invoice_payment_method,text,text,text)') IS NOT NULL,
    'record payment RPC';
  RETURN QUERY SELECT 'fn:reverse_portal_invoice_payment'::text,
    to_regprocedure('public.reverse_portal_invoice_payment(uuid,uuid,integer,text,text,text)') IS NOT NULL,
    'reverse payment RPC';
  RETURN QUERY SELECT 'fn:can_reverse_invoice_payment'::text,
    to_regprocedure('public.can_reverse_invoice_payment()') IS NOT NULL,
    'reverse permission helper';
  RETURN QUERY SELECT 'fn:recompute_portal_invoice_status_from_payments'::text,
    to_regprocedure('public.recompute_portal_invoice_status_from_payments(public.portal_invoice_status,integer,integer,date,timestamp with time zone)') IS NOT NULL,
    'status recompute';
  RETURN QUERY SELECT 'fn:generate_portal_invoice_number'::text,
    to_regprocedure('public.generate_portal_invoice_number(public.portal_invoice_type)') IS NOT NULL, 'numbering';

  RETURN QUERY SELECT 'reverse_rpc:security_definer'::text,
    EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'reverse_portal_invoice_payment'
        AND p.prosecdef IS TRUE
    ), 'SECURITY DEFINER';
  RETURN QUERY SELECT 'reverse_rpc:search_path'::text,
    EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'reverse_portal_invoice_payment'
        AND p.proconfig IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM unnest(p.proconfig) cfg
          WHERE cfg ILIKE 'search_path=public%'
        )
    ), 'search_path=public';
  RETURN QUERY SELECT 'reverse_rpc:execute_grants_minimal'::text,
    NOT has_function_privilege('anon', 'public.reverse_portal_invoice_payment(uuid,uuid,integer,text,text,text)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.reverse_portal_invoice_payment(uuid,uuid,integer,text,text,text)', 'EXECUTE'),
    'anon denied; authenticated allowed';

  RETURN QUERY SELECT 'col:reversal_reason'::text,
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'portal_invoice_payment_records'
        AND column_name = 'reversal_reason'
    ), 'reversal_reason';
  RETURN QUERY SELECT 'col:reversal_idempotency_key'::text,
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'portal_invoice_payment_records'
        AND column_name = 'reversal_idempotency_key'
    ), 'reversal_idempotency_key';
  RETURN QUERY SELECT 'idx:reversal_idempotency_unique'::text,
    EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'portal_invoice_payment_records'
        AND indexname = 'uq_portal_invoice_payment_reversal_idempotency'
    ), 'unique idempotency';
  RETURN QUERY SELECT 'trg:payment_record_immutable'::text,
    EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = 'trg_protect_portal_invoice_payment_record'
        AND NOT tgisinternal
    ), 'immutable history trigger';

  RETURN QUERY SELECT 'rls:portal_invoices'::text,
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.portal_invoices'::regclass), 'RLS';
  RETURN QUERY SELECT 'rls:portal_invoice_items'::text,
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.portal_invoice_items'::regclass), 'RLS';
  RETURN QUERY SELECT 'rls:portal_invoice_versions'::text,
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.portal_invoice_versions'::regclass), 'RLS';
  RETURN QUERY SELECT 'rls:portal_invoice_payment_records'::text,
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.portal_invoice_payment_records'::regclass), 'RLS';
  RETURN QUERY SELECT 'anon_deny:portal_invoices'::text,
    EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'portal_invoices'
        AND policyname = 'portal_invoices_anon_deny'
    ), 'anon';
  RETURN QUERY SELECT 'col:portal_invoices.amount_due_cents'::text,
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'portal_invoices' AND column_name = 'amount_due_cents'
    ), 'amount_due';
  RETURN QUERY SELECT 'col:portal_invoices.quote_id'::text,
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'portal_invoices' AND column_name = 'quote_id'
    ), 'quote link';
  RETURN QUERY SELECT 'bucket:invoice-documents'::text,
    EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'invoice-documents' AND public = false),
    'private bucket';
  RETURN QUERY SELECT 'no_mollie_coupling'::text,
    NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('portal_invoices','portal_invoice_payment_records')
        AND column_name IN ('mollie_payment_id','checkout_session_id','payment_provider_id','provider_refund_id')
    ), 'no provider payment/refund columns';
  RETURN QUERY SELECT 'no_provider_refund_rpc'::text,
    to_regprocedure('public.refund_mollie_payment(uuid)') IS NULL
    AND to_regprocedure('public.create_provider_refund(uuid)') IS NULL,
    'no provider refund RPC';
END;
$$;

REVOKE ALL ON FUNCTION public.verify_invoices_financial_contracts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_invoices_financial_contracts() TO service_role;
