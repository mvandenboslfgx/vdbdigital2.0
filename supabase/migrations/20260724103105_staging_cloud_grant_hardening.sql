-- Forward hardening for hosted Supabase default privileges.
-- Hosted projects grant anon/authenticated on new public objects by default;
-- local CLI images often do not. Align remote with contract verifiers.

-- ---------------------------------------------------------------------------
-- Sensitive portal / org / partner tables: revoke all from anon
-- (authenticated retains RLS-gated DML; strip non-DML extras)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.oid::regclass AS rel
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND (
        c.relname LIKE 'portal_%'
        OR c.relname LIKE 'organization_%'
        OR c.relname LIKE 'partner_%'
        OR c.relname IN (
          'orders', 'order_items', 'payments', 'leads',
          'contact_submissions', 'audit_logs', 'admin_roles',
          'site_settings', 'rate_limit_buckets'
        )
      )
  LOOP
    EXECUTE format('REVOKE ALL ON TABLE %s FROM anon', r.rel);
    EXECUTE format(
      'REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE %s FROM authenticated',
      r.rel
    );
  END LOOP;
END $$;

-- Authenticated needs base privileges for RLS via PostgREST on portal tables.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.portal_quotes,
  public.portal_quote_items,
  public.portal_quote_versions,
  public.portal_quote_acceptances,
  public.portal_files,
  public.portal_document_download_events,
  public.portal_projects,
  public.portal_project_members,
  public.portal_project_milestones,
  public.portal_project_deliverables,
  public.portal_project_feedback,
  public.portal_project_actions,
  public.portal_project_activity,
  public.portal_invoices,
  public.portal_invoice_items,
  public.portal_invoice_versions,
  public.portal_invoice_payment_records,
  public.portal_conversations,
  public.portal_conversation_participants,
  public.portal_messages,
  public.portal_support_tickets,
  public.portal_support_replies,
  public.portal_notifications,
  public.organizations,
  public.organization_members,
  public.organization_invitations
TO authenticated;

-- Staff-only notes: authenticated SELECT/write via RLS staff policy
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.organization_internal_notes TO authenticated;

-- Explicit anon deny on contract-checked tables
REVOKE ALL ON TABLE
  public.portal_quotes,
  public.portal_quote_items,
  public.portal_quote_versions,
  public.portal_quote_acceptances,
  public.portal_files,
  public.portal_document_download_events,
  public.portal_projects,
  public.portal_project_members,
  public.portal_project_actions,
  public.portal_project_activity,
  public.portal_invoices,
  public.portal_invoice_items,
  public.portal_invoice_versions,
  public.portal_invoice_payment_records
FROM anon;

-- ---------------------------------------------------------------------------
-- Functions: service_role-only verifiers + invoice financial RPCs
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.portal_verify_customer_contracts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_verify_customer_contracts() TO service_role;

REVOKE ALL ON FUNCTION public.verify_auth_portal_foundation_contracts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_auth_portal_foundation_contracts() TO service_role;

REVOKE ALL ON FUNCTION public.verify_quotes_acceptance_contracts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_quotes_acceptance_contracts() TO service_role;

REVOKE ALL ON FUNCTION public.verify_documents_storage_contracts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_documents_storage_contracts() TO service_role;

REVOKE ALL ON FUNCTION public.verify_invoices_financial_contracts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_invoices_financial_contracts() TO service_role;

REVOKE ALL ON FUNCTION public.verify_partner_admin_contracts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_partner_admin_contracts() TO service_role;

REVOKE ALL ON FUNCTION public.verify_project_management_contracts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_project_management_contracts() TO service_role;

REVOKE ALL ON FUNCTION public.issue_portal_invoice(UUID, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_portal_invoice(UUID, INT) TO service_role;

REVOKE ALL ON FUNCTION public.record_portal_invoice_payment(UUID, INT, INT, TEXT, DATE, public.portal_invoice_payment_method, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_portal_invoice_payment(UUID, INT, INT, TEXT, DATE, public.portal_invoice_payment_method, TEXT, TEXT, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.reverse_portal_invoice_payment(UUID, UUID, INT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_portal_invoice_payment(UUID, UUID, INT, TEXT, TEXT, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.can_reverse_invoice_payment() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_reverse_invoice_payment() TO service_role;

DO $$
BEGIN
  IF to_regprocedure('public.apply_mollie_payment_update(uuid,text,text,text,text,text,text,boolean,boolean,integer)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.apply_mollie_payment_update(uuid,text,text,text,text,text,text,boolean,boolean,integer) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.apply_mollie_payment_update(uuid,text,text,text,text,text,text,boolean,boolean,integer) TO service_role';
  END IF;
  IF to_regprocedure('public.create_order_with_items(jsonb,jsonb)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.create_order_with_items(jsonb,jsonb) FROM PUBLIC, anon';
  END IF;
  IF to_regprocedure('public.p05_verify_payment_contracts(boolean)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.p05_verify_payment_contracts(boolean) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.p05_verify_payment_contracts(boolean) TO service_role';
  END IF;
END $$;

DO $$
DECLARE
  fname text;
BEGIN
  FOREACH fname IN ARRAY ARRAY[
    'public._partner_post_ledger(text,text,uuid,text,text,uuid,jsonb)',
    'public.approve_partner_payout_request(uuid,boolean,text)',
    'public.confirm_partner_sale(uuid,bigint,text,integer,text,uuid,text)',
    'public.process_partner_refund_adjustment(uuid,bigint,text,text,uuid,uuid,text,text)',
    'public.record_partner_cash_receipt(bigint,text,uuid,text,text)',
    'public.record_partner_payout_paid(uuid,text,text)',
    'public.review_partner_application(uuid,boolean,text,text)',
    'public.review_partner_lead(uuid,public.partner_lead_status,text)'
  ]
  LOOP
    IF to_regprocedure(fname) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fname);
    END IF;
  END LOOP;
END $$;

-- Future postgres-owned objects in public: do not auto-grant anon
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon;
