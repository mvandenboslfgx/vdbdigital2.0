-- STATUS: LOCAL ONLY — SECURITY DEFINER RPCs for messaging/support/appointments rc.3
-- Contract: vdb-backend-contract@0.2.0-rc.3
-- Does NOT authorize staging or production apply.

-- NEW enum value committed by prior migration — safe to use as default now.
ALTER TABLE public.portal_support_tickets
  ALTER COLUMN status SET DEFAULT 'NEW';

-- ---------------------------------------------------------------------------
-- create_portal_conversation
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_portal_conversation(
  p_organization_id uuid,
  p_subject text,
  p_conversation_type public.portal_conversation_type DEFAULT 'PROJECT',
  p_project_id uuid DEFAULT NULL,
  p_partner_id uuid DEFAULT NULL,
  p_participant_user_ids uuid[] DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_uid uuid := auth.uid();
  v_participant uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF p_subject IS NULL OR length(trim(p_subject)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF p_conversation_type = 'INTERNAL' AND NOT public.is_staff_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF NOT public.is_staff_admin() AND NOT public.is_org_member(p_organization_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  INSERT INTO public.portal_conversations (
    organization_id, project_id, partner_id, subject, conversation_type, created_by
  ) VALUES (
    p_organization_id, p_project_id, p_partner_id, trim(p_subject), p_conversation_type, v_uid
  ) RETURNING id INTO v_id;

  INSERT INTO public.portal_conversation_participants (
    conversation_id, user_id, role_in_conversation
  ) VALUES (
    v_id, v_uid,
    CASE WHEN public.is_staff_admin() THEN 'STAFF' ELSE 'OWNER' END
  )
  ON CONFLICT (conversation_id, user_id) DO UPDATE
    SET removed_at = NULL, role_in_conversation = EXCLUDED.role_in_conversation;

  IF p_participant_user_ids IS NOT NULL THEN
    FOREACH v_participant IN ARRAY p_participant_user_ids LOOP
      IF v_participant IS DISTINCT FROM v_uid THEN
        INSERT INTO public.portal_conversation_participants (
          conversation_id, user_id, role_in_conversation
        ) VALUES (v_id, v_participant, 'MEMBER')
        ON CONFLICT (conversation_id, user_id) DO UPDATE
          SET removed_at = NULL;
      END IF;
    END LOOP;
  END IF;

  PERFORM public.portal_write_audit(
    'portal.conversation.create', 'portal_conversations', v_id::text,
    jsonb_build_object('type', p_conversation_type::text, 'org', p_organization_id)
  );
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_portal_conversation(uuid, text, public.portal_conversation_type, uuid, uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_portal_conversation(uuid, text, public.portal_conversation_type, uuid, uuid, uuid[]) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- manage_portal_conversation_participant
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.manage_portal_conversation_participant(
  p_conversation_id uuid,
  p_user_id uuid,
  p_action text,
  p_role_in_conversation text DEFAULT 'MEMBER'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_conv public.portal_conversations%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF p_action NOT IN ('add', 'remove') THEN RAISE EXCEPTION 'VALIDATION_FAILED'; END IF;

  SELECT * INTO v_conv FROM public.portal_conversations WHERE id = p_conversation_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  IF v_conv.conversation_type = 'INTERNAL' AND NOT public.is_staff_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF NOT public.is_staff_admin()
     AND NOT public.is_active_conversation_participant(p_conversation_id) THEN
    RAISE EXCEPTION 'NOT_PARTICIPANT';
  END IF;

  IF p_action = 'add' THEN
    INSERT INTO public.portal_conversation_participants (
      conversation_id, user_id, role_in_conversation, removed_at
    ) VALUES (
      p_conversation_id, p_user_id, COALESCE(p_role_in_conversation, 'MEMBER'), NULL
    )
    ON CONFLICT (conversation_id, user_id) DO UPDATE
      SET removed_at = NULL,
          role_in_conversation = COALESCE(p_role_in_conversation, portal_conversation_participants.role_in_conversation);
  ELSE
    UPDATE public.portal_conversation_participants
    SET removed_at = NOW()
    WHERE conversation_id = p_conversation_id AND user_id = p_user_id;
  END IF;

  PERFORM public.portal_write_audit(
    'portal.conversation.participant.' || p_action,
    'portal_conversations', p_conversation_id::text,
    jsonb_build_object('user_id', p_user_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.manage_portal_conversation_participant(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.manage_portal_conversation_participant(uuid, uuid, text, text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- send_portal_message
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.send_portal_message(
  p_conversation_id uuid,
  p_body text,
  p_idempotency_key text DEFAULT NULL,
  p_client_message_id text DEFAULT NULL,
  p_is_internal boolean DEFAULT false
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
  v_conv public.portal_conversations%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF p_body IS NULL OR length(trim(p_body)) = 0 THEN RAISE EXCEPTION 'VALIDATION_FAILED'; END IF;

  SELECT * INTO v_conv FROM public.portal_conversations
  WHERE id = p_conversation_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  IF v_conv.conversation_type = 'INTERNAL' AND NOT public.is_staff_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF p_is_internal AND NOT public.is_staff_admin() THEN
    RAISE EXCEPTION 'INTERNAL_LEAK_DENIED';
  END IF;

  IF NOT public.is_staff_admin()
     AND NOT public.is_active_conversation_participant(p_conversation_id) THEN
    RAISE EXCEPTION 'NOT_PARTICIPANT';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_id FROM public.portal_messages
    WHERE conversation_id = p_conversation_id AND idempotency_key = p_idempotency_key;
    IF FOUND THEN
      RETURN v_id;
    END IF;
  END IF;

  BEGIN
    INSERT INTO public.portal_messages (
      conversation_id, author_user_id, body, is_internal, idempotency_key, client_message_id
    ) VALUES (
      p_conversation_id, v_uid, trim(p_body), COALESCE(p_is_internal, false),
      p_idempotency_key, p_client_message_id
    ) RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    IF p_idempotency_key IS NOT NULL THEN
      SELECT id INTO v_id FROM public.portal_messages
      WHERE conversation_id = p_conversation_id AND idempotency_key = p_idempotency_key;
      IF FOUND THEN RETURN v_id; END IF;
    END IF;
    RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT';
  END;

  UPDATE public.portal_conversations
  SET last_message_at = NOW(), updated_at = NOW()
  WHERE id = p_conversation_id;

  PERFORM public.portal_write_audit(
    'portal.message.send', 'portal_messages', v_id::text,
    jsonb_build_object('conversation_id', p_conversation_id, 'is_internal', p_is_internal)
  );
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.send_portal_message(uuid, text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_portal_message(uuid, text, text, text, boolean) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- mark_portal_conversation_read
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_portal_conversation_read(
  p_conversation_id uuid,
  p_read_at timestamptz DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_updated int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;

  UPDATE public.portal_conversation_participants
  SET last_read_at = COALESCE(p_read_at, NOW())
  WHERE conversation_id = p_conversation_id
    AND user_id = v_uid
    AND removed_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN RAISE EXCEPTION 'NOT_PARTICIPANT'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_portal_conversation_read(uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_portal_conversation_read(uuid, timestamptz) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- assign_portal_support_ticket
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assign_portal_support_ticket(
  p_ticket_id uuid,
  p_assignee_user_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.is_staff_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  UPDATE public.portal_support_tickets
  SET assigned_to = p_assignee_user_id,
      updated_at = NOW(),
      status = CASE WHEN status = 'NEW' THEN 'OPEN'::public.portal_ticket_status ELSE status END
  WHERE id = p_ticket_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  PERFORM public.portal_write_audit(
    'portal.support.assign', 'portal_support_tickets', p_ticket_id::text,
    jsonb_build_object('assignee', p_assignee_user_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.assign_portal_support_ticket(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_portal_support_ticket(uuid, uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- reply_portal_support_ticket (public reply)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reply_portal_support_ticket(
  p_ticket_id uuid,
  p_body text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_ticket public.portal_support_tickets%ROWTYPE;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF p_body IS NULL OR length(trim(p_body)) = 0 THEN RAISE EXCEPTION 'VALIDATION_FAILED'; END IF;

  SELECT * INTO v_ticket FROM public.portal_support_tickets WHERE id = p_ticket_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  IF NOT public.is_staff_admin() AND NOT public.is_org_member(v_ticket.organization_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  INSERT INTO public.portal_support_replies (ticket_id, author_user_id, body, is_internal)
  VALUES (p_ticket_id, v_uid, trim(p_body), false)
  RETURNING id INTO v_id;

  UPDATE public.portal_support_tickets
  SET updated_at = NOW(),
      status = CASE
        WHEN public.is_staff_admin() AND status IN ('NEW', 'OPEN', 'WAITING_FOR_VDB')
          THEN 'WAITING_FOR_CUSTOMER'::public.portal_ticket_status
        WHEN NOT public.is_staff_admin() AND status IN ('WAITING_FOR_CUSTOMER', 'RESOLVED')
          THEN 'WAITING_FOR_VDB'::public.portal_ticket_status
        ELSE status
      END
  WHERE id = p_ticket_id;

  PERFORM public.portal_write_audit(
    'portal.support.reply', 'portal_support_replies', v_id::text,
    jsonb_build_object('ticket_id', p_ticket_id)
  );
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reply_portal_support_ticket(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reply_portal_support_ticket(uuid, text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- add_portal_support_internal_note
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_portal_support_internal_note(
  p_ticket_id uuid,
  p_body text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.is_staff_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF NOT public.feature_flag_enabled(ARRAY['support_internal_notes_rpc']) THEN
    RAISE EXCEPTION 'FEATURE_DISABLED';
  END IF;
  IF p_body IS NULL OR length(trim(p_body)) = 0 THEN RAISE EXCEPTION 'VALIDATION_FAILED'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.portal_support_tickets WHERE id = p_ticket_id) THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  INSERT INTO public.portal_support_replies (ticket_id, author_user_id, body, is_internal)
  VALUES (p_ticket_id, v_uid, trim(p_body), true)
  RETURNING id INTO v_id;

  PERFORM public.portal_write_audit(
    'portal.support.internal_note', 'portal_support_replies', v_id::text,
    jsonb_build_object('ticket_id', p_ticket_id)
  );
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.add_portal_support_internal_note(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_portal_support_internal_note(uuid, text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- transition_portal_support_ticket_status
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.transition_portal_support_ticket_status(
  p_ticket_id uuid,
  p_to_status public.portal_ticket_status
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from public.portal_ticket_status;
  v_ok boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.is_staff_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  SELECT status INTO v_from FROM public.portal_support_tickets WHERE id = p_ticket_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  IF v_from = p_to_status THEN
    RETURN;
  END IF;

  -- Allowed transitions (staff)
  v_ok := (v_from, p_to_status) IN (
    ('NEW', 'OPEN'),
    ('NEW', 'IN_PROGRESS'),
    ('NEW', 'CLOSED'),
    ('OPEN', 'IN_PROGRESS'),
    ('OPEN', 'WAITING_FOR_CUSTOMER'),
    ('OPEN', 'WAITING_FOR_VDB'),
    ('OPEN', 'RESOLVED'),
    ('OPEN', 'CLOSED'),
    ('IN_PROGRESS', 'WAITING_FOR_CUSTOMER'),
    ('IN_PROGRESS', 'WAITING_FOR_VDB'),
    ('IN_PROGRESS', 'RESOLVED'),
    ('IN_PROGRESS', 'CLOSED'),
    ('WAITING_FOR_CUSTOMER', 'IN_PROGRESS'),
    ('WAITING_FOR_CUSTOMER', 'WAITING_FOR_VDB'),
    ('WAITING_FOR_CUSTOMER', 'RESOLVED'),
    ('WAITING_FOR_CUSTOMER', 'CLOSED'),
    ('WAITING_FOR_VDB', 'IN_PROGRESS'),
    ('WAITING_FOR_VDB', 'WAITING_FOR_CUSTOMER'),
    ('WAITING_FOR_VDB', 'RESOLVED'),
    ('WAITING_FOR_VDB', 'CLOSED'),
    ('RESOLVED', 'CLOSED'),
    ('RESOLVED', 'OPEN'),
    ('RESOLVED', 'IN_PROGRESS'),
    ('CLOSED', 'OPEN')
  );

  IF NOT v_ok THEN RAISE EXCEPTION 'INVALID_TRANSITION'; END IF;

  UPDATE public.portal_support_tickets
  SET status = p_to_status,
      updated_at = NOW(),
      resolved_at = CASE
        WHEN p_to_status IN ('RESOLVED', 'CLOSED') THEN COALESCE(resolved_at, NOW())
        ELSE NULL
      END
  WHERE id = p_ticket_id;

  PERFORM public.portal_write_audit(
    'portal.support.status', 'portal_support_tickets', p_ticket_id::text,
    jsonb_build_object('from', v_from::text, 'to', p_to_status::text)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.transition_portal_support_ticket_status(uuid, public.portal_ticket_status) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_portal_support_ticket_status(uuid, public.portal_ticket_status) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- book_portal_appointment
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.book_portal_appointment(
  p_organization_id uuid,
  p_title text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_timezone text DEFAULT 'UTC',
  p_appointment_type public.portal_appointment_type DEFAULT 'OTHER',
  p_project_id uuid DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_meeting_link text DEFAULT NULL,
  p_participant_user_ids uuid[] DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
  v_participant uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.feature_flag_enabled(ARRAY['appointments_booking']) THEN
    RAISE EXCEPTION 'FEATURE_DISABLED';
  END IF;
  IF p_title IS NULL OR length(trim(p_title)) = 0 THEN RAISE EXCEPTION 'VALIDATION_FAILED'; END IF;
  IF p_ends_at <= p_starts_at THEN RAISE EXCEPTION 'VALIDATION_FAILED'; END IF;
  IF NOT public.is_staff_admin() AND NOT public.is_org_member(p_organization_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  -- Advisory lock per organizer to serialize booking attempts
  PERFORM pg_advisory_xact_lock(hashtext(v_uid::text));

  IF EXISTS (
    SELECT 1 FROM public.portal_appointments a
    WHERE a.organizer_user_id = v_uid
      AND a.status IN ('SCHEDULED', 'CONFIRMED', 'RESCHEDULED')
      AND tstzrange(a.starts_at, a.ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')
  ) THEN
    RAISE EXCEPTION 'DOUBLE_BOOKING';
  END IF;

  BEGIN
    INSERT INTO public.portal_appointments (
      organization_id, project_id, title, appointment_type, status,
      starts_at, ends_at, timezone, location, meeting_link,
      organizer_user_id, created_by
    ) VALUES (
      p_organization_id, p_project_id, trim(p_title), p_appointment_type, 'SCHEDULED',
      p_starts_at, p_ends_at, COALESCE(p_timezone, 'UTC'), p_location, p_meeting_link,
      v_uid, v_uid
    ) RETURNING id INTO v_id;
  EXCEPTION WHEN exclusion_violation THEN
    RAISE EXCEPTION 'DOUBLE_BOOKING';
  END;

  INSERT INTO public.portal_appointment_participants (
    appointment_id, user_id, role, response_status
  ) VALUES (v_id, v_uid, 'ORGANIZER', 'ACCEPTED')
  ON CONFLICT DO NOTHING;

  IF p_participant_user_ids IS NOT NULL THEN
    FOREACH v_participant IN ARRAY p_participant_user_ids LOOP
      IF v_participant IS DISTINCT FROM v_uid THEN
        INSERT INTO public.portal_appointment_participants (
          appointment_id, user_id, role, response_status
        ) VALUES (v_id, v_participant, 'ATTENDEE', 'PENDING')
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  PERFORM public.portal_write_audit(
    'portal.appointment.book', 'portal_appointments', v_id::text,
    jsonb_build_object('org', p_organization_id, 'idempotency_key', p_idempotency_key)
  );
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.book_portal_appointment(
  uuid, text, timestamptz, timestamptz, text, public.portal_appointment_type, uuid, text, text, uuid[], text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.book_portal_appointment(
  uuid, text, timestamptz, timestamptz, text, public.portal_appointment_type, uuid, text, text, uuid[], text
) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- reschedule_portal_appointment
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reschedule_portal_appointment(
  p_appointment_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_expected_version int DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_appt public.portal_appointments%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.feature_flag_enabled(ARRAY['appointments_booking']) THEN
    RAISE EXCEPTION 'FEATURE_DISABLED';
  END IF;
  IF p_ends_at <= p_starts_at THEN RAISE EXCEPTION 'VALIDATION_FAILED'; END IF;

  SELECT * INTO v_appt FROM public.portal_appointments WHERE id = p_appointment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  IF v_appt.status IN ('CANCELLED', 'COMPLETED', 'NO_SHOW') THEN
    RAISE EXCEPTION 'INVALID_TRANSITION';
  END IF;

  IF NOT public.is_staff_admin()
     AND v_appt.organizer_user_id <> v_uid
     AND NOT public.is_org_member(v_appt.organization_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF p_expected_version IS NOT NULL AND v_appt.version <> p_expected_version THEN
    RAISE EXCEPTION 'CONFLICT';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_appt.organizer_user_id::text));

  IF EXISTS (
    SELECT 1 FROM public.portal_appointments a
    WHERE a.organizer_user_id = v_appt.organizer_user_id
      AND a.id <> p_appointment_id
      AND a.status IN ('SCHEDULED', 'CONFIRMED', 'RESCHEDULED')
      AND tstzrange(a.starts_at, a.ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')
  ) THEN
    RAISE EXCEPTION 'DOUBLE_BOOKING';
  END IF;

  BEGIN
    UPDATE public.portal_appointments
    SET starts_at = p_starts_at,
        ends_at = p_ends_at,
        status = 'RESCHEDULED',
        version = version + 1,
        updated_at = NOW()
    WHERE id = p_appointment_id;
  EXCEPTION WHEN exclusion_violation THEN
    RAISE EXCEPTION 'DOUBLE_BOOKING';
  END;

  PERFORM public.portal_write_audit(
    'portal.appointment.reschedule', 'portal_appointments', p_appointment_id::text,
    jsonb_build_object('starts_at', p_starts_at, 'ends_at', p_ends_at)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reschedule_portal_appointment(uuid, timestamptz, timestamptz, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reschedule_portal_appointment(uuid, timestamptz, timestamptz, int) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- cancel_portal_appointment
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_portal_appointment(
  p_appointment_id uuid,
  p_reason text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_appt public.portal_appointments%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.feature_flag_enabled(ARRAY['appointments_booking']) THEN
    RAISE EXCEPTION 'FEATURE_DISABLED';
  END IF;

  SELECT * INTO v_appt FROM public.portal_appointments WHERE id = p_appointment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  IF v_appt.status = 'CANCELLED' THEN RETURN; END IF;
  IF v_appt.status IN ('COMPLETED', 'NO_SHOW') THEN RAISE EXCEPTION 'INVALID_TRANSITION'; END IF;

  IF NOT public.is_staff_admin()
     AND v_appt.organizer_user_id <> v_uid
     AND NOT public.is_org_member(v_appt.organization_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  UPDATE public.portal_appointments
  SET status = 'CANCELLED',
      cancelled_at = NOW(),
      cancellation_reason = p_reason,
      version = version + 1,
      updated_at = NOW()
  WHERE id = p_appointment_id;

  PERFORM public.portal_write_audit(
    'portal.appointment.cancel', 'portal_appointments', p_appointment_id::text,
    jsonb_build_object('reason', p_reason)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_portal_appointment(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_portal_appointment(uuid, text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Verifier RPC
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
    ('flag:support_internal_notes_rpc_false',
      EXISTS (SELECT 1 FROM public.feature_flags WHERE key='support_internal_notes_rpc' AND enabled=false), 'fail-closed'),
    ('flag:appointments_booking_false',
      EXISTS (SELECT 1 FROM public.feature_flags WHERE key='appointments_booking' AND enabled=false), 'fail-closed')
  ) AS t(check_name, ok, detail);
END;
$$;

REVOKE ALL ON FUNCTION public.verify_messaging_support_appointments_contracts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_messaging_support_appointments_contracts() TO authenticated, service_role;
