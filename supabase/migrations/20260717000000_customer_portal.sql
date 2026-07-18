-- Customer portal + multi-tenant organizations (forward-only)
-- Local apply only. Does not enable checkout. Does not touch remote.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE organization_type AS ENUM ('BUSINESS', 'CONSUMER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE organization_status AS ENUM ('ACTIVE', 'INVITED', 'BLOCKED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE org_member_status AS ENUM ('INVITED', 'ACTIVE', 'REMOVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE customer_org_role AS ENUM ('PRIMARY', 'MEMBER', 'BILLING', 'VIEW_ONLY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE portal_project_type AS ENUM (
    'WEBSITE', 'WEBSHOP', 'SOFTWARE', 'OPTIMISATION', 'MAINTENANCE',
    'BRANDING', 'INTEGRATION', 'SUPPORT', 'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE portal_project_status AS ENUM (
    'DRAFT', 'PLANNED', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'REVIEW',
    'COMPLETED', 'ON_HOLD', 'CANCELED', 'ARCHIVED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE portal_quote_status AS ENUM (
    'DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE portal_invoice_status AS ENUM (
    'DRAFT', 'OPEN', 'PAID', 'OVERDUE', 'CANCELED', 'CREDITED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE portal_ticket_status AS ENUM (
    'OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'WAITING_FOR_VDB', 'RESOLVED', 'CLOSED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE portal_invite_status AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- Organizations (create members table before helper that references it)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type organization_type NOT NULL DEFAULT 'BUSINESS',
  legal_name TEXT NOT NULL,
  trade_name TEXT,
  customer_number TEXT UNIQUE,
  vat_number TEXT,
  kvk_number TEXT,
  invoice_address TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  status organization_status NOT NULL DEFAULT 'ACTIVE',
  locale TEXT NOT NULL DEFAULT 'nl' CHECK (locale IN ('nl', 'en')),
  account_manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  customer_role customer_org_role NOT NULL DEFAULT 'MEMBER',
  is_primary_contact BOOLEAN NOT NULL DEFAULT FALSE,
  status org_member_status NOT NULL DEFAULT 'ACTIVE',
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);

-- ---------------------------------------------------------------------------
-- Helper: active org membership for RLS
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members m
    WHERE m.organization_id = p_org_id
      AND m.user_id = auth.uid()
      AND m.status = 'ACTIVE'
  );
$$;

REVOKE ALL ON FUNCTION public.is_org_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_staff_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_roles ar
    JOIN public.profiles p ON p.id = ar.user_id
    WHERE ar.user_id = auth.uid()
      AND p.is_active IS DISTINCT FROM FALSE
  );
$$;

REVOKE ALL ON FUNCTION public.is_staff_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_staff_admin() TO authenticated;

CREATE TABLE IF NOT EXISTS public.organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  customer_role customer_org_role NOT NULL DEFAULT 'MEMBER',
  token_hash TEXT NOT NULL UNIQUE,
  status portal_invite_status NOT NULL DEFAULT 'PENDING',
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT invitation_email_org_unique UNIQUE (organization_id, email)
);

CREATE INDEX IF NOT EXISTS idx_org_invites_email ON public.organization_invitations(lower(email));

CREATE TABLE IF NOT EXISTS public.organization_internal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.portal_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  project_type portal_project_type NOT NULL DEFAULT 'OTHER',
  status portal_project_status NOT NULL DEFAULT 'DRAFT',
  priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  start_date DATE,
  planned_delivery_date DATE,
  actual_delivery_date DATE,
  progress_percent INT NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  project_manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_visible BOOLEAN NOT NULL DEFAULT TRUE,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_projects_org ON public.portal_projects(organization_id);

CREATE TABLE IF NOT EXISTS public.portal_project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.portal_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  customer_visible BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.portal_project_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.portal_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SHARED', 'APPROVED', 'REJECTED')),
  customer_visible BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.portal_project_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.portal_projects(id) ON DELETE CASCADE,
  deliverable_id UUID REFERENCES public.portal_project_deliverables(id) ON DELETE SET NULL,
  author_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  decision TEXT CHECK (decision IS NULL OR decision IN ('APPROVE', 'REJECT', 'COMMENT')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Quotes / invoices
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.portal_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  quote_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  status portal_quote_status NOT NULL DEFAULT 'DRAFT',
  currency TEXT NOT NULL DEFAULT 'EUR',
  subtotal_cents INT NOT NULL DEFAULT 0 CHECK (subtotal_cents >= 0),
  vat_cents INT NOT NULL DEFAULT 0 CHECK (vat_cents >= 0),
  total_cents INT NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
  valid_until DATE,
  terms_version TEXT,
  customer_note TEXT,
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  document_path TEXT,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.portal_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  status portal_invoice_status NOT NULL DEFAULT 'DRAFT',
  issue_date DATE,
  due_date DATE,
  currency TEXT NOT NULL DEFAULT 'EUR',
  subtotal_cents INT NOT NULL DEFAULT 0 CHECK (subtotal_cents >= 0),
  vat_cents INT NOT NULL DEFAULT 0 CHECK (vat_cents >= 0),
  total_cents INT NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
  external_reference TEXT,
  document_path TEXT,
  paid_at TIMESTAMPTZ,
  note TEXT,
  customer_visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Files
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.portal_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.portal_projects(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES public.portal_quotes(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES public.portal_invoices(id) ON DELETE SET NULL,
  bucket TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0 CHECK (size_bytes >= 0),
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_visible BOOLEAN NOT NULL DEFAULT FALSE,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (bucket, storage_path)
);

-- ---------------------------------------------------------------------------
-- Messaging
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.portal_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.portal_projects(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.portal_conversation_participants (
  conversation_id UUID NOT NULL REFERENCES public.portal_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.portal_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.portal_conversations(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_messages_conversation ON public.portal_messages(conversation_id);

-- ---------------------------------------------------------------------------
-- Support
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.portal_support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.portal_projects(id) ON DELETE SET NULL,
  ticket_number TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'GENERAL',
  priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  status portal_ticket_status NOT NULL DEFAULT 'OPEN',
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.portal_support_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.portal_support_tickets(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.portal_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  href TEXT,
  read_at TIMESTAMPTZ,
  email_status TEXT NOT NULL DEFAULT 'SKIPPED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_notifications_user ON public.portal_notifications(user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_internal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_project_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_project_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_support_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_notifications ENABLE ROW LEVEL SECURITY;

-- Deny anon everywhere (explicit)
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'organizations','organization_members','organization_invitations','organization_internal_notes',
    'portal_projects','portal_project_milestones','portal_project_deliverables','portal_project_feedback',
    'portal_quotes','portal_invoices','portal_files','portal_conversations','portal_conversation_participants',
    'portal_messages','portal_support_tickets','portal_support_replies','portal_notifications'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_deny_anon', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false)',
      t || '_deny_anon', t
    );
  END LOOP;
END $$;

DROP POLICY IF EXISTS organizations_member_select ON public.organizations;
CREATE POLICY organizations_member_select ON public.organizations
  FOR SELECT TO authenticated
  USING (public.is_org_member(id) OR public.is_staff_admin());

DROP POLICY IF EXISTS org_members_self_select ON public.organization_members;
CREATE POLICY org_members_self_select ON public.organization_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_org_member(organization_id) OR public.is_staff_admin());

DROP POLICY IF EXISTS org_notes_staff_all ON public.organization_internal_notes;
CREATE POLICY org_notes_staff_all ON public.organization_internal_notes
  FOR ALL TO authenticated
  USING (public.is_staff_admin())
  WITH CHECK (public.is_staff_admin());

DROP POLICY IF EXISTS org_invites_staff ON public.organization_invitations;
CREATE POLICY org_invites_staff ON public.organization_invitations
  FOR ALL TO authenticated
  USING (public.is_staff_admin())
  WITH CHECK (public.is_staff_admin());

DROP POLICY IF EXISTS portal_projects_member_select ON public.portal_projects;
CREATE POLICY portal_projects_member_select ON public.portal_projects
  FOR SELECT TO authenticated
  USING (
    (customer_visible AND public.is_org_member(organization_id))
    OR public.is_staff_admin()
  );

DROP POLICY IF EXISTS portal_milestones_member_select ON public.portal_project_milestones;
CREATE POLICY portal_milestones_member_select ON public.portal_project_milestones
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.portal_projects p
      WHERE p.id = project_id
        AND (
          (customer_visible AND p.customer_visible AND public.is_org_member(p.organization_id))
          OR public.is_staff_admin()
        )
    )
  );

DROP POLICY IF EXISTS portal_deliverables_member_select ON public.portal_project_deliverables;
CREATE POLICY portal_deliverables_member_select ON public.portal_project_deliverables
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.portal_projects p
      WHERE p.id = project_id
        AND (
          (customer_visible AND p.customer_visible AND public.is_org_member(p.organization_id))
          OR public.is_staff_admin()
        )
    )
  );

DROP POLICY IF EXISTS portal_feedback_member ON public.portal_project_feedback;
CREATE POLICY portal_feedback_member ON public.portal_project_feedback
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.portal_projects p
      WHERE p.id = project_id
        AND (public.is_org_member(p.organization_id) OR public.is_staff_admin())
    )
  );

DROP POLICY IF EXISTS portal_feedback_member_insert ON public.portal_project_feedback;
CREATE POLICY portal_feedback_member_insert ON public.portal_project_feedback
  FOR INSERT TO authenticated
  WITH CHECK (
    author_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.portal_projects p
      WHERE p.id = project_id AND public.is_org_member(p.organization_id)
    )
  );

DROP POLICY IF EXISTS portal_quotes_member_select ON public.portal_quotes;
CREATE POLICY portal_quotes_member_select ON public.portal_quotes
  FOR SELECT TO authenticated
  USING (
    (status <> 'DRAFT' AND public.is_org_member(organization_id))
    OR public.is_staff_admin()
  );

DROP POLICY IF EXISTS portal_invoices_member_select ON public.portal_invoices;
CREATE POLICY portal_invoices_member_select ON public.portal_invoices
  FOR SELECT TO authenticated
  USING (
    (customer_visible AND status <> 'DRAFT' AND public.is_org_member(organization_id))
    OR public.is_staff_admin()
  );

DROP POLICY IF EXISTS portal_files_member_select ON public.portal_files;
CREATE POLICY portal_files_member_select ON public.portal_files
  FOR SELECT TO authenticated
  USING (
    (customer_visible AND public.is_org_member(organization_id))
    OR public.is_staff_admin()
  );

DROP POLICY IF EXISTS portal_conversations_member ON public.portal_conversations;
CREATE POLICY portal_conversations_member ON public.portal_conversations
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id) OR public.is_staff_admin());

DROP POLICY IF EXISTS portal_participants_member ON public.portal_conversation_participants;
CREATE POLICY portal_participants_member ON public.portal_conversation_participants
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_staff_admin()
    OR EXISTS (
      SELECT 1 FROM public.portal_conversations c
      WHERE c.id = conversation_id AND public.is_org_member(c.organization_id)
    )
  );

DROP POLICY IF EXISTS portal_messages_member_select ON public.portal_messages;
CREATE POLICY portal_messages_member_select ON public.portal_messages
  FOR SELECT TO authenticated
  USING (
    (
      is_internal = FALSE
      AND EXISTS (
        SELECT 1 FROM public.portal_conversations c
        WHERE c.id = conversation_id AND public.is_org_member(c.organization_id)
      )
    )
    OR public.is_staff_admin()
  );

DROP POLICY IF EXISTS portal_messages_member_insert ON public.portal_messages;
CREATE POLICY portal_messages_member_insert ON public.portal_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    author_user_id = auth.uid()
    AND is_internal = FALSE
    AND EXISTS (
      SELECT 1 FROM public.portal_conversations c
      WHERE c.id = conversation_id AND public.is_org_member(c.organization_id)
    )
  );

DROP POLICY IF EXISTS portal_tickets_member ON public.portal_support_tickets;
CREATE POLICY portal_tickets_member ON public.portal_support_tickets
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id) OR public.is_staff_admin());

DROP POLICY IF EXISTS portal_tickets_member_insert ON public.portal_support_tickets;
CREATE POLICY portal_tickets_member_insert ON public.portal_support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.is_org_member(organization_id)
  );

DROP POLICY IF EXISTS portal_replies_member_select ON public.portal_support_replies;
CREATE POLICY portal_replies_member_select ON public.portal_support_replies
  FOR SELECT TO authenticated
  USING (
    (
      is_internal = FALSE
      AND EXISTS (
        SELECT 1 FROM public.portal_support_tickets t
        WHERE t.id = ticket_id AND public.is_org_member(t.organization_id)
      )
    )
    OR public.is_staff_admin()
  );

DROP POLICY IF EXISTS portal_replies_member_insert ON public.portal_support_replies;
CREATE POLICY portal_replies_member_insert ON public.portal_support_replies
  FOR INSERT TO authenticated
  WITH CHECK (
    author_user_id = auth.uid()
    AND is_internal = FALSE
    AND EXISTS (
      SELECT 1 FROM public.portal_support_tickets t
      WHERE t.id = ticket_id AND public.is_org_member(t.organization_id)
    )
  );

DROP POLICY IF EXISTS portal_notifications_own ON public.portal_notifications;
CREATE POLICY portal_notifications_own ON public.portal_notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_admin());

DROP POLICY IF EXISTS portal_notifications_own_update ON public.portal_notifications;
CREATE POLICY portal_notifications_own_update ON public.portal_notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Storage buckets (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('customer-documents', 'customer-documents', false, 26214400, ARRAY['application/pdf','image/jpeg','image/png','image/webp','text/plain']),
  ('project-files', 'project-files', false, 52428800, ARRAY['application/pdf','image/jpeg','image/png','image/webp','application/zip','text/plain']),
  ('quote-documents', 'quote-documents', false, 26214400, ARRAY['application/pdf']),
  ('invoice-documents', 'invoice-documents', false, 26214400, ARRAY['application/pdf']),
  ('support-attachments', 'support-attachments', false, 26214400, ARRAY['application/pdf','image/jpeg','image/png','image/webp','text/plain'])
ON CONFLICT (id) DO NOTHING;

-- Deny authenticated direct object access on portal buckets (signed URLs via service role after authz)
DROP POLICY IF EXISTS portal_storage_deny_authenticated ON storage.objects;
CREATE POLICY portal_storage_deny_authenticated ON storage.objects
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    bucket_id NOT IN (
      'customer-documents','project-files','quote-documents','invoice-documents','support-attachments'
    )
  )
  WITH CHECK (
    bucket_id NOT IN (
      'customer-documents','project-files','quote-documents','invoice-documents','support-attachments'
    )
  );

DROP POLICY IF EXISTS portal_storage_deny_anon ON storage.objects;
CREATE POLICY portal_storage_deny_anon ON storage.objects
  AS RESTRICTIVE FOR ALL TO anon
  USING (
    bucket_id NOT IN (
      'customer-documents','project-files','quote-documents','invoice-documents','support-attachments'
    )
  )
  WITH CHECK (
    bucket_id NOT IN (
      'customer-documents','project-files','quote-documents','invoice-documents','support-attachments'
    )
  );

-- ---------------------------------------------------------------------------
-- Verification RPC
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.portal_verify_customer_contracts()
RETURNS TABLE(check_name text, ok boolean, detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM (VALUES
    ('table:organizations', to_regclass('public.organizations') IS NOT NULL, 'organizations'),
    ('table:organization_members', to_regclass('public.organization_members') IS NOT NULL, 'organization_members'),
    ('table:organization_invitations', to_regclass('public.organization_invitations') IS NOT NULL, 'organization_invitations'),
    ('table:portal_projects', to_regclass('public.portal_projects') IS NOT NULL, 'portal_projects'),
    ('table:portal_quotes', to_regclass('public.portal_quotes') IS NOT NULL, 'portal_quotes'),
    ('table:portal_invoices', to_regclass('public.portal_invoices') IS NOT NULL, 'portal_invoices'),
    ('table:portal_files', to_regclass('public.portal_files') IS NOT NULL, 'portal_files'),
    ('table:portal_conversations', to_regclass('public.portal_conversations') IS NOT NULL, 'portal_conversations'),
    ('table:portal_messages', to_regclass('public.portal_messages') IS NOT NULL, 'portal_messages'),
    ('table:portal_support_tickets', to_regclass('public.portal_support_tickets') IS NOT NULL, 'portal_support_tickets'),
    ('table:portal_notifications', to_regclass('public.portal_notifications') IS NOT NULL, 'portal_notifications'),
    ('fn:is_org_member', to_regprocedure('public.is_org_member(uuid)') IS NOT NULL, 'is_org_member'),
    ('fn:is_staff_admin', to_regprocedure('public.is_staff_admin()') IS NOT NULL, 'is_staff_admin'),
    ('rls:organizations', (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.organizations'::regclass), 'RLS on'),
    ('rls:portal_projects', (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.portal_projects'::regclass), 'RLS on'),
    ('rls:portal_messages', (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.portal_messages'::regclass), 'RLS on'),
    ('rls:organization_internal_notes', (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.organization_internal_notes'::regclass), 'RLS on'),
    (
      'policy:org_notes_staff_only',
      EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'organization_internal_notes'
          AND policyname = 'org_notes_staff_all'
      ),
      'internal notes staff policy'
    ),
    (
      'grant:portal_verify_service_role',
      has_function_privilege('service_role', 'public.portal_verify_customer_contracts()', 'EXECUTE'),
      'service_role EXECUTE'
    ),
    (
      'grant:portal_verify_no_anon',
      NOT has_function_privilege('anon', 'public.portal_verify_customer_contracts()', 'EXECUTE'),
      'anon denied'
    )
  ) AS t(check_name, ok, detail);
END;
$$;

REVOKE ALL ON FUNCTION public.portal_verify_customer_contracts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_verify_customer_contracts() TO service_role;
