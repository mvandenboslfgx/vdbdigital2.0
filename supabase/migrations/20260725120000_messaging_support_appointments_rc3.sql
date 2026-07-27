-- STATUS: LOCAL ONLY — messaging/support/appointments owner contract rc.3
-- Contract: vdb-backend-contract@0.2.0-rc.3
-- schemaVersion: 2026.07.25.messaging-support-appointments-rc3
-- Does NOT authorize staging or production apply.
-- Reuses portal_conversations / portal_messages / portal_support_* — no parallel tables.
-- support_messages (Mobile) maps to portal_support_replies (no second writable table).

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.portal_conversation_type AS ENUM (
    'PROJECT', 'SUPPORT', 'PARTNER', 'INTERNAL'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.portal_moderation_status AS ENUM (
    'NONE', 'FLAGGED', 'HIDDEN', 'REMOVED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.portal_appointment_type AS ENUM (
    'INTAKE', 'KICKOFF', 'REVIEW', 'SUPPORT', 'HANDOVER', 'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.portal_appointment_status AS ENUM (
    'SCHEDULED', 'CONFIRMED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.portal_appointment_response AS ENUM (
    'PENDING', 'ACCEPTED', 'DECLINED', 'TENTATIVE'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Enum value must be committed before use as DEFAULT/literal (PG still requires commit).
ALTER TYPE public.portal_ticket_status ADD VALUE IF NOT EXISTS 'NEW' BEFORE 'OPEN';

-- ---------------------------------------------------------------------------
-- Conversations hardening
-- ---------------------------------------------------------------------------
ALTER TABLE public.portal_conversations
  ADD COLUMN IF NOT EXISTS conversation_type public.portal_conversation_type NOT NULL DEFAULT 'PROJECT',
  ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES public.partner_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderation_status public.portal_moderation_status NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_portal_conversations_org_type
  ON public.portal_conversations(organization_id, conversation_type)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_portal_conversations_partner
  ON public.portal_conversations(partner_id)
  WHERE partner_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Participants hardening
-- ---------------------------------------------------------------------------
ALTER TABLE public.portal_conversation_participants
  ADD COLUMN IF NOT EXISTS role_in_conversation TEXT NOT NULL DEFAULT 'MEMBER'
    CHECK (role_in_conversation IN ('OWNER', 'MEMBER', 'STAFF', 'PARTNER', 'VIEWER')),
  ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS added_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ---------------------------------------------------------------------------
-- Messages hardening
-- ---------------------------------------------------------------------------
ALTER TABLE public.portal_messages
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS client_message_id TEXT,
  ADD COLUMN IF NOT EXISTS moderation_status public.portal_moderation_status NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS uq_portal_messages_idempotency
  ON public.portal_messages(conversation_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_portal_messages_deleted
  ON public.portal_messages(conversation_id)
  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- Message attachments (new)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.portal_message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.portal_messages(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  byte_size BIGINT CHECK (byte_size IS NULL OR byte_size >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_portal_message_attachments_message
  ON public.portal_message_attachments(message_id);

ALTER TABLE public.portal_message_attachments ENABLE ROW LEVEL SECURITY;

-- NOTE: portal_support_tickets.status DEFAULT 'NEW' is set in the following
-- migration after this ADD VALUE commits.

-- ---------------------------------------------------------------------------
-- Appointments (new)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.portal_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.portal_projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  appointment_type public.portal_appointment_type NOT NULL DEFAULT 'OTHER',
  status public.portal_appointment_status NOT NULL DEFAULT 'SCHEDULED',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  location TEXT,
  meeting_link TEXT,
  organizer_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  version INT NOT NULL DEFAULT 1,
  notes TEXT,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT portal_appointments_time_chk CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_portal_appointments_org_starts
  ON public.portal_appointments(organization_id, starts_at);

CREATE INDEX IF NOT EXISTS idx_portal_appointments_organizer
  ON public.portal_appointments(organizer_user_id, starts_at);

-- Prevent overlapping active bookings per organizer
ALTER TABLE public.portal_appointments
  DROP CONSTRAINT IF EXISTS portal_appointments_organizer_no_overlap;

ALTER TABLE public.portal_appointments
  ADD CONSTRAINT portal_appointments_organizer_no_overlap
  EXCLUDE USING gist (
    organizer_user_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  )
  WHERE (status IN ('SCHEDULED', 'CONFIRMED', 'RESCHEDULED'));

CREATE TABLE IF NOT EXISTS public.portal_appointment_participants (
  appointment_id UUID NOT NULL REFERENCES public.portal_appointments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'ATTENDEE'
    CHECK (role IN ('ORGANIZER', 'ATTENDEE', 'OPTIONAL')),
  response_status public.portal_appointment_response NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (appointment_id, user_id)
);

ALTER TABLE public.portal_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_appointment_participants ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Helper: active conversation participant
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_active_conversation_participant(p_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.portal_conversation_participants p
    WHERE p.conversation_id = p_conversation_id
      AND p.user_id = auth.uid()
      AND p.removed_at IS NULL
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_conversation_participant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_conversation_participant(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.portal_write_audit(
  p_action text,
  p_resource_type text,
  p_resource_id text,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), p_action, p_resource_type, p_resource_id, COALESCE(p_metadata, '{}'::jsonb));
EXCEPTION WHEN OTHERS THEN
  -- Audit must not break primary mutation in local/dev grant edge cases
  NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.portal_write_audit(text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_write_audit(text, text, text, jsonb) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Feature flags (fail-closed)
-- ---------------------------------------------------------------------------
INSERT INTO public.feature_flags (key, enabled, description)
VALUES
  ('messaging_realtime', false, 'FAIL-CLOSED — realtime messaging until owner enable'),
  ('support_internal_notes_rpc', false, 'FAIL-CLOSED — internal support notes RPC gate'),
  ('appointments_booking', false, 'FAIL-CLOSED — appointment booking RPCs')
ON CONFLICT (key) DO UPDATE
SET
  description = EXCLUDED.description,
  updated_at = timezone('utc', now());

UPDATE public.feature_flags
SET enabled = false,
    updated_at = timezone('utc', now())
WHERE key IN (
  'messaging_realtime',
  'support_internal_notes_rpc',
  'appointments_booking'
);

-- ---------------------------------------------------------------------------
-- RLS: participant-hardened messaging
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS portal_conversations_member ON public.portal_conversations;
DROP POLICY IF EXISTS portal_conversations_select ON public.portal_conversations;
CREATE POLICY portal_conversations_select ON public.portal_conversations
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_admin()
      OR (
        conversation_type <> 'INTERNAL'
        AND public.is_active_conversation_participant(id)
      )
    )
  );

DROP POLICY IF EXISTS portal_conversations_staff_write ON public.portal_conversations;
CREATE POLICY portal_conversations_staff_write ON public.portal_conversations
  FOR ALL TO authenticated
  USING (public.is_staff_admin())
  WITH CHECK (public.is_staff_admin());

DROP POLICY IF EXISTS portal_participants_member ON public.portal_conversation_participants;
DROP POLICY IF EXISTS portal_participants_select ON public.portal_conversation_participants;
CREATE POLICY portal_participants_select ON public.portal_conversation_participants
  FOR SELECT TO authenticated
  USING (
    public.is_staff_admin()
    OR user_id = auth.uid()
    OR public.is_active_conversation_participant(conversation_id)
  );

DROP POLICY IF EXISTS portal_participants_self_update_read ON public.portal_conversation_participants;
CREATE POLICY portal_participants_self_update_read ON public.portal_conversation_participants
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND removed_at IS NULL)
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS portal_messages_member_select ON public.portal_messages;
DROP POLICY IF EXISTS portal_messages_select ON public.portal_messages;
CREATE POLICY portal_messages_select ON public.portal_messages
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_admin()
      OR (
        NOT is_internal
        AND public.is_active_conversation_participant(conversation_id)
      )
    )
  );

DROP POLICY IF EXISTS portal_messages_member_insert ON public.portal_messages;
DROP POLICY IF EXISTS portal_messages_insert ON public.portal_messages;
CREATE POLICY portal_messages_insert ON public.portal_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    author_user_id = auth.uid()
    AND (
      public.is_staff_admin()
      OR (
        NOT is_internal
        AND public.is_active_conversation_participant(conversation_id)
      )
    )
  );

DROP POLICY IF EXISTS portal_message_attachments_select ON public.portal_message_attachments;
CREATE POLICY portal_message_attachments_select ON public.portal_message_attachments
  FOR SELECT TO authenticated
  USING (
    public.is_staff_admin()
    OR EXISTS (
      SELECT 1
      FROM public.portal_messages m
      WHERE m.id = message_id
        AND m.deleted_at IS NULL
        AND NOT m.is_internal
        AND public.is_active_conversation_participant(m.conversation_id)
    )
  );

DROP POLICY IF EXISTS portal_message_attachments_insert ON public.portal_message_attachments;
CREATE POLICY portal_message_attachments_insert ON public.portal_message_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_staff_admin()
    OR EXISTS (
      SELECT 1
      FROM public.portal_messages m
      WHERE m.id = message_id
        AND m.author_user_id = auth.uid()
        AND NOT m.is_internal
        AND public.is_active_conversation_participant(m.conversation_id)
    )
  );

-- Support replies: keep internal staff-only SELECT
DROP POLICY IF EXISTS portal_replies_member_select ON public.portal_support_replies;
DROP POLICY IF EXISTS portal_replies_select ON public.portal_support_replies;
CREATE POLICY portal_replies_select ON public.portal_support_replies
  FOR SELECT TO authenticated
  USING (
    public.is_staff_admin()
    OR (
      NOT is_internal
      AND EXISTS (
        SELECT 1 FROM public.portal_support_tickets t
        WHERE t.id = ticket_id AND public.is_org_member(t.organization_id)
      )
    )
  );

DROP POLICY IF EXISTS portal_replies_member_insert ON public.portal_support_replies;
DROP POLICY IF EXISTS portal_replies_insert ON public.portal_support_replies;
CREATE POLICY portal_replies_insert ON public.portal_support_replies
  FOR INSERT TO authenticated
  WITH CHECK (
    author_user_id = auth.uid()
    AND (
      public.is_staff_admin()
      OR (
        NOT is_internal
        AND EXISTS (
          SELECT 1 FROM public.portal_support_tickets t
          WHERE t.id = ticket_id AND public.is_org_member(t.organization_id)
        )
      )
    )
  );

COMMENT ON TABLE public.portal_message_attachments IS
  'Owner rc.3 — attachments for portal_messages; RLS via conversation participation.';
COMMENT ON TABLE public.portal_appointments IS
  'Owner rc.3 — portal appointments; mutations via SECURITY DEFINER RPCs.';
COMMENT ON TABLE public.portal_appointment_participants IS
  'Owner rc.3 — appointment attendees.';
COMMENT ON COLUMN public.portal_support_tickets.status IS
  'Includes NEW (rc.3 default). Mobile aliases map lowercase statuses to this enum.';

-- Avoid RLS recursion between appointments <-> participants
CREATE OR REPLACE FUNCTION public.can_view_portal_appointment(p_appointment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.portal_appointments a
    WHERE a.id = p_appointment_id
      AND (
        public.is_staff_admin()
        OR public.is_org_member(a.organization_id)
        OR a.organizer_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.portal_appointment_participants ap
          WHERE ap.appointment_id = a.id AND ap.user_id = auth.uid()
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_view_portal_appointment(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_portal_appointment(uuid) TO authenticated;

DROP POLICY IF EXISTS portal_appointments_select ON public.portal_appointments;
CREATE POLICY portal_appointments_select ON public.portal_appointments
  FOR SELECT TO authenticated
  USING (public.can_view_portal_appointment(id));

DROP POLICY IF EXISTS portal_appointment_participants_select ON public.portal_appointment_participants;
CREATE POLICY portal_appointment_participants_select ON public.portal_appointment_participants
  FOR SELECT TO authenticated
  USING (
    public.is_staff_admin()
    OR user_id = auth.uid()
    OR public.can_view_portal_appointment(appointment_id)
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.portal_message_attachments TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portal_appointments TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portal_appointment_participants TO authenticated, service_role;
