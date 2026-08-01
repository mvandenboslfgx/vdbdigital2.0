-- STATUS: LOCAL ONLY → staging. Production NOT authorized.
-- Contract: vdb-backend-contract@0.2.0-rc.5
-- schemaVersion: 2026.07.29.partner-identity-directory-rc5
--
-- Depends on 20260729140300.
--
-- Single behavioural change versus 20260729140300:
--
--   ('flag:partner_compliance_fixtures', ... AND enabled = false ...)
--     becomes an existence-only check.
--
-- 20260729140000 seeds partner_compliance_fixtures fail-closed (false) and
-- 20260729140300 asserted that literal false. Enabling the fixtures on staging
-- is a documented manual operator step, so the original check turned the
-- expected operator state into a verifier failure and made "0 failing checks"
-- unreachable on any environment that actually exercises the fixtures.
--
-- Fail-closed behaviour is unaffected: staff_set_partner_compliance_fixture
-- still raises FEATURE_DISABLED unless the flag is enabled, and that gating is
-- asserted separately by the 'fixtures:flag_gated' check below. The default
-- remains false in the seeding migration; only the assertion changes.
--
-- Every other check in this function is carried over byte-identical.

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
      EXISTS (SELECT 1 FROM public.feature_flags WHERE key = 'partner_compliance_fixtures'),
      'rc.5 — flag row must exist (migration default false); staging operators may enable it. Fail-closed behaviour is asserted by fixtures:flag_gated'),
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
  'rc.5 — presence, hardening, activation-boundary and flag checks for the partner identity + admin directory detail surface. partner_compliance_fixtures is an existence check so an operator may enable the staging fixtures without failing verification.';

DO $$
DECLARE
  v_fail int;
BEGIN
  SELECT COUNT(*) INTO v_fail
  FROM public.verify_partner_identity_directory_rc5_contracts()
  WHERE ok IS NOT TRUE;
  IF v_fail > 0 THEN
    RAISE EXCEPTION 'verify_partner_identity_directory_rc5_contracts failed after 20260729140400: % checks', v_fail;
  END IF;
END $$;
;
