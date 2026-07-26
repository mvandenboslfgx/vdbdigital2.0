-- =============================================================================
-- Invoice financial RPC grants hardening
-- Outside production apply baseline ending at 20260719170000.
-- App must authorize via requirePermission + service_role RPC/fallback.
-- =============================================================================

REVOKE ALL ON FUNCTION public.issue_portal_invoice(UUID, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.issue_portal_invoice(UUID, INT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.issue_portal_invoice(UUID, INT) TO service_role;

REVOKE ALL ON FUNCTION public.record_portal_invoice_payment(UUID, INT, INT, TEXT, DATE, public.portal_invoice_payment_method, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_portal_invoice_payment(UUID, INT, INT, TEXT, DATE, public.portal_invoice_payment_method, TEXT, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.record_portal_invoice_payment(UUID, INT, INT, TEXT, DATE, public.portal_invoice_payment_method, TEXT, TEXT, TEXT) TO service_role;

DO $$
BEGIN
  IF to_regprocedure('public.reverse_portal_invoice_payment(uuid,uuid,integer,text,text,text)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.reverse_portal_invoice_payment(UUID, UUID, INT, TEXT, TEXT, TEXT) FROM PUBLIC';
    EXECUTE 'REVOKE ALL ON FUNCTION public.reverse_portal_invoice_payment(UUID, UUID, INT, TEXT, TEXT, TEXT) FROM authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.reverse_portal_invoice_payment(UUID, UUID, INT, TEXT, TEXT, TEXT) TO service_role';
  END IF;
END $$;
