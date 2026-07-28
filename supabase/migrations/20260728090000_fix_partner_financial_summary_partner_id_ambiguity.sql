-- STATUS: OWNER RC3 — fix partner_financial_summary partner_id ambiguity
-- Target: staging additive only after local reset validation
-- Does NOT change RPC signature or contract semantics (same args/returns/auth).
-- Root cause: RETURNS TABLE (... partner_id uuid ...) creates a PL/pgSQL OUT variable
-- that conflicts with unqualified partner_commissions.partner_id / partner_payouts.partner_id.

CREATE OR REPLACE FUNCTION public.partner_financial_summary(p_partner_id uuid DEFAULT NULL)
RETURNS TABLE (
  partner_id uuid,
  available_cents bigint,
  approved_commission_cents bigint,
  paid_payout_cents bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pid uuid;
BEGIN
  IF public.is_staff_admin() AND p_partner_id IS NOT NULL THEN
    v_pid := p_partner_id;
  ELSE
    SELECT pp.id
      INTO v_pid
    FROM public.partner_profiles AS pp
    WHERE pp.user_id = auth.uid();
  END IF;

  IF v_pid IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  RETURN QUERY
  SELECT
    v_pid,
    public.partner_available_liability_cents(v_pid),
    COALESCE((
      SELECT SUM(c.amount_cents)
      FROM public.partner_commissions AS c
      WHERE c.partner_id = v_pid
        AND c.status IN ('APPROVED', 'PAID')
    ), 0)::bigint,
    COALESCE((
      SELECT SUM(pay.amount_cents)
      FROM public.partner_payouts AS pay
      WHERE pay.partner_id = v_pid
        AND pay.status = 'PAID'
    ), 0)::bigint;
END;
$$;

REVOKE ALL ON FUNCTION public.partner_financial_summary(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.partner_financial_summary(uuid) TO authenticated;
