-- STATUS: LOCAL + STAGING AUTHORIZED — admin/read RPC schema stamps → rc.6
-- Contract: vdb-backend-contract@0.2.0-rc.6
-- schemaVersion: 2026.07.29.partner-approval-aal2-rc6
-- Target: staging qzekuvmgfekzsowdecyk ONLY. Production NOT authorized.
--
-- Forward-only stamp bump for Mobile-consumed admin/directory/checklist RPCs.
-- Signature, grants, SECURITY DEFINER, search_path, and business logic are
-- preserved via CREATE OR REPLACE of pg_get_functiondef with literal replace.
-- Read RPCs stay without require_aal2. Mutation AAL2 gates are untouched here.

DO $$
DECLARE
  RC4 constant text := '2026.07.29.admin-control-surface-rc4';
  RC5 constant text := '2026.07.29.partner-identity-directory-rc5';
  RC6 constant text := '2026.07.29.partner-approval-aal2-rc6';
  v_targets text[] := ARRAY[
    'admin_dashboard_stats()',
    'admin_work_queue(integer, timestamp with time zone, text[])',
    'admin_get_settings_summary()',
    'admin_get_security_status()',
    'admin_get_product(uuid)',
    'admin_get_partner(uuid)',
    'admin_get_customer(uuid)',
    'admin_get_project(uuid)',
    'admin_get_quote(uuid)',
    'admin_get_invoice(uuid)',
    'admin_get_appointment(uuid)',
    'admin_list_partners(integer, timestamp with time zone, text)',
    'admin_list_products(integer, timestamp with time zone, text)',
    'admin_list_customers(integer, timestamp with time zone, text)',
    'admin_list_projects(integer, timestamp with time zone, text)',
    'admin_list_quotes(integer, timestamp with time zone, text)',
    'admin_list_invoices(integer, timestamp with time zone, text)',
    'admin_list_appointments(integer, timestamp with time zone, text)',
    'partner_activation_checklist(uuid)',
    'list_portal_support_ticket_replies(uuid, integer, timestamp with time zone)'
  ];
  v_ident text;
  v_reg text;
  v_def text;
  v_new text;
  v_oid oid;
  v_had_aal2 boolean;
BEGIN
  FOREACH v_ident IN ARRAY v_targets LOOP
    v_reg := 'public.' || v_ident;
    v_oid := to_regprocedure(v_reg);
    IF v_oid IS NULL THEN
      RAISE EXCEPTION 'RC6_STAMP_TARGET_MISSING: %', v_reg;
    END IF;

    v_def := pg_get_functiondef(v_oid);
    v_had_aal2 := position('require_aal2' in lower(v_def)) > 0;
    v_new := replace(replace(v_def, RC5, RC6), RC4, RC6);

    IF v_new IS DISTINCT FROM v_def THEN
      EXECUTE v_new;
    END IF;

    IF position(RC6 in pg_get_functiondef(v_oid)) = 0 THEN
      RAISE EXCEPTION 'RC6_STAMP_MISSING_AFTER_BUMP: %', v_reg;
    END IF;

    IF (NOT v_had_aal2)
       AND position('require_aal2' in lower(pg_get_functiondef(v_oid))) > 0 THEN
      RAISE EXCEPTION 'RC6_STAMP_UNEXPECTED_AAL2: %', v_reg;
    END IF;
  END LOOP;
END $$;

-- Verifier: every stamp target carries the RC6 schema literal.
CREATE OR REPLACE FUNCTION public.verify_admin_rpc_schema_stamps_rc6()
RETURNS TABLE (check_name text, ok boolean, detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  RC6 constant text := '2026.07.29.partner-approval-aal2-rc6';
BEGIN
  RETURN QUERY
  SELECT * FROM (VALUES
    ('stamp:admin_dashboard_stats',
      EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname='admin_dashboard_stats' AND p.prosrc LIKE '%'||RC6||'%'), RC6),
    ('stamp:admin_work_queue',
      EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname='admin_work_queue' AND p.prosrc LIKE '%'||RC6||'%'), RC6),
    ('stamp:admin_get_settings_summary',
      EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname='admin_get_settings_summary' AND p.prosrc LIKE '%'||RC6||'%'), RC6),
    ('stamp:admin_get_security_status',
      EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname='admin_get_security_status' AND p.prosrc LIKE '%'||RC6||'%'), RC6),
    ('stamp:admin_get_product',
      EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname='admin_get_product' AND p.prosrc LIKE '%'||RC6||'%'), RC6),
    ('stamp:admin_get_partner',
      EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname='admin_get_partner' AND p.prosrc LIKE '%'||RC6||'%'), RC6),
    ('stamp:admin_get_customer',
      EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname='admin_get_customer' AND p.prosrc LIKE '%'||RC6||'%'), RC6),
    ('stamp:admin_get_project',
      EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname='admin_get_project' AND p.prosrc LIKE '%'||RC6||'%'), RC6),
    ('stamp:admin_get_quote',
      EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname='admin_get_quote' AND p.prosrc LIKE '%'||RC6||'%'), RC6),
    ('stamp:admin_get_invoice',
      EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname='admin_get_invoice' AND p.prosrc LIKE '%'||RC6||'%'), RC6),
    ('stamp:admin_get_appointment',
      EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname='admin_get_appointment' AND p.prosrc LIKE '%'||RC6||'%'), RC6),
    ('stamp:admin_list_partners',
      EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname='admin_list_partners' AND p.prosrc LIKE '%'||RC6||'%'), RC6),
    ('stamp:admin_list_products',
      EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname='admin_list_products' AND p.prosrc LIKE '%'||RC6||'%'), RC6),
    ('stamp:admin_list_customers',
      EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname='admin_list_customers' AND p.prosrc LIKE '%'||RC6||'%'), RC6),
    ('stamp:admin_list_projects',
      EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname='admin_list_projects' AND p.prosrc LIKE '%'||RC6||'%'), RC6),
    ('stamp:admin_list_quotes',
      EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname='admin_list_quotes' AND p.prosrc LIKE '%'||RC6||'%'), RC6),
    ('stamp:admin_list_invoices',
      EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname='admin_list_invoices' AND p.prosrc LIKE '%'||RC6||'%'), RC6),
    ('stamp:admin_list_appointments',
      EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname='admin_list_appointments' AND p.prosrc LIKE '%'||RC6||'%'), RC6),
    ('stamp:partner_activation_checklist',
      EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname='partner_activation_checklist' AND p.prosrc LIKE '%'||RC6||'%'), RC6),
    ('stamp:list_portal_support_ticket_replies',
      EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname='list_portal_support_ticket_replies' AND p.prosrc LIKE '%'||RC6||'%'), RC6),
    ('read_rpc_no_aal2:admin_dashboard_stats',
      NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname='admin_dashboard_stats' AND p.prosrc LIKE '%require_aal2%'),
      'read RPC'),
    ('read_rpc_no_aal2:admin_get_partner',
      NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname='admin_get_partner' AND p.prosrc LIKE '%require_aal2%'),
      'read RPC')
  ) AS t(check_name, ok, detail);
END;
$$;

REVOKE ALL ON FUNCTION public.verify_admin_rpc_schema_stamps_rc6() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_admin_rpc_schema_stamps_rc6() FROM anon;
GRANT EXECUTE ON FUNCTION public.verify_admin_rpc_schema_stamps_rc6()
  TO authenticated, service_role;

COMMENT ON FUNCTION public.verify_admin_rpc_schema_stamps_rc6() IS
  'rc.6 — proves admin/directory/checklist read RPC schema_version stamps equal 2026.07.29.partner-approval-aal2-rc6.';
