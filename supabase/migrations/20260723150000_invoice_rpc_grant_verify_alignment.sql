-- =============================================================================
-- Align invoice financial contract verifier with service_role-only RPC grants.
-- Forward-only; does not alter older migrations.
-- App path: requirePermission + service_role client (see invoice-actions.ts).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.verify_invoices_financial_contracts()
RETURNS TABLE (check_name text, ok boolean, detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT 'table:portal_invoices'::text,
    to_regclass('public.portal_invoices') IS NOT NULL, 'portal_invoices';
  RETURN QUERY SELECT 'table:portal_invoice_items'::text,
    to_regclass('public.portal_invoice_items') IS NOT NULL, 'items';
  RETURN QUERY SELECT 'table:portal_invoice_versions'::text,
    to_regclass('public.portal_invoice_versions') IS NOT NULL, 'versions';
  RETURN QUERY SELECT 'table:portal_invoice_payment_records'::text,
    to_regclass('public.portal_invoice_payment_records') IS NOT NULL, 'payment_records';
  RETURN QUERY SELECT 'fn:issue_portal_invoice'::text,
    to_regprocedure('public.issue_portal_invoice(uuid,integer)') IS NOT NULL, 'issue RPC';
  RETURN QUERY SELECT 'fn:record_portal_invoice_payment'::text,
    to_regprocedure('public.record_portal_invoice_payment(uuid,integer,integer,text,date,public.portal_invoice_payment_method,text,text,text)') IS NOT NULL,
    'record payment RPC';
  RETURN QUERY SELECT 'fn:reverse_portal_invoice_payment'::text,
    to_regprocedure('public.reverse_portal_invoice_payment(uuid,uuid,integer,text,text,text)') IS NOT NULL,
    'reverse payment RPC';
  RETURN QUERY SELECT 'fn:can_reverse_invoice_payment'::text,
    to_regprocedure('public.can_reverse_invoice_payment()') IS NOT NULL,
    'reverse permission helper';
  RETURN QUERY SELECT 'fn:recompute_portal_invoice_status_from_payments'::text,
    to_regprocedure('public.recompute_portal_invoice_status_from_payments(public.portal_invoice_status,integer,integer,date,timestamp with time zone)') IS NOT NULL,
    'status recompute';
  RETURN QUERY SELECT 'fn:generate_portal_invoice_number'::text,
    to_regprocedure('public.generate_portal_invoice_number(public.portal_invoice_type)') IS NOT NULL, 'numbering';

  RETURN QUERY SELECT 'reverse_rpc:security_definer'::text,
    EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'reverse_portal_invoice_payment'
        AND p.prosecdef IS TRUE
    ), 'SECURITY DEFINER';
  RETURN QUERY SELECT 'reverse_rpc:search_path'::text,
    EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'reverse_portal_invoice_payment'
        AND p.proconfig IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM unnest(p.proconfig) cfg
          WHERE cfg ILIKE 'search_path=public%'
        )
    ), 'search_path=public';
  -- Hardened: anon + authenticated denied; service_role only (app authorizes first).
  RETURN QUERY SELECT 'reverse_rpc:execute_grants_minimal'::text,
    NOT has_function_privilege('anon', 'public.reverse_portal_invoice_payment(uuid,uuid,integer,text,text,text)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.reverse_portal_invoice_payment(uuid,uuid,integer,text,text,text)', 'EXECUTE')
    AND has_function_privilege('service_role', 'public.reverse_portal_invoice_payment(uuid,uuid,integer,text,text,text)', 'EXECUTE'),
    'anon+authenticated denied; service_role only';

  RETURN QUERY SELECT 'col:reversal_reason'::text,
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'portal_invoice_payment_records'
        AND column_name = 'reversal_reason'
    ), 'reversal_reason';
  RETURN QUERY SELECT 'col:reversal_idempotency_key'::text,
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'portal_invoice_payment_records'
        AND column_name = 'reversal_idempotency_key'
    ), 'reversal_idempotency_key';
  RETURN QUERY SELECT 'idx:reversal_idempotency_unique'::text,
    EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'portal_invoice_payment_records'
        AND indexname = 'uq_portal_invoice_payment_reversal_idempotency'
    ), 'unique idempotency';
  RETURN QUERY SELECT 'trg:payment_record_immutable'::text,
    EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = 'trg_protect_portal_invoice_payment_record'
        AND NOT tgisinternal
    ), 'immutable history trigger';

  RETURN QUERY SELECT 'rls:portal_invoices'::text,
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.portal_invoices'::regclass), 'RLS';
  RETURN QUERY SELECT 'rls:portal_invoice_items'::text,
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.portal_invoice_items'::regclass), 'RLS';
  RETURN QUERY SELECT 'rls:portal_invoice_versions'::text,
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.portal_invoice_versions'::regclass), 'RLS';
  RETURN QUERY SELECT 'rls:portal_invoice_payment_records'::text,
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.portal_invoice_payment_records'::regclass), 'RLS';
  RETURN QUERY SELECT 'anon_deny:portal_invoices'::text,
    EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'portal_invoices'
        AND policyname = 'portal_invoices_anon_deny'
    ), 'anon';
  RETURN QUERY SELECT 'col:portal_invoices.amount_due_cents'::text,
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'portal_invoices' AND column_name = 'amount_due_cents'
    ), 'amount_due';
  RETURN QUERY SELECT 'col:portal_invoices.quote_id'::text,
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'portal_invoices' AND column_name = 'quote_id'
    ), 'quote link';
  RETURN QUERY SELECT 'bucket:invoice-documents'::text,
    EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'invoice-documents' AND public = false),
    'private bucket';
  RETURN QUERY SELECT 'no_mollie_coupling'::text,
    NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('portal_invoices','portal_invoice_payment_records')
        AND column_name IN ('mollie_payment_id','checkout_session_id','payment_provider_id','provider_refund_id')
    ), 'no provider payment/refund columns';
  RETURN QUERY SELECT 'no_provider_refund_rpc'::text,
    to_regprocedure('public.refund_mollie_payment(uuid)') IS NULL
    AND to_regprocedure('public.create_provider_refund(uuid)') IS NULL,
    'no provider refund RPC';
END;
$$;

REVOKE ALL ON FUNCTION public.verify_invoices_financial_contracts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_invoices_financial_contracts() TO service_role;
