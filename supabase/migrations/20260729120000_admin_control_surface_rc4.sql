-- STATUS: LOCAL PASS — staging apply authorized for this gate (production NOT authorized)
-- Contract: vdb-backend-contract@0.2.0-rc.4
-- schemaVersion: 2026.07.29.admin-control-surface-rc4
-- Target: staging qzekuvmgfekzsowdecyk only after local verify.
--
-- Scope of this file (foundation only; RPCs live in 20260729120100):
--   1. Authorization helpers (is_admin_or_owner, require_aal2)
--   2. Admin RPC idempotency store + helpers
--   3. Reason validation helper
--   4. partner_commission_status gains REJECTED
--   5. Contract-drift alias transition_portal_support_ticket(uuid, portal_ticket_status)
--   6. confirm_partner_sale stops posting the ledger (accrual moves to approval)
--
-- The enum value added here is intentionally NOT used by any DDL in this file.
-- PostgreSQL forbids using a new enum label in the transaction that added it,
-- which is why every RPC that writes REJECTED ships in the follow-up migration
-- (same pattern as portal_ticket_status.NEW in rc.3).

-- ---------------------------------------------------------------------------
-- 1) Authorization helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin_or_owner()
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

REVOKE ALL ON FUNCTION public.is_admin_or_owner() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_or_owner() TO authenticated, service_role;

COMMENT ON FUNCTION public.is_admin_or_owner() IS
  'rc.4 — TRUE only for active OWNER/ADMIN staff. SUPPORT/CONTENT are excluded (same shape as can_reverse_invoice_payment).';

-- Step-up authentication gate. Fail-closed: a missing JWT (service_role, cron,
-- direct psql) has no aal claim and is therefore rejected.
CREATE OR REPLACE FUNCTION public.require_aal2()
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF (auth.jwt() ->> 'aal') IS DISTINCT FROM 'aal2' THEN
    RAISE EXCEPTION 'AAL2_REQUIRED';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.require_aal2() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.require_aal2() TO authenticated, service_role;

COMMENT ON FUNCTION public.require_aal2() IS
  'rc.4 — raises AAL2_REQUIRED unless the caller JWT carries aal=aal2; AUTH_REQUIRED when unauthenticated.';

-- ---------------------------------------------------------------------------
-- 2) Admin RPC idempotency store (SECURITY DEFINER writes only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_rpc_idempotency (
  idempotency_key TEXT PRIMARY KEY,
  rpc_name TEXT NOT NULL,
  actor_id UUID NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_rpc_idempotency_rpc_resource
  ON public.admin_rpc_idempotency (rpc_name, resource_id);

ALTER TABLE public.admin_rpc_idempotency ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_rpc_idempotency_anon_deny ON public.admin_rpc_idempotency;
CREATE POLICY admin_rpc_idempotency_anon_deny ON public.admin_rpc_idempotency
  FOR ALL TO anon
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS admin_rpc_idempotency_authenticated_deny ON public.admin_rpc_idempotency;
CREATE POLICY admin_rpc_idempotency_authenticated_deny ON public.admin_rpc_idempotency
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

REVOKE ALL ON TABLE public.admin_rpc_idempotency FROM PUBLIC;
REVOKE ALL ON TABLE public.admin_rpc_idempotency FROM anon;
REVOKE ALL ON TABLE public.admin_rpc_idempotency FROM authenticated;

COMMENT ON TABLE public.admin_rpc_idempotency IS
  'rc.4 — replay store for admin mutation RPCs. No client access: written and read by SECURITY DEFINER functions only.';
COMMENT ON COLUMN public.admin_rpc_idempotency.response IS
  'Exact jsonb payload returned to the first caller; replayed verbatim on retry.';

CREATE OR REPLACE FUNCTION public.admin_idempotency_get(
  p_key text,
  p_rpc text
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.admin_rpc_idempotency%ROWTYPE;
  v_key text := NULLIF(btrim(COALESCE(p_key, '')), '');
BEGIN
  IF v_key IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_row
  FROM public.admin_rpc_idempotency
  WHERE idempotency_key = v_key;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Same key reused for a different operation is never a safe replay.
  IF v_row.rpc_name IS DISTINCT FROM p_rpc THEN
    RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT';
  END IF;

  RETURN v_row.response;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_idempotency_get(text, text) FROM PUBLIC;

COMMENT ON FUNCTION public.admin_idempotency_get(text, text) IS
  'rc.4 internal — returns the stored response for (key, rpc) or NULL; raises IDEMPOTENCY_CONFLICT on cross-RPC key reuse.';

CREATE OR REPLACE FUNCTION public.admin_idempotency_put(
  p_key text,
  p_rpc text,
  p_actor uuid,
  p_resource_type text,
  p_resource_id uuid,
  p_response jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text := NULLIF(btrim(COALESCE(p_key, '')), '');
BEGIN
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF p_response IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  INSERT INTO public.admin_rpc_idempotency (
    idempotency_key, rpc_name, actor_id, resource_type, resource_id, response
  ) VALUES (
    v_key, p_rpc, p_actor, p_resource_type, p_resource_id, p_response
  )
  ON CONFLICT (idempotency_key) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_idempotency_put(text, text, uuid, text, uuid, jsonb) FROM PUBLIC;

COMMENT ON FUNCTION public.admin_idempotency_put(text, text, uuid, text, uuid, jsonb) IS
  'rc.4 internal — records the response of an admin mutation for replay. First writer wins.';

-- ---------------------------------------------------------------------------
-- 3) Reason validation
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_require_reason(p_reason text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_reason text := btrim(COALESCE(p_reason, ''));
BEGIN
  IF char_length(v_reason) < 8 OR char_length(v_reason) > 500 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  RETURN v_reason;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_require_reason(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_require_reason(text) TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_require_reason(text) IS
  'rc.4 — trims and validates an operator reason (8..500 chars) or raises VALIDATION_FAILED.';

-- ---------------------------------------------------------------------------
-- 4) partner_commission_status gains REJECTED
--    Top-level statement (repo convention, cf. portal_ticket_status.NEW):
--    ADD VALUE is not permitted from inside a function/DO body on every
--    supported PostgreSQL build, and IF NOT EXISTS already makes it re-runnable.
-- ---------------------------------------------------------------------------
ALTER TYPE public.partner_commission_status ADD VALUE IF NOT EXISTS 'REJECTED';

-- ---------------------------------------------------------------------------
-- 5) Contract-drift alias for the support ticket transition RPC
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.transition_portal_support_ticket(
  p_ticket_id uuid,
  p_to_status public.portal_ticket_status
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.transition_portal_support_ticket_status(p_ticket_id, p_to_status);
$$;

REVOKE ALL ON FUNCTION public.transition_portal_support_ticket(uuid, public.portal_ticket_status) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_portal_support_ticket(uuid, public.portal_ticket_status)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.transition_portal_support_ticket(uuid, public.portal_ticket_status) IS
  'DEPRECATED rc.4 — contract-drift alias for transition_portal_support_ticket_status(uuid, portal_ticket_status). No independent logic; clients must migrate to the canonical name.';

-- ---------------------------------------------------------------------------
-- 6) confirm_partner_sale: accrue nothing until a human approves
--
-- Replaces the 20260724180000 body. Sale conversion, the one-sale-per-lead
-- constraint and idempotent re-entry are unchanged. The commission is now
-- created as PENDING with approved_at NULL and NO ledger transaction is posted.
-- COMMISSION_ACCRUAL is posted by approve_partner_commission (rc.4), which is
-- the single place where partner liability is recognised.
-- ---------------------------------------------------------------------------
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

  -- rc.4: PENDING + approved_at NULL. Liability is recognised only by
  -- approve_partner_commission, which posts COMMISSION_ACCRUAL.
  BEGIN
    INSERT INTO public.partner_commissions (
      partner_id, partner_sale_id, status, basis_amount_cents, rate_bps, amount_cents,
      currency, calculation_rule_version, idempotency_key, approved_at
    ) VALUES (
      v_lead.partner_id, v_sale_id, 'PENDING', p_gross_amount_cents, p_rate_bps, v_amount,
      p_currency, 'v1_flat_bps', p_idempotency_key || ':commission', NULL
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

  RETURN v_sale_id;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_partner_sale(uuid,bigint,text,int,text,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_partner_sale(uuid,bigint,text,int,text,uuid,text) TO authenticated;

COMMENT ON FUNCTION public.confirm_partner_sale(uuid,bigint,text,int,text,uuid,text) IS
  'rc.4 — converts a lead into exactly one settled sale and creates a PENDING commission. Posts NO ledger: COMMISSION_ACCRUAL is posted by approve_partner_commission after OWNER/ADMIN review.';
;
