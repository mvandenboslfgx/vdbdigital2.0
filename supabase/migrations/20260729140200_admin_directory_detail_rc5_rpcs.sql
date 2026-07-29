-- STATUS: LOCAL ONLY — admin directory detail RPCs rc.5
-- Contract: vdb-backend-contract@0.2.0-rc.5
-- schemaVersion: 2026.07.29.partner-identity-directory-rc5
-- Target: staging only after local verify. Production NOT authorized.
--
-- Depends on 20260729140000 (identity columns) and 20260729140100 (checklist).
--
-- Every RPC in this file is read-only, staff-gated and returns an explicit
-- column list (never SELECT *). Error contract:
--   AUTH_REQUIRED — no auth.uid()
--   FORBIDDEN     — caller is not staff (list_portal_support_ticket_replies
--                   additionally admits org members of the ticket)
--   NOT_FOUND     — resource does not exist
--
-- Deliberately never returned: products.cost_cents and supplier data, customer
-- email/phone/VAT/KvK/address, quote customer_note, appointment meeting_link
-- and attendee identities.

-- ---------------------------------------------------------------------------
-- admin_get_product
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_product(p_product_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.is_staff_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  SELECT p.id, p.slug, p.name, p.status, p.short_description,
         p.price_cents, p.from_price_cents, p.currency, p.price_mode,
         p.price_status, p.publication_ready, p.legal_status,
         p.partner_enabled, p.partner_visibility, p.partner_commission_status,
         p.partner_availability, p.featured, p.updated_at, p.created_at
  INTO v_row
  FROM public.products p
  WHERE p.id = p_product_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'slug', v_row.slug,
    'name', v_row.name,
    'status', v_row.status::text,
    'summary', v_row.short_description,
    'price_cents', v_row.price_cents,
    'from_price_cents', v_row.from_price_cents,
    'currency', COALESCE(v_row.currency, 'EUR'),
    'price_mode', v_row.price_mode::text,
    'publication_ready', v_row.publication_ready,
    'legal_status', v_row.legal_status::text,
    'partner_enabled', v_row.partner_enabled,
    'partner_visibility', v_row.partner_visibility,
    'partner_commission_status', v_row.partner_commission_status,
    'partner_availability', v_row.partner_availability,
    'featured', v_row.featured,
    'updated_at', v_row.updated_at,
    'created_at', v_row.created_at,
    'eligibility', jsonb_build_object(
      'public_eligible',
        COALESCE(v_row.publication_ready, false)
        AND v_row.legal_status::text IN ('APPROVED_FOR_B2B', 'APPROVED_FOR_B2C', 'APPROVED_FOR_BOTH'),
      'partner_eligible',
        COALESCE(v_row.partner_enabled, false)
        AND v_row.partner_visibility IN ('all_active', 'campaign', 'quote_only', 'requestable'),
      'legal_review_status', v_row.legal_status::text,
      'price_status', v_row.price_status::text,
      'visibility', v_row.partner_visibility,
      'commission_status', v_row.partner_commission_status,
      'inventory_status', v_row.partner_availability
    ),
    'schema_version', '2026.07.29.partner-identity-directory-rc5'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_product(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_get_product(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_get_product(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_get_product(uuid) IS
  'rc.5 — staff product detail. cost_cents, margins and supplier data are never selected. eligibility mirrors the publish/partner gates without granting them.';

-- ---------------------------------------------------------------------------
-- admin_get_partner
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_partner(p_partner_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.is_staff_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  SELECT pp.id, pp.user_id, pp.status, pp.display_name, pp.legal_name,
         pp.partner_type, pp.type_classification_status, pp.payout_eligible,
         pp.compliance_status, pp.age_verification_status, pp.age_verified_at,
         pp.age_verification_expires_at, pp.identity_verification_status,
         pp.identity_verified_at, pp.business_verification_status,
         pp.business_verified_at, pp.payout_profile_status, pp.payout_profile_updated_at,
         pp.staff_approved_at, pp.legacy_activation_grandfathered,
         pp.activation_block_codes, pp.required_agreement_type, pp.required_agreement_version,
         pp.suspended_at, pp.created_at, pp.updated_at
  INTO v_row
  FROM public.partner_profiles pp
  WHERE pp.id = p_partner_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'user_id', v_row.user_id,
    'status', v_row.status::text,
    'display_name', v_row.display_name,
    'legal_name', v_row.legal_name,
    'partner_type', v_row.partner_type::text,
    'type_classification_status', v_row.type_classification_status::text,
    'payout_eligible', v_row.payout_eligible,
    'compliance_status', v_row.compliance_status,
    'age_verification_status', v_row.age_verification_status::text,
    'age_verified_at', v_row.age_verified_at,
    'age_verification_expires_at', v_row.age_verification_expires_at,
    'identity_verification_status', v_row.identity_verification_status::text,
    'identity_verified_at', v_row.identity_verified_at,
    'business_verification_status', v_row.business_verification_status::text,
    'business_verified_at', v_row.business_verified_at,
    'payout_profile_status', v_row.payout_profile_status::text,
    'payout_profile_updated_at', v_row.payout_profile_updated_at,
    'staff_approved_at', v_row.staff_approved_at,
    'legacy_activation_grandfathered', v_row.legacy_activation_grandfathered,
    'activation_block_codes', to_jsonb(v_row.activation_block_codes),
    'required_agreement_type', v_row.required_agreement_type::text,
    'required_agreement_version', v_row.required_agreement_version,
    'suspended_at', v_row.suspended_at,
    'created_at', v_row.created_at,
    'updated_at', v_row.updated_at,
    'activation_checklist', public.partner_activation_checklist(p_partner_id),
    'schema_version', '2026.07.29.partner-identity-directory-rc5'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_partner(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_get_partner(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_get_partner(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_get_partner(uuid) IS
  'rc.5 — staff partner detail including the live activation checklist. No email address and no balances.';

-- ---------------------------------------------------------------------------
-- admin_get_customer (organization)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_customer(p_organization_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
  v_projects bigint := 0;
  v_open_tickets bigint := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.is_staff_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  -- contact_email, contact_phone, kvk_number, vat_number and invoice_address
  -- are intentionally not selected.
  SELECT o.id, o.legal_name, o.trade_name, o.type AS org_type, o.status,
         o.created_at, o.updated_at
  INTO v_row
  FROM public.organizations o
  WHERE o.id = p_organization_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  SELECT COUNT(*) INTO v_projects
  FROM public.portal_projects pr
  WHERE pr.organization_id = p_organization_id;

  SELECT COUNT(*) INTO v_open_tickets
  FROM public.portal_support_tickets t
  WHERE t.organization_id = p_organization_id
    AND t.status IN ('NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_VDB');

  RETURN jsonb_build_object(
    'id', v_row.id,
    'name', COALESCE(NULLIF(btrim(v_row.trade_name), ''), v_row.legal_name),
    'legal_name', v_row.legal_name,
    'trade_name', v_row.trade_name,
    'type', v_row.org_type::text,
    'status', v_row.status::text,
    'project_count', COALESCE(v_projects, 0),
    'open_ticket_count', COALESCE(v_open_tickets, 0),
    'created_at', v_row.created_at,
    'updated_at', v_row.updated_at,
    'schema_version', '2026.07.29.partner-identity-directory-rc5'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_customer(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_get_customer(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_get_customer(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_get_customer(uuid) IS
  'rc.5 — staff customer detail with counters only. No email, phone, VAT/KvK or address.';

-- ---------------------------------------------------------------------------
-- admin_get_project
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_project(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
  v_quotes bigint := 0;
  v_invoices bigint := 0;
  v_appointments bigint := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.is_staff_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  SELECT pr.id, pr.organization_id, pr.name, pr.status, pr.priority,
         pr.progress_percent, pr.created_at, pr.updated_at,
         COALESCE(NULLIF(btrim(o.trade_name), ''), o.legal_name) AS customer_label
  INTO v_row
  FROM public.portal_projects pr
  LEFT JOIN public.organizations o ON o.id = pr.organization_id
  WHERE pr.id = p_project_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  SELECT COUNT(*) INTO v_quotes
  FROM public.portal_quotes q WHERE q.project_id = p_project_id;

  SELECT COUNT(*) INTO v_invoices
  FROM public.portal_invoices i WHERE i.project_id = p_project_id;

  SELECT COUNT(*) INTO v_appointments
  FROM public.portal_appointments a WHERE a.project_id = p_project_id;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'organization_id', v_row.organization_id,
    'name', v_row.name,
    'status', v_row.status::text,
    'priority', v_row.priority,
    'progress_percent', v_row.progress_percent,
    'customer_label', v_row.customer_label,
    'updated_at', v_row.updated_at,
    'created_at', v_row.created_at,
    'quote_count', COALESCE(v_quotes, 0),
    'invoice_count', COALESCE(v_invoices, 0),
    'appointment_count', COALESCE(v_appointments, 0),
    'schema_version', '2026.07.29.partner-identity-directory-rc5'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_project(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_get_project(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_get_project(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_get_project(uuid) IS
  'rc.5 — staff project detail. Related records are exposed as counts only.';

-- ---------------------------------------------------------------------------
-- admin_get_quote
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_quote(p_quote_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
  v_items jsonb := '[]'::jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.is_staff_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  -- customer_note, decline_reason and document paths stay out of the payload.
  SELECT q.id, q.organization_id, q.project_id, q.quote_number, q.title, q.status,
         q.currency, q.subtotal_cents, q.vat_cents, q.discount_cents, q.total_cents,
         q.valid_until, q.accepted_at, q.declined_at, q.created_at, q.updated_at
  INTO v_row
  FROM public.portal_quotes q
  WHERE q.id = p_quote_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  WITH items AS (
    SELECT qi.id, qi.title, qi.quantity, qi.unit_price_cents, qi.total_cents,
           qi.sort_order
    FROM public.portal_quote_items qi
    WHERE qi.quote_id = p_quote_id
    ORDER BY qi.sort_order ASC, qi.id ASC
    LIMIT 50
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'label', title,
        'quantity', quantity,
        'unit_price_cents', unit_price_cents,
        'total_cents', total_cents
      )
      ORDER BY sort_order ASC, id ASC
    ),
    '[]'::jsonb
  )
  INTO v_items
  FROM items;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'organization_id', v_row.organization_id,
    'project_id', v_row.project_id,
    'quote_number', v_row.quote_number,
    'title', v_row.title,
    'status', v_row.status::text,
    'currency', v_row.currency,
    'totals', jsonb_build_object(
      'subtotal_cents', v_row.subtotal_cents,
      'vat_cents', v_row.vat_cents,
      'discount_cents', v_row.discount_cents,
      'total_cents', v_row.total_cents
    ),
    'valid_until', v_row.valid_until,
    'accepted_at', v_row.accepted_at,
    'declined_at', v_row.declined_at,
    'created_at', v_row.created_at,
    'updated_at', v_row.updated_at,
    'items', v_items,
    'items_truncated', (SELECT COUNT(*) > 50 FROM public.portal_quote_items qi WHERE qi.quote_id = p_quote_id),
    'schema_version', '2026.07.29.partner-identity-directory-rc5'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_quote(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_get_quote(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_get_quote(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_get_quote(uuid) IS
  'rc.5 — staff quote detail with at most 50 line items. customer_note is never returned.';

-- ---------------------------------------------------------------------------
-- admin_get_invoice
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_invoice(p_invoice_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.is_staff_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  SELECT i.id, i.organization_id, i.project_id, i.quote_id, i.invoice_number,
         i.invoice_type, i.status, i.currency,
         i.subtotal_cents, i.vat_cents, i.discount_cents, i.total_cents,
         i.amount_paid_cents, i.amount_due_cents,
         i.issue_date, i.due_date, i.paid_at, i.created_at, i.updated_at
  INTO v_row
  FROM public.portal_invoices i
  WHERE i.id = p_invoice_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'organization_id', v_row.organization_id,
    'project_id', v_row.project_id,
    'quote_id', v_row.quote_id,
    'invoice_number', v_row.invoice_number,
    'invoice_type', v_row.invoice_type::text,
    'status', v_row.status::text,
    'currency', v_row.currency,
    'totals', jsonb_build_object(
      'subtotal_cents', v_row.subtotal_cents,
      'vat_cents', v_row.vat_cents,
      'discount_cents', v_row.discount_cents,
      'total_cents', v_row.total_cents,
      'amount_paid_cents', v_row.amount_paid_cents,
      'amount_due_cents', v_row.amount_due_cents
    ),
    'issue_date', v_row.issue_date,
    'due_date', v_row.due_date,
    'paid_at', v_row.paid_at,
    'created_at', v_row.created_at,
    'updated_at', v_row.updated_at,
    'schema_version', '2026.07.29.partner-identity-directory-rc5'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_invoice(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_get_invoice(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_get_invoice(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_get_invoice(uuid) IS
  'rc.5 — staff invoice detail. Read-only: no payment, reversal or provider fields are mutated, and none are exposed.';

-- ---------------------------------------------------------------------------
-- admin_get_appointment
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_appointment(p_appointment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.is_staff_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  -- meeting_link and attendee identities are never selected. The appointments
  -- feature flag gates booking mutations only: staff reads stay available.
  SELECT a.id, a.organization_id, a.project_id, a.status, a.appointment_type,
         a.starts_at, a.ends_at, a.timezone AS tz, a.title, a.location,
         a.cancelled_at, a.created_at, a.updated_at
  INTO v_row
  FROM public.portal_appointments a
  WHERE a.id = p_appointment_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'organization_id', v_row.organization_id,
    'project_id', v_row.project_id,
    'status', v_row.status::text,
    'appointment_type', v_row.appointment_type::text,
    'starts_at', v_row.starts_at,
    'ends_at', v_row.ends_at,
    'timezone', v_row.tz,
    'title', v_row.title,
    'location', v_row.location,
    -- portal_appointments.notes has no customer-visibility marker, so it is
    -- treated as internal and reported as NULL until such a column exists.
    'notes_customer_safe', NULL::text,
    'cancelled_at', v_row.cancelled_at,
    'created_at', v_row.created_at,
    'updated_at', v_row.updated_at,
    'schema_version', '2026.07.29.partner-identity-directory-rc5'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_appointment(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_get_appointment(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_get_appointment(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_get_appointment(uuid) IS
  'rc.5 — staff appointment detail. Never returns meeting_link, attendee emails or internal notes. Reads are not gated by appointments_booking (that flag gates mutations).';

-- ---------------------------------------------------------------------------
-- list_portal_support_ticket_replies
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_portal_support_ticket_replies(
  p_ticket_id uuid,
  p_limit int DEFAULT 50,
  p_cursor timestamptz DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_limit int := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100);
  v_org_id uuid;
  v_is_staff boolean;
  v_items jsonb := '[]'::jsonb;
  v_count int := 0;
  v_next timestamptz;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;

  SELECT t.organization_id INTO v_org_id
  FROM public.portal_support_tickets t
  WHERE t.id = p_ticket_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  v_is_staff := public.is_staff_admin();

  -- Ticket isolation: staff, or an active member of the ticket's organization.
  -- A partner without staff rights has no path here.
  IF NOT v_is_staff AND NOT public.is_org_member(v_org_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  WITH page AS (
    SELECT r.id, r.ticket_id, r.body, r.is_internal, r.created_at, r.author_user_id
    FROM public.portal_support_replies r
    WHERE r.ticket_id = p_ticket_id
      AND (v_is_staff OR r.is_internal = false)
      AND (p_cursor IS NULL OR r.created_at < p_cursor)
    ORDER BY r.created_at DESC, r.id DESC
    LIMIT v_limit
  )
  SELECT
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', id,
          'ticket_id', ticket_id,
          'body', body,
          'is_internal', is_internal,
          'created_at', created_at,
          'author_user_id', author_user_id
        )
        ORDER BY created_at DESC, id DESC
      ),
      '[]'::jsonb
    ),
    COUNT(*)::int,
    MIN(created_at)
  INTO v_items, v_count, v_next
  FROM page;

  IF v_count < v_limit THEN v_next := NULL; END IF;

  RETURN jsonb_build_object(
    'items', v_items,
    'next_cursor', v_next,
    'schema_version', '2026.07.29.partner-identity-directory-rc5'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.list_portal_support_ticket_replies(uuid, int, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_portal_support_ticket_replies(uuid, int, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.list_portal_support_ticket_replies(uuid, int, timestamptz)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.list_portal_support_ticket_replies(uuid, int, timestamptz) IS
  'rc.5 — replies for one ticket. Staff see internal notes; org members see public replies only; everyone else is FORBIDDEN. Keyset paging on created_at DESC, id DESC.';

-- ---------------------------------------------------------------------------
-- verify_messaging_support_appointments_contracts
--
-- Only one check changes versus 20260725120100: support_internal_notes_rpc is
-- now asserted to EXIST (default false in migration) instead of being asserted
-- false forever, so an operator may enable it on staging without failing the
-- rc.3 verifier. Every other check is carried over unchanged.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_messaging_support_appointments_contracts()
RETURNS TABLE(check_name text, ok boolean, detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM (VALUES
    ('table:portal_conversations', to_regclass('public.portal_conversations') IS NOT NULL, 'portal_conversations'),
    ('table:portal_conversation_participants', to_regclass('public.portal_conversation_participants') IS NOT NULL, 'portal_conversation_participants'),
    ('table:portal_messages', to_regclass('public.portal_messages') IS NOT NULL, 'portal_messages'),
    ('table:portal_message_attachments', to_regclass('public.portal_message_attachments') IS NOT NULL, 'portal_message_attachments'),
    ('table:portal_support_tickets', to_regclass('public.portal_support_tickets') IS NOT NULL, 'portal_support_tickets'),
    ('table:portal_support_replies', to_regclass('public.portal_support_replies') IS NOT NULL, 'portal_support_replies'),
    ('table:portal_appointments', to_regclass('public.portal_appointments') IS NOT NULL, 'portal_appointments'),
    ('table:portal_appointment_participants', to_regclass('public.portal_appointment_participants') IS NOT NULL, 'portal_appointment_participants'),
    -- rc.2 surfaces intact
    ('table:portal_projects', to_regclass('public.portal_projects') IS NOT NULL, 'portal_projects'),
    ('table:portal_quotes', to_regclass('public.portal_quotes') IS NOT NULL, 'portal_quotes'),
    ('table:portal_invoices', to_regclass('public.portal_invoices') IS NOT NULL, 'portal_invoices'),
    ('table:portal_files', to_regclass('public.portal_files') IS NOT NULL, 'portal_files'),
    ('table:partner_commissions', to_regclass('public.partner_commissions') IS NOT NULL, 'partner_commissions'),
    ('col:portal_conversations.conversation_type',
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='portal_conversations' AND column_name='conversation_type'),
      'conversation_type'),
    ('col:portal_messages.idempotency_key',
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='portal_messages' AND column_name='idempotency_key'),
      'idempotency_key'),
    ('enum:portal_ticket_status.NEW',
      EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='portal_ticket_status' AND e.enumlabel='NEW'),
      'NEW'),
    ('rls:portal_messages', (SELECT relrowsecurity FROM pg_class WHERE oid='public.portal_messages'::regclass), 'rls on'),
    ('rls:portal_message_attachments', (SELECT relrowsecurity FROM pg_class WHERE oid='public.portal_message_attachments'::regclass), 'rls on'),
    ('rls:portal_appointments', (SELECT relrowsecurity FROM pg_class WHERE oid='public.portal_appointments'::regclass), 'rls on'),
    ('rpc:create_portal_conversation', to_regprocedure('public.create_portal_conversation(uuid,text,portal_conversation_type,uuid,uuid,uuid[])') IS NOT NULL, 'create'),
    ('rpc:send_portal_message', to_regprocedure('public.send_portal_message(uuid,text,text,text,boolean)') IS NOT NULL, 'send'),
    ('rpc:mark_portal_conversation_read', to_regprocedure('public.mark_portal_conversation_read(uuid,timestamptz)') IS NOT NULL, 'mark_read'),
    ('rpc:manage_portal_conversation_participant', to_regprocedure('public.manage_portal_conversation_participant(uuid,uuid,text,text)') IS NOT NULL, 'manage'),
    ('rpc:assign_portal_support_ticket', to_regprocedure('public.assign_portal_support_ticket(uuid,uuid)') IS NOT NULL, 'assign'),
    ('rpc:reply_portal_support_ticket', to_regprocedure('public.reply_portal_support_ticket(uuid,text)') IS NOT NULL, 'reply'),
    ('rpc:add_portal_support_internal_note', to_regprocedure('public.add_portal_support_internal_note(uuid,text)') IS NOT NULL, 'internal_note'),
    ('rpc:transition_portal_support_ticket_status', to_regprocedure('public.transition_portal_support_ticket_status(uuid,portal_ticket_status)') IS NOT NULL, 'transition'),
    ('rpc:book_portal_appointment', to_regprocedure('public.book_portal_appointment(uuid,text,timestamptz,timestamptz,text,portal_appointment_type,uuid,text,text,uuid[],text)') IS NOT NULL, 'book'),
    ('rpc:reschedule_portal_appointment', to_regprocedure('public.reschedule_portal_appointment(uuid,timestamptz,timestamptz,int)') IS NOT NULL, 'reschedule'),
    ('rpc:cancel_portal_appointment', to_regprocedure('public.cancel_portal_appointment(uuid,text)') IS NOT NULL, 'cancel'),
    ('flag:messaging_realtime_false',
      EXISTS (SELECT 1 FROM public.feature_flags WHERE key='messaging_realtime' AND enabled=false), 'fail-closed'),
    ('flag:support_internal_notes_rpc_exists',
      EXISTS (SELECT 1 FROM public.feature_flags WHERE key='support_internal_notes_rpc'),
      'rc.5 — flag row must exist (migration default false); staging operators may enable it'),
    ('flag:appointments_booking_false',
      EXISTS (SELECT 1 FROM public.feature_flags WHERE key='appointments_booking' AND enabled=false), 'fail-closed')
  ) AS t(check_name, ok, detail);
END;
$$;

REVOKE ALL ON FUNCTION public.verify_messaging_support_appointments_contracts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_messaging_support_appointments_contracts() TO authenticated, service_role;

COMMENT ON FUNCTION public.verify_messaging_support_appointments_contracts() IS
  'rc.3 checks carried into rc.5; support_internal_notes_rpc is now an existence check so staging can enable the flag without failing verification.';
;
