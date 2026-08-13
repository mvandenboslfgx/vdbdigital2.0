-- STATUS: LOCAL + STAGING — additive ACL hardening for internal admin idempotency helpers
-- Contract: vdb-backend-contract@0.2.0-rc.4 (unchanged shapes)
-- schemaVersion: 2026.07.29.admin-control-surface-rc4 (unchanged)
-- Target: staging qzekuvmgfekzsowdecyk only after local verify. Production NOT authorized.
--
-- Root cause: CREATE FUNCTION under cloud default privileges granted EXECUTE to
-- authenticated (and service_role). Original RC4 only REVOKE … FROM PUBLIC.
-- Top-level SECURITY DEFINER RPCs call these helpers as function owner (postgres);
-- no direct service_role call path exists → no GRANT to service_role.

-- Exact signatures (single overload each):
--   public.admin_idempotency_get(text, text)
--   public.admin_idempotency_put(text, text, uuid, text, uuid, jsonb)

REVOKE ALL ON FUNCTION public.admin_idempotency_get(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_idempotency_get(text, text) FROM anon;
REVOKE ALL ON FUNCTION public.admin_idempotency_get(text, text) FROM authenticated;
REVOKE ALL ON FUNCTION public.admin_idempotency_get(text, text) FROM service_role;

REVOKE ALL ON FUNCTION public.admin_idempotency_put(text, text, uuid, text, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_idempotency_put(text, text, uuid, text, uuid, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.admin_idempotency_put(text, text, uuid, text, uuid, jsonb) FROM authenticated;
REVOKE ALL ON FUNCTION public.admin_idempotency_put(text, text, uuid, text, uuid, jsonb) FROM service_role;

-- ---------------------------------------------------------------------------
-- Verifier: retain prior checks and fail if helpers regain client EXECUTE
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_admin_control_surface_contracts()
RETURNS TABLE (check_name text, ok boolean, detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM (VALUES
    ('fn:is_admin_or_owner',
      to_regprocedure('public.is_admin_or_owner()') IS NOT NULL, 'OWNER/ADMIN helper'),
    ('fn:require_aal2',
      to_regprocedure('public.require_aal2()') IS NOT NULL, 'step-up gate'),
    ('fn:admin_require_reason',
      to_regprocedure('public.admin_require_reason(text)') IS NOT NULL, 'reason validation'),
    ('fn:admin_idempotency_get',
      to_regprocedure('public.admin_idempotency_get(text,text)') IS NOT NULL, 'idempotency read'),
    ('fn:admin_idempotency_put',
      to_regprocedure('public.admin_idempotency_put(text,text,uuid,text,uuid,jsonb)') IS NOT NULL, 'idempotency write'),
    ('table:admin_rpc_idempotency',
      to_regclass('public.admin_rpc_idempotency') IS NOT NULL, 'replay store'),
    ('rls:admin_rpc_idempotency',
      COALESCE((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.admin_rpc_idempotency'::regclass), false),
      'rls on'),
    ('deny:admin_rpc_idempotency_authenticated',
      NOT has_table_privilege('authenticated', 'public.admin_rpc_idempotency', 'SELECT'),
      'definer-only store'),
    ('enum:partner_commission_status.REJECTED',
      EXISTS (
        SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'partner_commission_status' AND e.enumlabel = 'REJECTED'
      ), 'REJECTED label'),
    ('fn:transition_portal_support_ticket_alias',
      to_regprocedure('public.transition_portal_support_ticket(uuid,portal_ticket_status)') IS NOT NULL,
      'DEPRECATED contract-drift alias'),
    ('fn:admin_dashboard_stats',
      to_regprocedure('public.admin_dashboard_stats()') IS NOT NULL, 'dashboard'),
    ('fn:admin_work_queue',
      to_regprocedure('public.admin_work_queue(integer,timestamptz,text[])') IS NOT NULL, 'work queue'),
    ('fn:approve_partner_commission',
      to_regprocedure('public.approve_partner_commission(uuid,text,text)') IS NOT NULL, 'approve'),
    ('fn:reject_partner_commission',
      to_regprocedure('public.reject_partner_commission(uuid,text,text)') IS NOT NULL, 'reject'),
    ('fn:suspend_partner',
      to_regprocedure('public.suspend_partner(uuid,text,text)') IS NOT NULL, 'suspend'),
    ('fn:reactivate_partner',
      to_regprocedure('public.reactivate_partner(uuid,text,text)') IS NOT NULL, 'reactivate'),
    ('fn:admin_list_products',
      to_regprocedure('public.admin_list_products(integer,timestamptz,text)') IS NOT NULL, 'products'),
    ('fn:admin_list_partners',
      to_regprocedure('public.admin_list_partners(integer,timestamptz,text)') IS NOT NULL, 'partners'),
    ('fn:admin_list_customers',
      to_regprocedure('public.admin_list_customers(integer,timestamptz,text)') IS NOT NULL, 'customers'),
    ('fn:admin_list_projects',
      to_regprocedure('public.admin_list_projects(integer,timestamptz,text)') IS NOT NULL, 'projects'),
    ('fn:admin_list_quotes',
      to_regprocedure('public.admin_list_quotes(integer,timestamptz,text)') IS NOT NULL, 'quotes'),
    ('fn:admin_list_invoices',
      to_regprocedure('public.admin_list_invoices(integer,timestamptz,text)') IS NOT NULL, 'invoices'),
    ('fn:admin_list_appointments',
      to_regprocedure('public.admin_list_appointments(integer,timestamptz,text)') IS NOT NULL, 'appointments'),
    ('fn:admin_get_settings_summary',
      to_regprocedure('public.admin_get_settings_summary()') IS NOT NULL, 'settings'),
    ('fn:admin_get_security_status',
      to_regprocedure('public.admin_get_security_status()') IS NOT NULL, 'security'),
    ('secdef:admin_mutations',
      NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname IN ('approve_partner_commission', 'reject_partner_commission',
                            'suspend_partner', 'reactivate_partner')
          AND (p.prosecdef IS NOT TRUE
               OR p.proconfig IS NULL
               OR NOT EXISTS (
                 SELECT 1 FROM unnest(p.proconfig) cfg WHERE cfg ILIKE 'search_path=public%'
               ))
      ), 'SECURITY DEFINER + search_path=public'),
    ('grants:anon_denied',
      NOT has_function_privilege('anon', 'public.approve_partner_commission(uuid,text,text)', 'EXECUTE')
      AND NOT has_function_privilege('anon', 'public.admin_dashboard_stats()', 'EXECUTE'),
      'anon has no admin surface'),
    ('grants:authenticated_allowed',
      has_function_privilege('authenticated', 'public.admin_dashboard_stats()', 'EXECUTE')
      AND has_function_privilege('authenticated', 'public.admin_work_queue(integer,timestamptz,text[])', 'EXECUTE'),
      'authenticated may call (function enforces role)'),
    ('confirm_partner_sale:no_ledger',
      EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'confirm_partner_sale'
          AND p.prosrc NOT LIKE '%_partner_post_ledger%'
      ), 'accrual moved to approve_partner_commission'),
    ('approve_partner_commission:posts_ledger',
      EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'approve_partner_commission'
          AND p.prosrc LIKE '%COMMISSION_ACCRUAL%'
      ), 'single accrual boundary'),
    ('no_payout_mutation_added',
      NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname IN ('approve_partner_commission', 'reject_partner_commission',
                            'suspend_partner', 'reactivate_partner',
                            'admin_dashboard_stats', 'admin_work_queue')
          AND (p.prosrc LIKE '%partner_payouts%'
               OR p.prosrc LIKE '%approve_partner_payout_request%'
               OR p.prosrc LIKE '%record_partner_payout_paid%')
      ), 'admin surface never mutates payouts'),
    -- ACL hardening: internal helpers must not be client-callable
    ('acl:admin_idempotency_get_anon_deny',
      NOT has_function_privilege('anon', 'public.admin_idempotency_get(text,text)', 'EXECUTE'),
      'anon cannot execute idempotency get'),
    ('acl:admin_idempotency_get_authenticated_deny',
      NOT has_function_privilege('authenticated', 'public.admin_idempotency_get(text,text)', 'EXECUTE'),
      'authenticated cannot execute idempotency get'),
    ('acl:admin_idempotency_get_service_role_deny',
      NOT has_function_privilege('service_role', 'public.admin_idempotency_get(text,text)', 'EXECUTE'),
      'service_role cannot execute idempotency get (owner-only)'),
    ('acl:admin_idempotency_put_anon_deny',
      NOT has_function_privilege('anon', 'public.admin_idempotency_put(text,text,uuid,text,uuid,jsonb)', 'EXECUTE'),
      'anon cannot execute idempotency put'),
    ('acl:admin_idempotency_put_authenticated_deny',
      NOT has_function_privilege('authenticated', 'public.admin_idempotency_put(text,text,uuid,text,uuid,jsonb)', 'EXECUTE'),
      'authenticated cannot execute idempotency put'),
    ('acl:admin_idempotency_put_service_role_deny',
      NOT has_function_privilege('service_role', 'public.admin_idempotency_put(text,text,uuid,text,uuid,jsonb)', 'EXECUTE'),
      'service_role cannot execute idempotency put (owner-only)'),
    ('acl:admin_idempotency_get_no_unexpected_grantee',
      (
        SELECT
          p.proacl IS NOT NULL
          AND NOT EXISTS (
            SELECT 1
            FROM aclexplode(p.proacl) a
            LEFT JOIN pg_roles r ON r.oid = a.grantee
            WHERE a.privilege_type = 'EXECUTE'
              AND (
                a.grantee = 0
                OR COALESCE(r.rolname, '') NOT IN ('postgres')
              )
          )
        FROM pg_proc p
        WHERE p.oid = 'public.admin_idempotency_get(text,text)'::regprocedure
      ),
      'only postgres may hold EXECUTE on get; PUBLIC forbidden'),
    ('acl:admin_idempotency_put_no_unexpected_grantee',
      (
        SELECT
          p.proacl IS NOT NULL
          AND NOT EXISTS (
            SELECT 1
            FROM aclexplode(p.proacl) a
            LEFT JOIN pg_roles r ON r.oid = a.grantee
            WHERE a.privilege_type = 'EXECUTE'
              AND (
                a.grantee = 0
                OR COALESCE(r.rolname, '') NOT IN ('postgres')
              )
          )
        FROM pg_proc p
        WHERE p.oid = 'public.admin_idempotency_put(text,text,uuid,text,uuid,jsonb)'::regprocedure
      ),
      'only postgres may hold EXECUTE on put; PUBLIC forbidden'),
    ('acl:admin_idempotency_owner_can_execute',
      has_function_privilege(
        (SELECT pg_get_userbyid(p.proowner)
         FROM pg_proc p
         WHERE p.oid = 'public.admin_idempotency_get(text,text)'::regprocedure),
        'public.admin_idempotency_get(text,text)',
        'EXECUTE'
      )
      AND has_function_privilege(
        (SELECT pg_get_userbyid(p.proowner)
         FROM pg_proc p
         WHERE p.oid = 'public.admin_idempotency_put(text,text,uuid,text,uuid,jsonb)'::regprocedure),
        'public.admin_idempotency_put(text,text,uuid,text,uuid,jsonb)',
        'EXECUTE'
      ),
      'function owner retains EXECUTE')
  ) AS t(check_name, ok, detail);
END;
$$;

REVOKE ALL ON FUNCTION public.verify_admin_control_surface_contracts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_admin_control_surface_contracts() TO authenticated, service_role;

COMMENT ON FUNCTION public.verify_admin_control_surface_contracts() IS
  'rc.4 — presence, hardening, money-boundary and internal-helper ACL checks for the admin control surface.';
