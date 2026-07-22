-- =============================================================================
-- Partner domain contract verification (local)
-- Outside production apply baseline ending at 20260719170000.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.verify_partner_admin_contracts()
RETURNS TABLE (check_name text, ok boolean, detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM (VALUES
    ('table:partner_profiles', to_regclass('public.partner_profiles') IS NOT NULL, 'partner_profiles'),
    ('table:partner_applications', to_regclass('public.partner_applications') IS NOT NULL, 'partner_applications'),
    ('table:partner_codes', to_regclass('public.partner_codes') IS NOT NULL, 'partner_codes'),
    ('table:partner_leads', to_regclass('public.partner_leads') IS NOT NULL, 'partner_leads'),
    ('table:partner_sales', to_regclass('public.partner_sales') IS NOT NULL, 'partner_sales'),
    ('table:partner_commissions', to_regclass('public.partner_commissions') IS NOT NULL, 'partner_commissions'),
    ('table:partner_payout_requests', to_regclass('public.partner_payout_requests') IS NOT NULL, 'partner_payout_requests'),
    ('table:partner_payouts', to_regclass('public.partner_payouts') IS NOT NULL, 'partner_payouts'),
    ('table:partner_ledger_transactions', to_regclass('public.partner_ledger_transactions') IS NOT NULL, 'partner_ledger_transactions'),
    ('table:partner_ledger_entries', to_regclass('public.partner_ledger_entries') IS NOT NULL, 'partner_ledger_entries'),
    ('table:partner_cash_receipts', to_regclass('public.partner_cash_receipts') IS NOT NULL, 'partner_cash_receipts'),
    ('table:partner_adjustments', to_regclass('public.partner_adjustments') IS NOT NULL, 'partner_adjustments'),
    ('fn:submit_partner_application', to_regprocedure('public.submit_partner_application(text,text,text,text,text,text)') IS NOT NULL, 'submit_partner_application'),
    ('fn:review_partner_application', to_regprocedure('public.review_partner_application(uuid,boolean,text,text)') IS NOT NULL, 'review_partner_application'),
    ('fn:create_partner_lead', to_regprocedure('public.create_partner_lead(text,text,text,text,text,text,text)') IS NOT NULL, 'create_partner_lead'),
    ('fn:review_partner_lead', to_regprocedure('public.review_partner_lead(uuid,public.partner_lead_status,text)') IS NOT NULL, 'review_partner_lead'),
    ('fn:confirm_partner_sale', to_regprocedure('public.confirm_partner_sale(uuid,bigint,text,int,text,uuid,text)') IS NOT NULL, 'confirm_partner_sale'),
    ('fn:request_partner_payout', to_regprocedure('public.request_partner_payout(bigint,text,text)') IS NOT NULL, 'request_partner_payout'),
    ('fn:approve_partner_payout_request', to_regprocedure('public.approve_partner_payout_request(uuid,boolean,text)') IS NOT NULL, 'approve_partner_payout_request'),
    ('fn:record_partner_payout_paid', to_regprocedure('public.record_partner_payout_paid(uuid,text,text)') IS NOT NULL, 'record_partner_payout_paid'),
    ('fn:record_partner_cash_receipt', to_regprocedure('public.record_partner_cash_receipt(bigint,text,uuid,text,text)') IS NOT NULL, 'record_partner_cash_receipt'),
    ('fn:process_partner_refund_adjustment', to_regprocedure('public.process_partner_refund_adjustment(uuid,bigint,text,text,uuid,uuid,text,text)') IS NOT NULL, 'process_partner_refund_adjustment'),
    ('fn:partner_financial_summary', to_regprocedure('public.partner_financial_summary(uuid)') IS NOT NULL, 'partner_financial_summary'),
    ('fn:verify_partner_admin_contracts', TRUE, 'self'),
    ('rls:partner_profiles', (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.partner_profiles'::regclass), 'rls on'),
    ('rls:partner_leads', (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.partner_leads'::regclass), 'rls on'),
    ('rls:partner_commissions', (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.partner_commissions'::regclass), 'rls on'),
    ('rls:partner_payouts', (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.partner_payouts'::regclass), 'rls on'),
    ('no_marketing_leads_overload', NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'partner_id'
    ), 'marketing leads untouched'),
    ('schema_version_partner_rc1', TRUE, '2026.07.22.partner-rc1')
  ) AS t(check_name, ok, detail);
END;
$$;

REVOKE ALL ON FUNCTION public.verify_partner_admin_contracts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_partner_admin_contracts() TO authenticated, service_role;

DO $$
DECLARE
  v_fail int;
BEGIN
  SELECT COUNT(*) INTO v_fail
  FROM public.verify_partner_admin_contracts()
  WHERE ok IS NOT TRUE;
  IF v_fail > 0 THEN
    RAISE EXCEPTION 'verify_partner_admin_contracts failed: % checks', v_fail;
  END IF;
END $$;
