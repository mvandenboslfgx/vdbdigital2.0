-- STATUS: LOCAL ONLY — additive mobile compatibility for
-- vdb-backend-contract@0.2.0-rc.2 / schemaVersion 2026.07.24.mobile-compat-rc2
-- Does NOT break portal_*, partner_*, ledger, commission, or payout surfaces from rc.1.
-- Does NOT authorize staging or production apply.

-- ---------------------------------------------------------------------------
-- Shared feature_flags (DB) for Mobile + Partner fail-closed keys.
-- Website CHECKOUT_ENABLED env flag remains authoritative for web checkout;
-- DB keys below stay false unless explicitly enabled by owner ops.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feature_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  description text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feature_flags_select_authenticated ON public.feature_flags;
CREATE POLICY feature_flags_select_authenticated
  ON public.feature_flags
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS feature_flags_staff_write ON public.feature_flags;
CREATE POLICY feature_flags_staff_write
  ON public.feature_flags
  FOR ALL
  TO authenticated
  USING (public.is_staff_admin())
  WITH CHECK (public.is_staff_admin());

INSERT INTO public.feature_flags (key, enabled, description)
VALUES
  ('mollie_checkout', false, 'FAIL-CLOSED — Mobile/shared Mollie hosted checkout'),
  ('digital_product_checkout', false, 'FAIL-CLOSED — digital goods / Play gate'),
  ('partner_payouts', false, 'FAIL-CLOSED — partner payout requests (Mobile + Partner clients)'),
  ('push_notifications', false, 'Remote push delivery (needs provider)'),
  ('documents_virus_scan', false, 'Virus scan provider configured'),
  -- Legacy Mobile aliases kept disabled for compatibility reads
  ('payments.mollie_checkout', false, 'LEGACY alias → mollie_checkout'),
  ('payments.digital_goods_checkout', false, 'LEGACY alias → digital_product_checkout'),
  ('partner.payouts', false, 'LEGACY alias → partner_payouts')
ON CONFLICT (key) DO UPDATE
SET
  description = EXCLUDED.description,
  updated_at = timezone('utc', now());

-- Force fail-closed on financial keys after upsert.
UPDATE public.feature_flags
SET enabled = false,
    updated_at = timezone('utc', now())
WHERE key IN (
  'mollie_checkout',
  'digital_product_checkout',
  'partner_payouts',
  'payments.mollie_checkout',
  'payments.digital_goods_checkout',
  'partner.payouts'
);

CREATE OR REPLACE FUNCTION public.feature_flag_enabled(p_keys text[])
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enabled boolean;
BEGIN
  IF to_regclass('public.feature_flags') IS NULL THEN
    RETURN false;
  END IF;
  SELECT COALESCE(bool_or(enabled), false)
    INTO v_enabled
  FROM public.feature_flags
  WHERE key = ANY (p_keys);
  RETURN COALESCE(v_enabled, false);
END;
$$;

REVOKE ALL ON FUNCTION public.feature_flag_enabled(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.feature_flag_enabled(text[]) TO authenticated, service_role;

-- Gate partner payout RPC on shared DB flag (canonical + legacy keys).
-- Keeps rc.1 behaviour when flags are absent/false (fail-closed).
CREATE OR REPLACE FUNCTION public.request_partner_payout(
  p_amount_cents bigint,
  p_idempotency_key text,
  p_currency text DEFAULT 'EUR'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_id uuid;
  v_avail bigint;
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;

  IF NOT public.feature_flag_enabled(ARRAY['partner_payouts', 'partner.payouts']) THEN
    RAISE EXCEPTION 'FEATURE_NOT_CONFIGURED: partner payouts are currently disabled';
  END IF;

  SELECT id INTO v_partner_id FROM public.partner_profiles
  WHERE user_id = auth.uid() AND status = 'ACTIVE' AND payout_eligible;
  IF v_partner_id IS NULL THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  v_avail := public.partner_available_liability_cents(v_partner_id);
  IF p_amount_cents <= 0 OR p_amount_cents > v_avail THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  SELECT id INTO v_id
  FROM public.partner_payout_requests
  WHERE idempotency_key = p_idempotency_key;

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  INSERT INTO public.partner_payout_requests (
    partner_id, requested_amount_cents, available_amount_snapshot_cents,
    currency, status, idempotency_key
  ) VALUES (
    v_partner_id, p_amount_cents, v_avail, p_currency, 'REQUESTED', p_idempotency_key
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_partner_payout(bigint,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_partner_payout(bigint,text,text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Mobile compatibility verifier (additive; does not replace partner verifier)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_mobile_compat_contracts()
RETURNS TABLE (check_name text, ok boolean, detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT 'table:portal_projects'::text,
    to_regclass('public.portal_projects') IS NOT NULL, 'canonical customer projects';
  RETURN QUERY SELECT 'table:portal_quotes'::text,
    to_regclass('public.portal_quotes') IS NOT NULL, 'canonical quotes';
  RETURN QUERY SELECT 'table:portal_invoices'::text,
    to_regclass('public.portal_invoices') IS NOT NULL, 'canonical invoices';
  RETURN QUERY SELECT 'table:portal_files'::text,
    to_regclass('public.portal_files') IS NOT NULL, 'canonical documents';
  RETURN QUERY SELECT 'table:partner_leads'::text,
    to_regclass('public.partner_leads') IS NOT NULL, 'canonical partner leads';
  RETURN QUERY SELECT 'table:partner_commissions'::text,
    to_regclass('public.partner_commissions') IS NOT NULL, 'canonical commissions';
  RETURN QUERY SELECT 'table:partner_payout_requests'::text,
    to_regclass('public.partner_payout_requests') IS NOT NULL, 'canonical payout requests';
  RETURN QUERY SELECT 'table:feature_flags'::text,
    to_regclass('public.feature_flags') IS NOT NULL, 'shared feature flags';
  RETURN QUERY SELECT 'rpc:accept_portal_quote'::text,
    to_regprocedure('public.accept_portal_quote(uuid,integer,uuid[])') IS NOT NULL
      OR EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'accept_portal_quote'
      ), 'quote accept canonical';
  RETURN QUERY SELECT 'rpc:create_partner_lead'::text,
    EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'create_partner_lead'
    ), 'partner lead create canonical';
  RETURN QUERY SELECT 'rpc:request_partner_payout'::text,
    EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'request_partner_payout'
    ), 'partner payout canonical';
  RETURN QUERY SELECT 'flag:mollie_checkout_off'::text,
    EXISTS (
      SELECT 1 FROM public.feature_flags WHERE key = 'mollie_checkout' AND enabled = false
    ), 'fail-closed';
  RETURN QUERY SELECT 'flag:partner_payouts_off'::text,
    EXISTS (
      SELECT 1 FROM public.feature_flags WHERE key = 'partner_payouts' AND enabled = false
    ), 'fail-closed';
  RETURN QUERY SELECT 'no_mobile_parallel_projects'::text,
    to_regclass('public.projects') IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'projects'
          AND table_type = 'BASE TABLE'
      ), 'Mobile must map projects to portal_projects (no second base table required)';
END;
$$;

REVOKE ALL ON FUNCTION public.verify_mobile_compat_contracts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_mobile_compat_contracts() TO authenticated, service_role;
