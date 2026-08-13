-- STATUS: LOCAL PASS — staging apply authorized for this gate (production NOT authorized)
-- Contract: vdb-backend-contract@0.2.0-rc.4
-- schemaVersion: 2026.07.29.admin-control-surface-rc4
-- Target: staging qzekuvmgfekzsowdecyk only after local verify.
--
-- Depends on 20260729120000 (helpers, idempotency store, REJECTED enum label).
-- The REJECTED label is written here because PostgreSQL forbids using a new
-- enum value in the transaction that created it.
--
-- Money movement policy for this file:
--   * approve_partner_commission is the ONLY new function that posts a ledger
--     transaction (COMMISSION_ACCRUAL), replacing the accrual that
--     confirm_partner_sale used to perform.
--   * No payout request/approval/payment RPC is created, called or relaxed.
--   * admin_dashboard_stats exposes counts only — no amounts, no PII.

-- ---------------------------------------------------------------------------
-- admin_dashboard_stats — fixed-shape counters for the admin home screen
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_open_applications bigint := 0;
  v_open_tickets bigint := 0;
  v_commissions bigint := 0;
  v_payout_requests bigint := 0;
  v_unread bigint := 0;
  v_documents bigint := 0;
  v_appointments bigint := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.is_staff_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  SELECT COUNT(*) INTO v_open_applications
  FROM public.partner_applications
  WHERE status IN ('SUBMITTED', 'IN_REVIEW');

  SELECT COUNT(*) INTO v_open_tickets
  FROM public.portal_support_tickets
  WHERE status IN ('NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_VDB');

  SELECT COUNT(*) INTO v_commissions
  FROM public.partner_commissions
  WHERE status IN ('PENDING', 'ELIGIBLE');

  -- Read-only counter. Payout mutations stay behind the fail-closed flag.
  SELECT COUNT(*) INTO v_payout_requests
  FROM public.partner_payout_requests
  WHERE status = 'REQUESTED';

  -- Unread for the calling staff member only. Internal notes are in scope
  -- because this RPC is staff-gated.
  SELECT COUNT(*) INTO v_unread
  FROM public.portal_messages m
  JOIN public.portal_conversation_participants p
    ON p.conversation_id = m.conversation_id
   AND p.user_id = v_uid
  WHERE p.removed_at IS NULL
    AND m.deleted_at IS NULL
    AND m.author_user_id IS DISTINCT FROM v_uid
    AND (p.last_read_at IS NULL OR m.created_at > p.last_read_at);

  SELECT COUNT(*) INTO v_documents
  FROM public.portal_files
  WHERE status = 'QUARANTINED'
     OR scan_status IN ('PENDING', 'SUSPICIOUS', 'INFECTED');

  -- Europe/Amsterdam is the operator display timezone; the cutoff itself is an
  -- absolute-time comparison so DST never shifts the boundary.
  SELECT COUNT(*) INTO v_appointments
  FROM public.portal_appointments
  WHERE status IN ('SCHEDULED', 'CONFIRMED', 'RESCHEDULED')
    AND starts_at >= NOW();

  RETURN jsonb_build_object(
    'open_partner_applications', COALESCE(v_open_applications, 0),
    'open_tickets', COALESCE(v_open_tickets, 0),
    'commissions_under_review', COALESCE(v_commissions, 0),
    'payout_requests', COALESCE(v_payout_requests, 0),
    'unread_messages', COALESCE(v_unread, 0),
    'documents_pending_review', COALESCE(v_documents, 0),
    'upcoming_appointments', COALESCE(v_appointments, 0),
    'generated_at', NOW(),
    'schema_version', '2026.07.29.admin-control-surface-rc4'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_dashboard_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats() TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_dashboard_stats() IS
  'rc.4 — staff dashboard counters. Fixed key set, zero-filled, no amounts and no PII. Payout requests are counted only.';

-- ---------------------------------------------------------------------------
-- admin_work_queue — unified triage feed
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_work_queue(
  p_limit int DEFAULT 25,
  p_cursor timestamptz DEFAULT NULL,
  p_types text[] DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit int := LEAST(GREATEST(COALESCE(p_limit, 25), 1), 100);
  v_items jsonb := '[]'::jsonb;
  v_count int := 0;
  v_next timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.is_staff_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  WITH queue AS (
    SELECT
      a.id,
      'partner_application'::text AS item_type,
      COALESCE(NULLIF(btrim(a.trade_name), ''), NULLIF(btrim(a.legal_name), ''), 'Partner application')::text AS title,
      NULL::text AS subtitle,
      a.status::text AS status,
      'normal'::text AS priority,
      a.created_at,
      a.updated_at,
      ('partner_application:' || a.id::text)::text AS route_key,
      false AS requires_aal2
    FROM public.partner_applications a
    WHERE a.status IN ('SUBMITTED', 'IN_REVIEW')

    UNION ALL

    SELECT
      t.id,
      'support_ticket'::text,
      ('Ticket ' || t.ticket_number)::text,
      NULLIF(left(btrim(t.subject), 120), '')::text,
      t.status::text,
      lower(COALESCE(t.priority, 'NORMAL'))::text,
      t.created_at,
      t.updated_at,
      ('support_ticket:' || t.id::text)::text,
      false
    FROM public.portal_support_tickets t
    WHERE t.status IN ('NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_VDB')

    UNION ALL

    SELECT
      c.id,
      'commission_review'::text,
      'Commission review'::text,
      NULLIF(btrim(COALESCE(pp.display_name, pp.legal_name, '')), '')::text,
      c.status::text,
      'high'::text,
      c.created_at,
      c.updated_at,
      ('commission_review:' || c.id::text)::text,
      true
    FROM public.partner_commissions c
    LEFT JOIN public.partner_profiles pp ON pp.id = c.partner_id
    WHERE c.status IN ('PENDING', 'ELIGIBLE')

    UNION ALL

    SELECT
      f.id,
      'document_review'::text,
      ('Document ' || f.document_number)::text,
      f.category::text,
      f.status::text,
      CASE WHEN f.scan_status IN ('SUSPICIOUS', 'INFECTED') THEN 'urgent' ELSE 'high' END::text,
      f.created_at,
      f.updated_at,
      ('document_review:' || f.id::text)::text,
      false
    FROM public.portal_files f
    WHERE f.status = 'QUARANTINED'
       OR f.scan_status IN ('PENDING', 'SUSPICIOUS', 'INFECTED')

    UNION ALL

    SELECT
      ap.id,
      'appointment'::text,
      NULLIF(left(btrim(ap.title), 120), '')::text,
      ap.appointment_type::text,
      ap.status::text,
      'normal'::text,
      ap.created_at,
      ap.updated_at,
      ('appointment:' || ap.id::text)::text,
      false
    FROM public.portal_appointments ap
    WHERE ap.status IN ('SCHEDULED', 'CONFIRMED', 'RESCHEDULED')
      AND ap.starts_at >= NOW()
  ),
  page AS (
    SELECT *
    FROM queue
    WHERE (p_types IS NULL OR item_type = ANY (p_types))
      AND (p_cursor IS NULL OR created_at < p_cursor)
    ORDER BY created_at DESC, id DESC
    LIMIT v_limit
  )
  SELECT
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', id,
          'type', item_type,
          'title', COALESCE(title, 'Untitled'),
          'subtitle', subtitle,
          'status', status,
          'priority', priority,
          'created_at', created_at,
          'updated_at', updated_at,
          'route_key', route_key,
          'requires_aal2', requires_aal2
        )
        ORDER BY created_at DESC, id DESC
      ),
      '[]'::jsonb
    ),
    COUNT(*)::int,
    MIN(created_at)
  INTO v_items, v_count, v_next
  FROM page;

  IF v_count < v_limit THEN
    v_next := NULL;
  END IF;

  RETURN jsonb_build_object(
    'items', v_items,
    'next_cursor', v_next,
    'schema_version', '2026.07.29.admin-control-surface-rc4'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_work_queue(int, timestamptz, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_work_queue(int, timestamptz, text[]) TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_work_queue(int, timestamptz, text[]) IS
  'rc.4 — staff triage feed across applications, tickets, commissions, quarantined documents and upcoming appointments. Keyset paging on created_at DESC, id DESC. requires_aal2 is a client hint, never the enforcement point.';

-- ---------------------------------------------------------------------------
-- approve_partner_commission — the single place partner liability is accrued
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_partner_commission(
  p_commission_id uuid,
  p_reason text,
  p_idempotency_key text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_key text := NULLIF(btrim(COALESCE(p_idempotency_key, '')), '');
  v_reason text;
  v_cached jsonb;
  v_comm public.partner_commissions%ROWTYPE;
  v_partner_user uuid;
  v_previous text;
  v_updated timestamptz;
  v_audit_id uuid;
  v_response jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.is_admin_or_owner() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM public.require_aal2();

  v_reason := public.admin_require_reason(p_reason);
  IF v_key IS NULL THEN RAISE EXCEPTION 'VALIDATION_FAILED'; END IF;

  v_cached := public.admin_idempotency_get(v_key, 'approve_partner_commission');
  IF v_cached IS NOT NULL THEN
    IF (v_cached ->> 'id') IS DISTINCT FROM p_commission_id::text THEN
      RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT';
    END IF;
    RETURN v_cached;
  END IF;

  SELECT * INTO v_comm
  FROM public.partner_commissions
  WHERE id = p_commission_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  -- Conflict of interest: an operator may never approve their own commission.
  SELECT pp.user_id INTO v_partner_user
  FROM public.partner_profiles pp
  WHERE pp.id = v_comm.partner_id;
  IF v_partner_user IS NOT DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF v_comm.status NOT IN ('PENDING', 'ELIGIBLE') THEN
    RAISE EXCEPTION 'INVALID_TRANSITION';
  END IF;

  v_previous := v_comm.status::text;

  UPDATE public.partner_commissions
  SET status = 'APPROVED',
      approved_at = COALESCE(approved_at, NOW()),
      updated_at = NOW()
  WHERE id = p_commission_id
  RETURNING updated_at INTO v_updated;

  -- Ledger key is derived from the commission so a replay can never double-post.
  PERFORM public._partner_post_ledger(
    'COMMISSION_ACCRUAL',
    'partner_commission',
    v_comm.id,
    v_comm.currency,
    'commission-approve:' || v_comm.id::text,
    v_uid,
    jsonb_build_array(
      jsonb_build_object('account', 'COMMISSION_LIABILITY', 'partner_id', v_comm.partner_id, 'credit_cents', v_comm.amount_cents, 'debit_cents', 0),
      jsonb_build_object('account', 'REVENUE_CLEARING', 'partner_id', NULL, 'debit_cents', v_comm.amount_cents, 'credit_cents', 0)
    )
  );

  -- Direct INSERT ... RETURNING: portal_write_audit swallows failures, which is
  -- unacceptable for a financial mutation that must return its audit id.
  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, metadata)
  VALUES (
    v_uid,
    'admin.partner_commission.approved',
    'partner_commissions',
    p_commission_id::text,
    jsonb_build_object(
      'partnerId', v_comm.partner_id,
      'partnerSaleId', v_comm.partner_sale_id,
      'previousStatus', v_previous,
      'newStatus', 'APPROVED',
      'reason', v_reason,
      'reasonLength', char_length(v_reason),
      'idempotencyKey', v_key,
      'ledgerPosted', true,
      'payoutTouched', false
    )
  )
  RETURNING id INTO v_audit_id;

  v_response := jsonb_build_object(
    'id', p_commission_id,
    'previous_status', v_previous,
    'status', 'approved',
    'updated_at', v_updated,
    'audit_id', v_audit_id
  );

  PERFORM public.admin_idempotency_put(
    v_key, 'approve_partner_commission', v_uid, 'partner_commissions', p_commission_id, v_response
  );

  RETURN v_response;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_partner_commission(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_partner_commission(uuid, text, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.approve_partner_commission(uuid, text, text) IS
  'rc.4 — OWNER/ADMIN + AAL2 approval of a PENDING/ELIGIBLE commission. Posts COMMISSION_ACCRUAL (the accrual removed from confirm_partner_sale), writes audit_logs and never touches payouts.';

-- ---------------------------------------------------------------------------
-- reject_partner_commission — no ledger, no payout effect
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reject_partner_commission(
  p_commission_id uuid,
  p_reason text,
  p_idempotency_key text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_key text := NULLIF(btrim(COALESCE(p_idempotency_key, '')), '');
  v_reason text;
  v_cached jsonb;
  v_comm public.partner_commissions%ROWTYPE;
  v_partner_user uuid;
  v_previous text;
  v_updated timestamptz;
  v_audit_id uuid;
  v_response jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.is_admin_or_owner() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM public.require_aal2();

  v_reason := public.admin_require_reason(p_reason);
  IF v_key IS NULL THEN RAISE EXCEPTION 'VALIDATION_FAILED'; END IF;

  v_cached := public.admin_idempotency_get(v_key, 'reject_partner_commission');
  IF v_cached IS NOT NULL THEN
    IF (v_cached ->> 'id') IS DISTINCT FROM p_commission_id::text THEN
      RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT';
    END IF;
    RETURN v_cached;
  END IF;

  SELECT * INTO v_comm
  FROM public.partner_commissions
  WHERE id = p_commission_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  SELECT pp.user_id INTO v_partner_user
  FROM public.partner_profiles pp
  WHERE pp.id = v_comm.partner_id;
  IF v_partner_user IS NOT DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF v_comm.status NOT IN ('PENDING', 'ELIGIBLE') THEN
    RAISE EXCEPTION 'INVALID_TRANSITION';
  END IF;

  v_previous := v_comm.status::text;

  UPDATE public.partner_commissions
  SET status = 'REJECTED',
      approved_at = NULL,
      updated_at = NOW()
  WHERE id = p_commission_id
  RETURNING updated_at INTO v_updated;

  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, metadata)
  VALUES (
    v_uid,
    'admin.partner_commission.rejected',
    'partner_commissions',
    p_commission_id::text,
    jsonb_build_object(
      'partnerId', v_comm.partner_id,
      'partnerSaleId', v_comm.partner_sale_id,
      'previousStatus', v_previous,
      'newStatus', 'REJECTED',
      'reason', v_reason,
      'reasonLength', char_length(v_reason),
      'idempotencyKey', v_key,
      'ledgerPosted', false,
      'payoutTouched', false
    )
  )
  RETURNING id INTO v_audit_id;

  v_response := jsonb_build_object(
    'id', p_commission_id,
    'previous_status', v_previous,
    'status', 'rejected',
    'updated_at', v_updated,
    'audit_id', v_audit_id
  );

  PERFORM public.admin_idempotency_put(
    v_key, 'reject_partner_commission', v_uid, 'partner_commissions', p_commission_id, v_response
  );

  RETURN v_response;
END;
$$;

REVOKE ALL ON FUNCTION public.reject_partner_commission(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_partner_commission(uuid, text, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.reject_partner_commission(uuid, text, text) IS
  'rc.4 — OWNER/ADMIN + AAL2 rejection of a PENDING/ELIGIBLE commission. Never posts a ledger transaction and never changes payout state.';

-- ---------------------------------------------------------------------------
-- suspend_partner / reactivate_partner
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.suspend_partner(
  p_partner_id uuid,
  p_reason text,
  p_idempotency_key text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_key text := NULLIF(btrim(COALESCE(p_idempotency_key, '')), '');
  v_reason text;
  v_cached jsonb;
  v_partner public.partner_profiles%ROWTYPE;
  v_previous text;
  v_updated timestamptz;
  v_audit_id uuid;
  v_response jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.is_admin_or_owner() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM public.require_aal2();

  v_reason := public.admin_require_reason(p_reason);
  IF v_key IS NULL THEN RAISE EXCEPTION 'VALIDATION_FAILED'; END IF;

  v_cached := public.admin_idempotency_get(v_key, 'suspend_partner');
  IF v_cached IS NOT NULL THEN
    IF (v_cached ->> 'id') IS DISTINCT FROM p_partner_id::text THEN
      RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT';
    END IF;
    RETURN v_cached;
  END IF;

  SELECT * INTO v_partner
  FROM public.partner_profiles
  WHERE id = p_partner_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  IF v_partner.user_id IS NOT DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF v_partner.status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'INVALID_TRANSITION';
  END IF;

  v_previous := v_partner.status::text;

  UPDATE public.partner_profiles
  SET status = 'SUSPENDED',
      suspended_at = NOW(),
      payout_eligible = false,
      updated_at = NOW()
  WHERE id = p_partner_id
  RETURNING updated_at INTO v_updated;

  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, metadata)
  VALUES (
    v_uid,
    'admin.partner.suspended',
    'partner_profiles',
    p_partner_id::text,
    jsonb_build_object(
      'previousStatus', v_previous,
      'newStatus', 'SUSPENDED',
      'payoutEligible', false,
      'reason', v_reason,
      'reasonLength', char_length(v_reason),
      'idempotencyKey', v_key
    )
  )
  RETURNING id INTO v_audit_id;

  v_response := jsonb_build_object(
    'id', p_partner_id,
    'previous_status', v_previous,
    'status', 'suspended',
    'updated_at', v_updated,
    'audit_id', v_audit_id
  );

  PERFORM public.admin_idempotency_put(
    v_key, 'suspend_partner', v_uid, 'partner_profiles', p_partner_id, v_response
  );

  RETURN v_response;
END;
$$;

REVOKE ALL ON FUNCTION public.suspend_partner(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.suspend_partner(uuid, text, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.suspend_partner(uuid, text, text) IS
  'rc.4 — OWNER/ADMIN + AAL2 suspension (ACTIVE → SUSPENDED, payout_eligible=false). create_partner_lead and request_partner_payout already require ACTIVE, so suspension immediately closes both paths.';

CREATE OR REPLACE FUNCTION public.reactivate_partner(
  p_partner_id uuid,
  p_reason text,
  p_idempotency_key text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_key text := NULLIF(btrim(COALESCE(p_idempotency_key, '')), '');
  v_reason text;
  v_cached jsonb;
  v_partner public.partner_profiles%ROWTYPE;
  v_previous text;
  v_updated timestamptz;
  v_audit_id uuid;
  v_response jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.is_admin_or_owner() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM public.require_aal2();

  v_reason := public.admin_require_reason(p_reason);
  IF v_key IS NULL THEN RAISE EXCEPTION 'VALIDATION_FAILED'; END IF;

  v_cached := public.admin_idempotency_get(v_key, 'reactivate_partner');
  IF v_cached IS NOT NULL THEN
    IF (v_cached ->> 'id') IS DISTINCT FROM p_partner_id::text THEN
      RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT';
    END IF;
    RETURN v_cached;
  END IF;

  SELECT * INTO v_partner
  FROM public.partner_profiles
  WHERE id = p_partner_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  IF v_partner.user_id IS NOT DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF v_partner.status <> 'SUSPENDED' THEN
    RAISE EXCEPTION 'INVALID_TRANSITION';
  END IF;

  v_previous := v_partner.status::text;

  -- compliance_status is owned by the compliance flow and is left untouched.
  UPDATE public.partner_profiles
  SET status = 'ACTIVE',
      suspended_at = NULL,
      payout_eligible = true,
      updated_at = NOW()
  WHERE id = p_partner_id
  RETURNING updated_at INTO v_updated;

  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, metadata)
  VALUES (
    v_uid,
    'admin.partner.reactivated',
    'partner_profiles',
    p_partner_id::text,
    jsonb_build_object(
      'previousStatus', v_previous,
      'newStatus', 'ACTIVE',
      'payoutEligible', true,
      'complianceStatus', v_partner.compliance_status,
      'reason', v_reason,
      'reasonLength', char_length(v_reason),
      'idempotencyKey', v_key
    )
  )
  RETURNING id INTO v_audit_id;

  v_response := jsonb_build_object(
    'id', p_partner_id,
    'previous_status', v_previous,
    'status', 'active',
    'updated_at', v_updated,
    'audit_id', v_audit_id
  );

  PERFORM public.admin_idempotency_put(
    v_key, 'reactivate_partner', v_uid, 'partner_profiles', p_partner_id, v_response
  );

  RETURN v_response;
END;
$$;

REVOKE ALL ON FUNCTION public.reactivate_partner(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reactivate_partner(uuid, text, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.reactivate_partner(uuid, text, text) IS
  'rc.4 — OWNER/ADMIN + AAL2 reactivation (SUSPENDED → ACTIVE). Restores payout eligibility but leaves compliance_status as-is.';

-- ---------------------------------------------------------------------------
-- Directory RPCs (staff_admin, AAL1 sufficient, read-only, keyset paging)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_products(
  p_limit int DEFAULT 25,
  p_cursor timestamptz DEFAULT NULL,
  p_status text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit int := LEAST(GREATEST(COALESCE(p_limit, 25), 1), 100);
  v_status text := NULLIF(btrim(COALESCE(p_status, '')), '');
  v_items jsonb := '[]'::jsonb;
  v_count int := 0;
  v_next timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.is_staff_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  WITH page AS (
    SELECT p.id, p.slug, p.name, p.status, p.price_cents, p.from_price_cents,
           p.featured, p.sort_order, p.updated_at, p.created_at
    FROM public.products p
    WHERE (p_cursor IS NULL OR p.created_at < p_cursor)
      AND (v_status IS NULL OR p.status::text = upper(v_status))
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT v_limit
  )
  SELECT
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', id,
          'slug', slug,
          'name', name,
          'status', status::text,
          'price_cents', price_cents,
          'from_price_cents', from_price_cents,
          'featured', featured,
          'sort_order', sort_order,
          'updated_at', updated_at,
          'created_at', created_at
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
    'schema_version', '2026.07.29.admin-control-surface-rc4'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_products(int, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_products(int, timestamptz, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_list_products(int, timestamptz, text) IS
  'rc.4 — staff product directory. Public catalog fields only: no cost, margin or supplier data.';

CREATE OR REPLACE FUNCTION public.admin_list_partners(
  p_limit int DEFAULT 25,
  p_cursor timestamptz DEFAULT NULL,
  p_status text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit int := LEAST(GREATEST(COALESCE(p_limit, 25), 1), 100);
  v_status text := NULLIF(btrim(COALESCE(p_status, '')), '');
  v_items jsonb := '[]'::jsonb;
  v_count int := 0;
  v_next timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.is_staff_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  WITH page AS (
    SELECT pp.id, pp.user_id, pp.status, pp.display_name, pp.legal_name,
           pp.payout_eligible, pp.compliance_status, pp.created_at, pp.updated_at, pp.suspended_at
    FROM public.partner_profiles pp
    WHERE (p_cursor IS NULL OR pp.created_at < p_cursor)
      AND (v_status IS NULL OR pp.status::text = upper(v_status))
    ORDER BY pp.created_at DESC, pp.id DESC
    LIMIT v_limit
  )
  SELECT
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', id,
          'user_id', user_id,
          'status', status::text,
          'display_name', display_name,
          'legal_name', legal_name,
          'payout_eligible', payout_eligible,
          'compliance_status', compliance_status,
          'created_at', created_at,
          'updated_at', updated_at,
          'suspended_at', suspended_at
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
    'schema_version', '2026.07.29.admin-control-surface-rc4'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_partners(int, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_partners(int, timestamptz, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_list_partners(int, timestamptz, text) IS
  'rc.4 — staff partner directory. Identity/eligibility fields already held on partner_profiles; no contact details, no balances.';

CREATE OR REPLACE FUNCTION public.admin_list_customers(
  p_limit int DEFAULT 25,
  p_cursor timestamptz DEFAULT NULL,
  p_status text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit int := LEAST(GREATEST(COALESCE(p_limit, 25), 1), 100);
  v_status text := NULLIF(btrim(COALESCE(p_status, '')), '');
  v_items jsonb := '[]'::jsonb;
  v_count int := 0;
  v_next timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.is_staff_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  -- organizations has no "name" column; the display name is derived from
  -- trade_name/legal_name. Contact email, phone, VAT/KvK and invoice address
  -- are deliberately excluded from the directory payload.
  WITH page AS (
    SELECT o.id,
           COALESCE(NULLIF(btrim(o.trade_name), ''), o.legal_name) AS name,
           o.legal_name, o.trade_name, o.type AS org_type, o.status, o.created_at, o.updated_at
    FROM public.organizations o
    WHERE (p_cursor IS NULL OR o.created_at < p_cursor)
      AND (v_status IS NULL OR o.status::text = upper(v_status))
    ORDER BY o.created_at DESC, o.id DESC
    LIMIT v_limit
  )
  SELECT
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', id,
          'name', name,
          'legal_name', legal_name,
          'trade_name', trade_name,
          'type', org_type::text,
          'status', status::text,
          'created_at', created_at,
          'updated_at', updated_at
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
    'schema_version', '2026.07.29.admin-control-surface-rc4'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_customers(int, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_customers(int, timestamptz, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_list_customers(int, timestamptz, text) IS
  'rc.4 — staff customer (organization) directory. No email, phone, VAT/KvK or address is returned.';

CREATE OR REPLACE FUNCTION public.admin_list_projects(
  p_limit int DEFAULT 25,
  p_cursor timestamptz DEFAULT NULL,
  p_status text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit int := LEAST(GREATEST(COALESCE(p_limit, 25), 1), 100);
  v_status text := NULLIF(btrim(COALESCE(p_status, '')), '');
  v_items jsonb := '[]'::jsonb;
  v_count int := 0;
  v_next timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.is_staff_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  WITH page AS (
    SELECT pr.id, pr.organization_id, pr.name, pr.status, pr.priority,
           pr.progress_percent, pr.created_at, pr.updated_at
    FROM public.portal_projects pr
    WHERE (p_cursor IS NULL OR pr.created_at < p_cursor)
      AND (v_status IS NULL OR pr.status::text = upper(v_status))
    ORDER BY pr.created_at DESC, pr.id DESC
    LIMIT v_limit
  )
  SELECT
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', id,
          'organization_id', organization_id,
          'name', name,
          'status', status::text,
          'priority', priority,
          'progress_percent', progress_percent,
          'created_at', created_at,
          'updated_at', updated_at
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
    'schema_version', '2026.07.29.admin-control-surface-rc4'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_projects(int, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_projects(int, timestamptz, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_list_projects(int, timestamptz, text) IS
  'rc.4 — staff project directory over portal_projects.';

CREATE OR REPLACE FUNCTION public.admin_list_quotes(
  p_limit int DEFAULT 25,
  p_cursor timestamptz DEFAULT NULL,
  p_status text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit int := LEAST(GREATEST(COALESCE(p_limit, 25), 1), 100);
  v_status text := NULLIF(btrim(COALESCE(p_status, '')), '');
  v_items jsonb := '[]'::jsonb;
  v_count int := 0;
  v_next timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.is_staff_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  -- customer_note / decline_reason / document_path stay out of the directory.
  WITH page AS (
    SELECT q.id, q.organization_id, q.quote_number, q.title, q.status, q.currency,
           q.subtotal_cents, q.vat_cents, q.discount_cents, q.total_cents,
           q.valid_until, q.accepted_at, q.declined_at, q.created_at, q.updated_at
    FROM public.portal_quotes q
    WHERE (p_cursor IS NULL OR q.created_at < p_cursor)
      AND (v_status IS NULL OR q.status::text = upper(v_status))
    ORDER BY q.created_at DESC, q.id DESC
    LIMIT v_limit
  )
  SELECT
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', id,
          'organization_id', organization_id,
          'quote_number', quote_number,
          'title', title,
          'status', status::text,
          'currency', currency,
          'subtotal_cents', subtotal_cents,
          'vat_cents', vat_cents,
          'discount_cents', discount_cents,
          'total_cents', total_cents,
          'valid_until', valid_until,
          'accepted_at', accepted_at,
          'declined_at', declined_at,
          'created_at', created_at,
          'updated_at', updated_at
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
    'schema_version', '2026.07.29.admin-control-surface-rc4'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_quotes(int, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_quotes(int, timestamptz, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_list_quotes(int, timestamptz, text) IS
  'rc.4 — staff quote directory. Totals only; customer notes and document paths are not exposed.';

CREATE OR REPLACE FUNCTION public.admin_list_invoices(
  p_limit int DEFAULT 25,
  p_cursor timestamptz DEFAULT NULL,
  p_status text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit int := LEAST(GREATEST(COALESCE(p_limit, 25), 1), 100);
  v_status text := NULLIF(btrim(COALESCE(p_status, '')), '');
  v_items jsonb := '[]'::jsonb;
  v_count int := 0;
  v_next timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.is_staff_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  WITH page AS (
    SELECT i.id, i.organization_id, i.invoice_number, i.invoice_type, i.status, i.currency,
           i.subtotal_cents, i.vat_cents, i.discount_cents, i.total_cents,
           i.amount_paid_cents, i.amount_due_cents,
           i.issue_date, i.due_date, i.paid_at, i.created_at, i.updated_at
    FROM public.portal_invoices i
    WHERE (p_cursor IS NULL OR i.created_at < p_cursor)
      AND (v_status IS NULL OR i.status::text = upper(v_status))
    ORDER BY i.created_at DESC, i.id DESC
    LIMIT v_limit
  )
  SELECT
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', id,
          'organization_id', organization_id,
          'invoice_number', invoice_number,
          'invoice_type', invoice_type::text,
          'status', status::text,
          'currency', currency,
          'subtotal_cents', subtotal_cents,
          'vat_cents', vat_cents,
          'discount_cents', discount_cents,
          'total_cents', total_cents,
          'amount_paid_cents', amount_paid_cents,
          'amount_due_cents', amount_due_cents,
          'issue_date', issue_date,
          'due_date', due_date,
          'paid_at', paid_at,
          'created_at', created_at,
          'updated_at', updated_at
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
    'schema_version', '2026.07.29.admin-control-surface-rc4'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_invoices(int, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_invoices(int, timestamptz, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_list_invoices(int, timestamptz, text) IS
  'rc.4 — staff invoice directory. Read-only: no payment, reversal or provider fields are mutated or exposed.';

CREATE OR REPLACE FUNCTION public.admin_list_appointments(
  p_limit int DEFAULT 25,
  p_cursor timestamptz DEFAULT NULL,
  p_status text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit int := LEAST(GREATEST(COALESCE(p_limit, 25), 1), 100);
  v_status text := NULLIF(btrim(COALESCE(p_status, '')), '');
  v_items jsonb := '[]'::jsonb;
  v_count int := 0;
  v_next timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.is_staff_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  -- No attendee identities, no meeting links, no notes.
  WITH page AS (
    SELECT a.id, a.organization_id, a.status, a.appointment_type,
           a.starts_at, a.ends_at, a.timezone AS tz, a.created_at, a.updated_at
    FROM public.portal_appointments a
    WHERE (p_cursor IS NULL OR a.created_at < p_cursor)
      AND (v_status IS NULL OR a.status::text = upper(v_status))
    ORDER BY a.created_at DESC, a.id DESC
    LIMIT v_limit
  )
  SELECT
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', id,
          'organization_id', organization_id,
          'status', status::text,
          'appointment_type', appointment_type::text,
          'starts_at', starts_at,
          'ends_at', ends_at,
          'timezone', tz,
          'created_at', created_at,
          'updated_at', updated_at
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
    'schema_version', '2026.07.29.admin-control-surface-rc4'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_appointments(int, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_appointments(int, timestamptz, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_list_appointments(int, timestamptz, text) IS
  'rc.4 — staff appointment directory. Attendee emails, meeting links and notes are never returned.';

-- ---------------------------------------------------------------------------
-- admin_get_settings_summary — safe booleans only
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_settings_summary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.is_staff_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  -- The database can only report DB-owned feature flags. Provider credentials
  -- (Mollie, WhatsApp) and CHECKOUT_ENABLED live in application env, so those
  -- keys are reported as constant false rather than guessed.
  RETURN jsonb_build_object(
    'whatsapp_configured', false,
    'mollie_enabled', false,
    'checkout_enabled', false,
    'messaging_realtime', public.feature_flag_enabled(ARRAY['messaging_realtime']),
    'appointments_booking', public.feature_flag_enabled(ARRAY['appointments_booking']),
    'support_internal_notes_rpc', public.feature_flag_enabled(ARRAY['support_internal_notes_rpc']),
    'partner_payouts', public.feature_flag_enabled(ARRAY['partner_payouts', 'partner.payouts']),
    'environment_label', 'database',
    'contract_version', 'vdb-backend-contract@0.2.0-rc.4',
    'schema_version', '2026.07.29.admin-control-surface-rc4',
    'generated_at', NOW()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_settings_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_settings_summary() TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_get_settings_summary() IS
  'rc.4 — DB-observable configuration booleans for the admin settings screen. Never returns secrets; env-owned toggles are reported as false.';

-- ---------------------------------------------------------------------------
-- admin_get_security_status — step-up posture for the current operator
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
    'schema_version', '2026.07.29.admin-control-surface-rc4',
    'generated_at', NOW()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_security_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_security_status() TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_get_security_status() IS
  'rc.4 — step-up posture for the calling operator. Returns enrolment/AAL booleans and capability names only; no factor ids, secrets or recovery codes.';

-- ---------------------------------------------------------------------------
-- Verifier
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
      ), 'admin surface never mutates payouts')
  ) AS t(check_name, ok, detail);
END;
$$;

REVOKE ALL ON FUNCTION public.verify_admin_control_surface_contracts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_admin_control_surface_contracts() TO authenticated, service_role;

COMMENT ON FUNCTION public.verify_admin_control_surface_contracts() IS
  'rc.4 — presence, hardening and money-boundary checks for the admin control surface.';
;
