-- Invoices & financial document viewing (forward-only, local only).
-- Canonical table remains public.portal_invoices — no second invoice model.
-- No Mollie / checkout / payment-provider coupling.
-- Manual payment registration only (not provider processing).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  ALTER TYPE public.portal_invoice_status ADD VALUE IF NOT EXISTS 'IN_REVIEW';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.portal_invoice_status ADD VALUE IF NOT EXISTS 'READY';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.portal_invoice_status ADD VALUE IF NOT EXISTS 'ISSUED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.portal_invoice_status ADD VALUE IF NOT EXISTS 'PARTIALLY_PAID';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.portal_invoice_status ADD VALUE IF NOT EXISTS 'ARCHIVED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.portal_invoice_type AS ENUM (
    'INVOICE', 'CREDIT_NOTE', 'PROFORMA'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.portal_invoice_item_type AS ENUM (
    'SERVICE', 'PRODUCT', 'ADDON', 'DISCOUNT', 'CUSTOM', 'CREDIT'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.portal_invoice_payment_method AS ENUM (
    'BANK_TRANSFER', 'CASH', 'CARD_EXTERNAL', 'ACCOUNTING_IMPORT', 'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE SEQUENCE IF NOT EXISTS public.portal_invoice_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.portal_credit_note_number_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_portal_invoice_number(p_type public.portal_invoice_type DEFAULT 'INVOICE')
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE n bigint;
BEGIN
  IF p_type = 'CREDIT_NOTE' THEN
    n := nextval('public.portal_credit_note_number_seq');
    RETURN 'CN-' || to_char(NOW() AT TIME ZONE 'UTC', 'YYYY') || '-' || lpad(n::text, 5, '0');
  END IF;
  n := nextval('public.portal_invoice_number_seq');
  RETURN 'FAC-' || to_char(NOW() AT TIME ZONE 'UTC', 'YYYY') || '-' || lpad(n::text, 5, '0');
END;
$$;
REVOKE ALL ON FUNCTION public.generate_portal_invoice_number(public.portal_invoice_type) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_portal_invoice_number(public.portal_invoice_type) TO service_role;

-- ---------------------------------------------------------------------------
-- Extend portal_invoices
-- ---------------------------------------------------------------------------
ALTER TABLE public.portal_invoices
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.portal_projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES public.portal_quotes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS accepted_quote_version_id UUID REFERENCES public.portal_quote_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS credits_invoice_id UUID REFERENCES public.portal_invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invoice_type public.portal_invoice_type NOT NULL DEFAULT 'INVOICE',
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS discount_cents INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_paid_cents INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_due_cents INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS credited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS external_accounting_reference TEXT,
  ADD COLUMN IF NOT EXISTS external_payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS payment_instruction TEXT,
  ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES public.portal_files(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS current_version_number INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS issued_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status_updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;

-- Backfill amount_due from total where zero
UPDATE public.portal_invoices
SET amount_due_cents = GREATEST(total_cents - amount_paid_cents, 0)
WHERE amount_due_cents = 0 AND total_cents > 0 AND status NOT IN ('PAID', 'CANCELED', 'CREDITED');

CREATE INDEX IF NOT EXISTS idx_portal_invoices_org_status
  ON public.portal_invoices(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_portal_invoices_project
  ON public.portal_invoices(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_portal_invoices_quote
  ON public.portal_invoices(quote_id) WHERE quote_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_portal_invoices_due
  ON public.portal_invoices(due_date) WHERE due_date IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Line items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.portal_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.portal_invoices(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  item_type public.portal_invoice_item_type NOT NULL DEFAULT 'CUSTOM',
  title TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC(12, 3) NOT NULL DEFAULT 1 CHECK (quantity <> 0),
  quantity_scale INT NOT NULL DEFAULT 1000 CHECK (quantity_scale > 0),
  unit_label TEXT NOT NULL DEFAULT 'stuk',
  unit_price_cents INT NOT NULL DEFAULT 0,
  discount_cents INT NOT NULL DEFAULT 0,
  tax_rate_basis_points INT NOT NULL DEFAULT 2100 CHECK (tax_rate_basis_points >= 0 AND tax_rate_basis_points <= 10000),
  subtotal_cents INT NOT NULL DEFAULT 0,
  tax_cents INT NOT NULL DEFAULT 0,
  total_cents INT NOT NULL DEFAULT 0,
  source_quote_item_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_portal_invoice_items_invoice
  ON public.portal_invoice_items(invoice_id, sort_order);

-- ---------------------------------------------------------------------------
-- Versions (immutable snapshots)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.portal_invoice_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.portal_invoices(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  status public.portal_invoice_status NOT NULL,
  snapshot JSONB NOT NULL,
  snapshot_checksum TEXT NOT NULL,
  document_id UUID REFERENCES public.portal_files(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (invoice_id, version_number)
);

-- ---------------------------------------------------------------------------
-- Manual payment registration (NOT provider payments)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.portal_invoice_payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.portal_invoices(id) ON DELETE CASCADE,
  amount_cents INT NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'EUR',
  payment_date DATE NOT NULL,
  payment_method public.portal_invoice_payment_method NOT NULL DEFAULT 'BANK_TRANSFER',
  external_reference TEXT,
  internal_note TEXT,
  recorded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reversed_at TIMESTAMPTZ,
  reversed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  idempotency_key TEXT,
  UNIQUE (invoice_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_portal_invoice_payments_invoice
  ON public.portal_invoice_payment_records(invoice_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.portal_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_invoice_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_invoice_payment_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS portal_invoices_member_select ON public.portal_invoices;
CREATE POLICY portal_invoices_member_select ON public.portal_invoices
  FOR SELECT TO authenticated
  USING (
    (
      customer_visible
      AND status IN (
        'ISSUED','OPEN','PARTIALLY_PAID','PAID','OVERDUE','CANCELED','CREDITED'
      )
      AND public.is_org_member(organization_id)
    )
    OR public.is_staff_admin()
  );

DROP POLICY IF EXISTS portal_invoice_items_member_select ON public.portal_invoice_items;
CREATE POLICY portal_invoice_items_member_select ON public.portal_invoice_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.portal_invoices inv
      WHERE inv.id = invoice_id
        AND (
          (
            inv.customer_visible
            AND inv.status IN (
              'ISSUED','OPEN','PARTIALLY_PAID','PAID','OVERDUE','CANCELED','CREDITED'
            )
            AND public.is_org_member(inv.organization_id)
          )
          OR public.is_staff_admin()
        )
    )
  );

DROP POLICY IF EXISTS portal_invoice_versions_member_select ON public.portal_invoice_versions;
CREATE POLICY portal_invoice_versions_member_select ON public.portal_invoice_versions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.portal_invoices inv
      WHERE inv.id = invoice_id
        AND (
          (
            inv.customer_visible
            AND inv.status IN (
              'ISSUED','OPEN','PARTIALLY_PAID','PAID','OVERDUE','CANCELED','CREDITED'
            )
            AND public.is_org_member(inv.organization_id)
          )
          OR public.is_staff_admin()
        )
    )
  );

-- Payment records: staff only via RLS (customers never see internal notes via this table directly)
DROP POLICY IF EXISTS portal_invoice_payments_staff_select ON public.portal_invoice_payment_records;
CREATE POLICY portal_invoice_payments_staff_select ON public.portal_invoice_payment_records
  FOR SELECT TO authenticated
  USING (public.is_staff_admin());

-- Anon deny (restrictive)
DROP POLICY IF EXISTS portal_invoices_anon_deny ON public.portal_invoices;
CREATE POLICY portal_invoices_anon_deny ON public.portal_invoices
  AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS portal_invoice_items_anon_deny ON public.portal_invoice_items;
CREATE POLICY portal_invoice_items_anon_deny ON public.portal_invoice_items
  AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS portal_invoice_versions_anon_deny ON public.portal_invoice_versions;
CREATE POLICY portal_invoice_versions_anon_deny ON public.portal_invoice_versions
  AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS portal_invoice_payments_anon_deny ON public.portal_invoice_payment_records;
CREATE POLICY portal_invoice_payments_anon_deny ON public.portal_invoice_payment_records
  AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- Status helpers (fail-closed)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.invoice_is_operationally_overdue(
  p_status public.portal_invoice_status,
  p_due_date DATE,
  p_amount_due INT
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT
    p_amount_due > 0
    AND p_due_date IS NOT NULL
    AND p_due_date < (NOW() AT TIME ZONE 'UTC')::date
    AND p_status NOT IN ('PAID','CANCELED','CREDITED','ARCHIVED','DRAFT','IN_REVIEW','READY');
$$;
REVOKE ALL ON FUNCTION public.invoice_is_operationally_overdue(public.portal_invoice_status, DATE, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invoice_is_operationally_overdue(public.portal_invoice_status, DATE, INT) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Issue RPC (READY-only → OPEN)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.issue_portal_invoice(
  p_invoice_id UUID,
  p_expected_version INT
)
RETURNS TABLE (ok boolean, detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_inv public.portal_invoices%ROWTYPE;
  v_version_number INT;
  v_checksum TEXT;
  v_snapshot JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT FALSE, 'NOT_AUTHENTICATED';
    RETURN;
  END IF;

  IF NOT public.is_staff_admin() THEN
    RETURN QUERY SELECT FALSE, 'FORBIDDEN';
    RETURN;
  END IF;

  SELECT * INTO v_inv FROM public.portal_invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'NOT_FOUND';
    RETURN;
  END IF;

  IF v_inv.version IS DISTINCT FROM p_expected_version THEN
    RETURN QUERY SELECT FALSE, 'VERSION_CONFLICT';
    RETURN;
  END IF;

  -- Idempotent re-issue
  IF v_inv.status IN ('ISSUED','OPEN','PARTIALLY_PAID','PAID','OVERDUE') AND v_inv.current_version_number > 0 THEN
    RETURN QUERY SELECT TRUE, 'ALREADY_ISSUED';
    RETURN;
  END IF;

  IF v_inv.status IS DISTINCT FROM 'READY' THEN
    RETURN QUERY SELECT FALSE, 'NOT_READY';
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.portal_invoice_items WHERE invoice_id = p_invoice_id) THEN
    RETURN QUERY SELECT FALSE, 'NO_ITEMS';
    RETURN;
  END IF;

  IF v_inv.total_cents < 0 AND v_inv.invoice_type <> 'CREDIT_NOTE' THEN
    RETURN QUERY SELECT FALSE, 'NEGATIVE_TOTAL';
    RETURN;
  END IF;

  v_version_number := COALESCE(v_inv.current_version_number, 0) + 1;
  v_snapshot := jsonb_build_object(
    'invoice_number', v_inv.invoice_number,
    'invoice_type', v_inv.invoice_type,
    'title', v_inv.title,
    'organization_id', v_inv.organization_id,
    'project_id', v_inv.project_id,
    'quote_id', v_inv.quote_id,
    'currency', v_inv.currency,
    'subtotal_cents', v_inv.subtotal_cents,
    'discount_cents', v_inv.discount_cents,
    'vat_cents', v_inv.vat_cents,
    'total_cents', v_inv.total_cents,
    'amount_due_cents', GREATEST(v_inv.total_cents - COALESCE(v_inv.amount_paid_cents, 0), 0),
    'issue_date', COALESCE(v_inv.issue_date, (NOW() AT TIME ZONE 'UTC')::date),
    'due_date', v_inv.due_date,
    'payment_instruction', v_inv.payment_instruction,
    'items', COALESCE((
      SELECT jsonb_agg(to_jsonb(i) ORDER BY i.sort_order)
      FROM public.portal_invoice_items i WHERE i.invoice_id = p_invoice_id
    ), '[]'::jsonb)
  );
  v_checksum := encode(digest(v_snapshot::text, 'sha256'), 'hex');

  INSERT INTO public.portal_invoice_versions (
    invoice_id, version_number, status, snapshot, snapshot_checksum, created_by
  ) VALUES (
    p_invoice_id, v_version_number, 'OPEN', v_snapshot, v_checksum, v_uid
  );

  UPDATE public.portal_invoices SET
    status = 'OPEN',
    customer_visible = TRUE,
    issued_at = NOW(),
    issued_by = v_uid,
    issue_date = COALESCE(issue_date, (NOW() AT TIME ZONE 'UTC')::date),
    amount_due_cents = GREATEST(total_cents - amount_paid_cents, 0),
    current_version_number = v_version_number,
    version = version + 1,
    status_updated_by = v_uid,
    updated_at = NOW()
  WHERE id = p_invoice_id
    AND version = p_expected_version;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'VERSION_CONFLICT';
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, 'ISSUED';
END;
$$;
REVOKE ALL ON FUNCTION public.issue_portal_invoice(UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.issue_portal_invoice(UUID, INT) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Record manual payment (NOT Mollie)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_portal_invoice_payment(
  p_invoice_id UUID,
  p_expected_version INT,
  p_amount_cents INT,
  p_currency TEXT,
  p_payment_date DATE,
  p_payment_method public.portal_invoice_payment_method,
  p_external_reference TEXT DEFAULT NULL,
  p_internal_note TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS TABLE (ok boolean, detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_inv public.portal_invoices%ROWTYPE;
  v_existing UUID;
  v_paid INT;
  v_due INT;
  v_status public.portal_invoice_status;
BEGIN
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT FALSE, 'NOT_AUTHENTICATED';
    RETURN;
  END IF;
  IF NOT public.is_staff_admin() THEN
    RETURN QUERY SELECT FALSE, 'FORBIDDEN';
    RETURN;
  END IF;
  IF p_amount_cents IS NULL OR p_amount_cents <= 0 THEN
    RETURN QUERY SELECT FALSE, 'INVALID_AMOUNT';
    RETURN;
  END IF;

  SELECT * INTO v_inv FROM public.portal_invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'NOT_FOUND';
    RETURN;
  END IF;
  IF v_inv.version IS DISTINCT FROM p_expected_version THEN
    RETURN QUERY SELECT FALSE, 'VERSION_CONFLICT';
    RETURN;
  END IF;
  IF v_inv.status NOT IN ('OPEN','PARTIALLY_PAID','OVERDUE','ISSUED') THEN
    RETURN QUERY SELECT FALSE, 'INVALID_STATUS';
    RETURN;
  END IF;
  IF upper(COALESCE(p_currency, v_inv.currency)) <> upper(v_inv.currency) THEN
    RETURN QUERY SELECT FALSE, 'CURRENCY_MISMATCH';
    RETURN;
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing
    FROM public.portal_invoice_payment_records
    WHERE invoice_id = p_invoice_id AND idempotency_key = p_idempotency_key
    LIMIT 1;
    IF v_existing IS NOT NULL THEN
      RETURN QUERY SELECT TRUE, 'ALREADY_RECORDED';
      RETURN;
    END IF;
  END IF;

  IF v_inv.amount_paid_cents + p_amount_cents > v_inv.total_cents THEN
    RETURN QUERY SELECT FALSE, 'OVERPAYMENT';
    RETURN;
  END IF;

  INSERT INTO public.portal_invoice_payment_records (
    invoice_id, amount_cents, currency, payment_date, payment_method,
    external_reference, internal_note, recorded_by, idempotency_key
  ) VALUES (
    p_invoice_id, p_amount_cents, v_inv.currency, COALESCE(p_payment_date, (NOW() AT TIME ZONE 'UTC')::date),
    COALESCE(p_payment_method, 'BANK_TRANSFER'),
    p_external_reference, p_internal_note, v_uid, p_idempotency_key
  );

  v_paid := v_inv.amount_paid_cents + p_amount_cents;
  v_due := GREATEST(v_inv.total_cents - v_paid, 0);
  IF v_due = 0 THEN
    v_status := 'PAID';
  ELSIF v_paid > 0 THEN
    v_status := 'PARTIALLY_PAID';
  ELSE
    v_status := v_inv.status;
  END IF;

  UPDATE public.portal_invoices SET
    amount_paid_cents = v_paid,
    amount_due_cents = v_due,
    status = v_status,
    paid_at = CASE WHEN v_due = 0 THEN NOW() ELSE paid_at END,
    version = version + 1,
    status_updated_by = v_uid,
    updated_at = NOW()
  WHERE id = p_invoice_id AND version = p_expected_version;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'VERSION_CONFLICT';
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, CASE WHEN v_due = 0 THEN 'PAID' ELSE 'PARTIAL' END;
END;
$$;
REVOKE ALL ON FUNCTION public.record_portal_invoice_payment(UUID, INT, INT, TEXT, DATE, public.portal_invoice_payment_method, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_portal_invoice_payment(UUID, INT, INT, TEXT, DATE, public.portal_invoice_payment_method, TEXT, TEXT, TEXT) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Verification RPC
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
  RETURN QUERY SELECT 'fn:generate_portal_invoice_number'::text,
    to_regprocedure('public.generate_portal_invoice_number(public.portal_invoice_type)') IS NOT NULL, 'numbering';
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
        AND column_name IN ('mollie_payment_id','checkout_session_id','payment_provider_id')
    ), 'no provider payment columns';
END;
$$;
REVOKE ALL ON FUNCTION public.verify_invoices_financial_contracts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_invoices_financial_contracts() TO service_role;
