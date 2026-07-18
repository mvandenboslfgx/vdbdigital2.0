-- Auth / portal foundation verifier alias (forward-only).
-- Wraps portal_verify_customer_contracts for the foundation gate name.
-- Local apply only — not applied remotely by this change set.

CREATE OR REPLACE FUNCTION public.verify_auth_portal_foundation_contracts()
RETURNS TABLE(check_name text, ok boolean, detail text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.portal_verify_customer_contracts();
$$;

REVOKE ALL ON FUNCTION public.verify_auth_portal_foundation_contracts() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_auth_portal_foundation_contracts() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_auth_portal_foundation_contracts() TO service_role;

COMMENT ON FUNCTION public.verify_auth_portal_foundation_contracts() IS
  'Fail-closed auth/portal foundation contract checks (alias of portal_verify_customer_contracts).';
