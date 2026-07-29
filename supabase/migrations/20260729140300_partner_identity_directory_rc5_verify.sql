-- STATUS: LOCAL ONLY — partner identity + directory rc.5 verifier
-- Contract: vdb-backend-contract@0.2.0-rc.5
-- schemaVersion: 2026.07.29.partner-identity-directory-rc5
-- Target: staging only after local verify. Production NOT authorized.
--
-- Depends on 20260729140000 / 20260729140100 / 20260729140200.
--
-- OPERATOR NOTE — this migration deliberately does NOT enable any flag.
-- Enabling the internal support notes RPC on staging is a manual operator step:
--
--   UPDATE public.feature_flags
--   SET enabled = true, updated_at = timezone('utc', now())
--   WHERE key = 'support_internal_notes_rpc';
--
-- Enabling the staging-only compliance fixtures is likewise manual:
--
--   UPDATE public.feature_flags
--   SET enabled = true, updated_at = timezone('utc', now())
--   WHERE key = 'partner_compliance_fixtures';
--
-- Both statements are staging-only. Neither may be run against production.

-- ---------------------------------------------------------------------------
-- admin_get_security_status — rc.4 body, schema_version bumped to rc.5
-- (capability list and returned keys are intentionally unchanged)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_security_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_aal text := COALESCE(auth.jwt() ->> 'aal', 'aal1');
  v_role text;
  v_mfa boolean := false;
  v_capabilities jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.is_staff_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  SELECT ar.role::text INTO v_role
  FROM public.admin_roles ar
  WHERE ar.user_id = v_uid;

  -- auth.mfa_factors is readable by the definer role on Supabase; degrade to
  -- false rather than failing the whole security screen if it is not.
  IF to_regclass('auth.mfa_factors') IS NOT NULL THEN
    BEGIN
      SELECT EXISTS (
        SELECT 1 FROM auth.mfa_factors f
        WHERE f.user_id = v_uid AND f.status = 'verified'
      ) INTO v_mfa;
    EXCEPTION WHEN OTHERS THEN
      v_mfa := false;
    END;
  END IF;

  IF v_role IN ('OWNER', 'ADMIN') THEN
    v_capabilities := jsonb_build_array(
      'dashboard.read',
      'work_queue.read',
      'directory.read',
      'settings.read',
      'security.read',
      'commission.approve',
      'commission.reject',
      'partner.suspend',
      'partner.reactivate'
    );
  ELSE
    v_capabilities := jsonb_build_array(
      'dashboard.read',
      'work_queue.read',
      'directory.read',
      'settings.read',
      'security.read'
    );
  END IF;

  RETURN jsonb_build_object(
    'current_aal', v_aal,
    'mfa_enrolled', v_mfa,
    'mfa_required', true,
    'step_up_required', v_aal IS DISTINCT FROM 'aal2',
    'actor_role', v_role,
    'capabilities', v_capabilities,
    'schema_version', '2026.07.29.partner-identity-directory-rc5',
    'generated_at', NOW()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_security_status() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_get_security_status() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_get_security_status() TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_get_security_status() IS
  'rc.5 — unchanged rc.4 shape with schema_version bumped to 2026.07.29.partner-identity-directory-rc5. Still returns booleans and capability names only.';

-- ---------------------------------------------------------------------------
-- verify_partner_identity_directory_rc5_contracts
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_partner_identity_directory_rc5_contracts()
RETURNS TABLE (check_name text, ok boolean, detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM (VALUES
    -- Enums -----------------------------------------------------------------
    ('enum:partner_type',
      EXISTS (SELECT 1 FROM pg_type WHERE typname = 'partner_type'), 'INDIVIDUAL/BUSINESS'),
    ('enum:partner_verification_status',
      EXISTS (SELECT 1 FROM pg_type WHERE typname = 'partner_verification_status'), 'verification states'),
    ('enum:partner_payout_profile_status',
      EXISTS (SELECT 1 FROM pg_type WHERE typname = 'partner_payout_profile_status'), 'payout profile states'),
    ('enum:partner_agreement_type',
      EXISTS (SELECT 1 FROM pg_type WHERE typname = 'partner_agreement_type'), 'agreement families'),
    ('enum:partner_type_classification_status',
      EXISTS (SELECT 1 FROM pg_type WHERE typname = 'partner_type_classification_status'), 'classification states'),

    -- Columns ---------------------------------------------------------------
    ('col:partner_applications.partner_type',
      EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='partner_applications' AND column_name='partner_type'),
      'typed intake'),
    ('col:partner_applications.staff_approved_at',
      EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='partner_applications' AND column_name='staff_approved_at'),
      'staff approval marker'),
    ('col:partner_profiles.partner_type',
      EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='partner_profiles' AND column_name='partner_type'),
      'canonical type'),
    ('col:partner_profiles.type_classification_status',
      EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='partner_profiles' AND column_name='type_classification_status'),
      'classification'),
    ('col:partner_profiles.age_verification_status',
      EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='partner_profiles' AND column_name='age_verification_status'),
      '18+ gate'),
    ('col:partner_profiles.identity_verification_status',
      EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='partner_profiles' AND column_name='identity_verification_status'),
      'identity gate'),
    ('col:partner_profiles.business_verification_status',
      EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='partner_profiles' AND column_name='business_verification_status'),
      'business gate'),
    ('col:partner_profiles.payout_profile_status',
      EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='partner_profiles' AND column_name='payout_profile_status'),
      'payout profile'),
    ('col:partner_profiles.legacy_activation_grandfathered',
      EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='partner_profiles' AND column_name='legacy_activation_grandfathered'),
      'grandfather marker'),
    ('col:partner_profiles.activation_block_codes',
      EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='partner_profiles' AND column_name='activation_block_codes'),
      'diagnostic codes'),
    ('col:partner_profiles.required_agreement_type',
      EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='partner_profiles' AND column_name='required_agreement_type'),
      'required agreement'),

    -- Agreement tables ------------------------------------------------------
    ('table:partner_agreement_versions',
      to_regclass('public.partner_agreement_versions') IS NOT NULL, 'agreement catalogue'),
    ('table:partner_agreement_acceptances',
      to_regclass('public.partner_agreement_acceptances') IS NOT NULL, 'acceptance ledger'),
    ('rls:partner_agreement_versions',
      COALESCE((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.partner_agreement_versions'::regclass), false),
      'rls on'),
    ('rls:partner_agreement_acceptances',
      COALESCE((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.partner_agreement_acceptances'::regclass), false),
      'rls on'),
    ('seed:current_agreements',
      (SELECT COUNT(*) FROM public.partner_agreement_versions WHERE is_current) = 2
      AND EXISTS (SELECT 1 FROM public.partner_agreement_versions
                  WHERE is_current AND agreement_type = 'INDIVIDUAL_PARTNER')
      AND EXISTS (SELECT 1 FROM public.partner_agreement_versions
                  WHERE is_current AND agreement_type = 'BUSINESS_PARTNER'),
      'one current placeholder per family'),
    ('seed:agreements_legal_review_required',
      NOT EXISTS (SELECT 1 FROM public.partner_agreement_versions
                  WHERE is_current AND legal_review_status IS DISTINCT FROM 'REQUIRED'),
      'placeholder bodies are not binding legal text'),

    -- Activation RPCs -------------------------------------------------------
    ('fn:partner_is_valid_kvk',
      to_regprocedure('public.partner_is_valid_kvk(text)') IS NOT NULL, 'kvk format helper'),
    ('fn:partner_activation_checklist',
      to_regprocedure('public.partner_activation_checklist(uuid)') IS NOT NULL, 'checklist'),
    ('fn:partner_try_activate',
      to_regprocedure('public.partner_try_activate(uuid,text)') IS NOT NULL, 'activation attempt'),
    ('fn:activate_partner_profile',
      to_regprocedure('public.activate_partner_profile(uuid,text,text,text)') IS NOT NULL, 'owner activation'),
    ('fn:accept_partner_agreement',
      to_regprocedure('public.accept_partner_agreement(uuid)') IS NOT NULL, 'agreement acceptance'),
    ('fn:staff_set_partner_compliance_fixture',
      to_regprocedure('public.staff_set_partner_compliance_fixture(uuid,text,text,text,text)') IS NOT NULL,
      'staging fixtures'),
    ('fn:reactivate_partner',
      to_regprocedure('public.reactivate_partner(uuid,text,text)') IS NOT NULL, 'reactivate'),
    ('fn:submit_partner_application_typed',
      to_regprocedure('public.submit_partner_application(text,text,text,text,text,text,text)') IS NOT NULL,
      'typed 7-arg signature'),
    ('fn:submit_partner_application_legacy_dropped',
      to_regprocedure('public.submit_partner_application(text,text,text,text,text,text)') IS NULL,
      'untyped 6-arg signature removed'),

    -- Detail RPCs -----------------------------------------------------------
    ('fn:admin_get_product',
      to_regprocedure('public.admin_get_product(uuid)') IS NOT NULL, 'product detail'),
    ('fn:admin_get_partner',
      to_regprocedure('public.admin_get_partner(uuid)') IS NOT NULL, 'partner detail'),
    ('fn:admin_get_customer',
      to_regprocedure('public.admin_get_customer(uuid)') IS NOT NULL, 'customer detail'),
    ('fn:admin_get_project',
      to_regprocedure('public.admin_get_project(uuid)') IS NOT NULL, 'project detail'),
    ('fn:admin_get_quote',
      to_regprocedure('public.admin_get_quote(uuid)') IS NOT NULL, 'quote detail'),
    ('fn:admin_get_invoice',
      to_regprocedure('public.admin_get_invoice(uuid)') IS NOT NULL, 'invoice detail'),
    ('fn:admin_get_appointment',
      to_regprocedure('public.admin_get_appointment(uuid)') IS NOT NULL, 'appointment detail'),
    ('fn:list_portal_support_ticket_replies',
      to_regprocedure('public.list_portal_support_ticket_replies(uuid,integer,timestamptz)') IS NOT NULL,
      'ticket replies'),

    -- Hardening -------------------------------------------------------------
    ('secdef:rc5_functions',
      NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname IN ('partner_activation_checklist', 'partner_try_activate',
                            'activate_partner_profile', 'accept_partner_agreement',
                            'staff_set_partner_compliance_fixture',
                            'submit_partner_application', 'review_partner_application',
                            'admin_get_product', 'admin_get_partner', 'admin_get_customer',
                            'admin_get_project', 'admin_get_quote', 'admin_get_invoice',
                            'admin_get_appointment', 'list_portal_support_ticket_replies')
          AND (p.prosecdef IS NOT TRUE
               OR p.proconfig IS NULL
               OR NOT EXISTS (
                 SELECT 1 FROM unnest(p.proconfig) cfg WHERE cfg ILIKE 'search_path=public%'
               ))
      ), 'SECURITY DEFINER + search_path=public'),
    ('grants:anon_denied_admin_get_product',
      NOT has_function_privilege('anon', 'public.admin_get_product(uuid)', 'EXECUTE'),
      'anon has no directory detail'),
    ('grants:anon_denied_activate_partner_profile',
      NOT has_function_privilege('anon', 'public.activate_partner_profile(uuid,text,text,text)', 'EXECUTE'),
      'anon has no activation surface'),
    ('grants:anon_denied_partner_mutations',
      NOT has_function_privilege('anon', 'public.submit_partner_application(text,text,text,text,text,text,text)', 'EXECUTE')
      AND NOT has_function_privilege('anon', 'public.accept_partner_agreement(uuid)', 'EXECUTE')
      AND NOT has_function_privilege('anon', 'public.staff_set_partner_compliance_fixture(uuid,text,text,text,text)', 'EXECUTE')
      AND NOT has_function_privilege('anon', 'public.partner_try_activate(uuid,text)', 'EXECUTE'),
      'anon cannot mutate partner identity'),
    ('grants:authenticated_allowed',
      has_function_privilege('authenticated', 'public.admin_get_product(uuid)', 'EXECUTE')
      AND has_function_privilege('authenticated', 'public.partner_activation_checklist(uuid)', 'EXECUTE'),
      'authenticated may call (functions enforce role)'),

    -- Money / activation boundaries ----------------------------------------
    ('activation:payout_requires_approved_profile',
      EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'partner_try_activate'
          AND p.prosrc LIKE '%payout_profile_status = ''APPROVED''%'
      ), 'payout_eligible derived from payout profile only'),
    ('activation:reactivate_uses_checklist',
      EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'reactivate_partner'
          AND p.prosrc LIKE '%partner_activation_checklist%'
          AND p.prosrc LIKE '%legacy_activation_grandfathered%'
      ), 'non-grandfathered reactivation is checklist gated'),
    ('activation:submit_never_activates',
      EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'submit_partner_application'
          AND p.prosrc NOT LIKE '%''ACTIVE''%'
      ), 'intake never sets ACTIVE'),
    ('activation:review_defers_to_try_activate',
      EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'review_partner_application'
          AND p.prosrc LIKE '%partner_try_activate%'
      ), 'staff approval alone does not activate'),
    ('fixtures:flag_gated',
      EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'staff_set_partner_compliance_fixture'
          AND p.prosrc LIKE '%partner_compliance_fixtures%'
          AND p.prosrc LIKE '%FEATURE_DISABLED%'
      ), 'fixtures fail closed'),

    -- Feature flags ---------------------------------------------------------
    ('flag:partner_compliance_fixtures',
      EXISTS (SELECT 1 FROM public.feature_flags WHERE key = 'partner_compliance_fixtures' AND enabled = false),
      'fail-closed default; turns false by design once an operator enables it on staging'),
    ('flag:support_internal_notes_rpc_exists',
      EXISTS (SELECT 1 FROM public.feature_flags WHERE key = 'support_internal_notes_rpc'),
      'row must exist; operator may enable on staging'),

    -- Contract version ------------------------------------------------------
    ('schema_version:admin_get_security_status',
      EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'admin_get_security_status'
          AND p.prosrc LIKE '%2026.07.29.partner-identity-directory-rc5%'
      ), 'security status reports the rc.5 schema version'),
    ('schema_version:detail_rpcs',
      NOT EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname IN ('admin_get_product', 'admin_get_partner', 'admin_get_customer',
                            'admin_get_project', 'admin_get_quote', 'admin_get_invoice',
                            'admin_get_appointment', 'list_portal_support_ticket_replies',
                            'admin_list_partners', 'partner_activation_checklist')
          AND p.prosrc NOT LIKE '%2026.07.29.partner-identity-directory-rc5%'
      ), 'every rc.5 surface stamps the rc.5 schema version')
  ) AS t(check_name, ok, detail);
END;
$$;

REVOKE ALL ON FUNCTION public.verify_partner_identity_directory_rc5_contracts() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_partner_identity_directory_rc5_contracts() FROM anon;
GRANT EXECUTE ON FUNCTION public.verify_partner_identity_directory_rc5_contracts() TO authenticated, service_role;

COMMENT ON FUNCTION public.verify_partner_identity_directory_rc5_contracts() IS
  'rc.5 — presence, hardening, activation-boundary and flag checks for the partner identity + admin directory detail surface.';

-- ---------------------------------------------------------------------------
-- verify_partner_admin_contracts — rc.1 body realigned to the typed intake
--
-- 20260722170000 pinned submit_partner_application to its untyped 6-arg
-- signature, which 20260729140100 drops in favour of the 7-arg typed form.
-- Left unchanged the rc.1 verifier reports a false positive drift, so the
-- signature check is retargeted here. Every other check is byte-identical.
-- ---------------------------------------------------------------------------
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
    ('fn:submit_partner_application', to_regprocedure('public.submit_partner_application(text,text,text,text,text,text,text)') IS NOT NULL, 'submit_partner_application (rc.5 typed 7-arg)'),
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

COMMENT ON FUNCTION public.verify_partner_admin_contracts() IS
  'rc.1 partner domain verifier, retargeted in rc.5 to the typed 7-arg submit_partner_application signature.';

DO $$
DECLARE
  v_fail int;
BEGIN
  SELECT COUNT(*) INTO v_fail
  FROM public.verify_partner_admin_contracts()
  WHERE ok IS NOT TRUE;
  IF v_fail > 0 THEN
    RAISE EXCEPTION 'verify_partner_admin_contracts failed after rc.5 realignment: % checks', v_fail;
  END IF;
END $$;
;
