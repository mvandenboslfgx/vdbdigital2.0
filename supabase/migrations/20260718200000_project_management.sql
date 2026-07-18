-- Project management foundation (forward-only, local apply only).
-- Canonical tables remain portal_* (no second projects model).
-- CHECKOUT_ENABLED / Mollie / remote apply: out of scope.

-- ---------------------------------------------------------------------------
-- Enums / helpers
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.portal_project_member_role AS ENUM (
    'PROJECT_MANAGER', 'DEVELOPER', 'DESIGNER', 'CONTENT_EDITOR', 'SUPPORT', 'VIEWER'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.portal_milestone_status AS ENUM (
    'NOT_STARTED', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'COMPLETED', 'SKIPPED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.portal_action_assignee AS ENUM (
    'INTERNAL', 'CUSTOMER', 'UNASSIGNED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.portal_action_status AS ENUM (
    'OPEN', 'IN_PROGRESS', 'WAITING', 'COMPLETED', 'CANCELED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.portal_activity_visibility AS ENUM (
    'INTERNAL', 'CUSTOMER_VISIBLE'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE SEQUENCE IF NOT EXISTS public.portal_project_number_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_portal_project_number()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  n bigint;
BEGIN
  n := nextval('public.portal_project_number_seq');
  RETURN 'PRJ-' || to_char(NOW() AT TIME ZONE 'UTC', 'YYYY') || '-' || lpad(n::text, 5, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.generate_portal_project_number() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_portal_project_number() TO service_role;

-- ---------------------------------------------------------------------------
-- portal_projects extensions
-- ---------------------------------------------------------------------------
ALTER TABLE public.portal_projects
  ADD COLUMN IF NOT EXISTS project_number TEXT,
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'INTERNAL'
    CHECK (visibility IN ('INTERNAL', 'CUSTOMER_VISIBLE')),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Harden defaults: drafts are internal unless explicitly shared
ALTER TABLE public.portal_projects
  ALTER COLUMN customer_visible SET DEFAULT FALSE;

UPDATE public.portal_projects
SET project_number = public.generate_portal_project_number()
WHERE project_number IS NULL;

UPDATE public.portal_projects
SET slug = lower(regexp_replace(coalesce(name, 'project'), '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL OR btrim(slug) = '';

UPDATE public.portal_projects
SET visibility = CASE WHEN customer_visible THEN 'CUSTOMER_VISIBLE' ELSE 'INTERNAL' END
WHERE visibility IS DISTINCT FROM CASE WHEN customer_visible THEN 'CUSTOMER_VISIBLE' ELSE 'INTERNAL' END;

ALTER TABLE public.portal_projects
  ALTER COLUMN project_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_portal_projects_project_number
  ON public.portal_projects(project_number);

CREATE INDEX IF NOT EXISTS idx_portal_projects_status
  ON public.portal_projects(status);

CREATE INDEX IF NOT EXISTS idx_portal_projects_manager
  ON public.portal_projects(project_manager_id);

CREATE OR REPLACE FUNCTION public.portal_projects_sync_visibility()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.visibility = 'CUSTOMER_VISIBLE' THEN
      NEW.customer_visible := TRUE;
    ELSE
      NEW.customer_visible := FALSE;
      NEW.visibility := 'INTERNAL';
    END IF;
    IF NEW.status = 'DRAFT' AND TG_OP = 'INSERT' AND NEW.visibility IS DISTINCT FROM 'CUSTOMER_VISIBLE' THEN
      NEW.visibility := 'INTERNAL';
      NEW.customer_visible := FALSE;
    END IF;
    NEW.updated_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_portal_projects_sync_visibility ON public.portal_projects;
CREATE TRIGGER trg_portal_projects_sync_visibility
  BEFORE INSERT OR UPDATE ON public.portal_projects
  FOR EACH ROW EXECUTE FUNCTION public.portal_projects_sync_visibility();

-- ---------------------------------------------------------------------------
-- Milestones extensions
-- ---------------------------------------------------------------------------
ALTER TABLE public.portal_project_milestones
  ADD COLUMN IF NOT EXISTS status public.portal_milestone_status NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN IF NOT EXISTS requires_customer_action BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE public.portal_project_milestones
SET status = 'COMPLETED'
WHERE completed_at IS NOT NULL AND status = 'NOT_STARTED';

-- ---------------------------------------------------------------------------
-- Deliverables extensions (replace status check)
-- ---------------------------------------------------------------------------
ALTER TABLE public.portal_project_deliverables
  ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;

-- Migrate legacy PENDING → DRAFT via unconstrained temp
ALTER TABLE public.portal_project_deliverables
  DROP CONSTRAINT IF EXISTS portal_project_deliverables_status_check;

UPDATE public.portal_project_deliverables
SET status = 'DRAFT'
WHERE status = 'PENDING';

ALTER TABLE public.portal_project_deliverables
  ADD CONSTRAINT portal_project_deliverables_status_check
  CHECK (status IN ('DRAFT', 'IN_REVIEW', 'SHARED', 'APPROVED', 'REJECTED', 'SUPERSEDED', 'PENDING'));

-- Visibility: only SHARED+ may be customer_visible
CREATE OR REPLACE FUNCTION public.portal_deliverables_visibility_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.customer_visible AND NEW.status NOT IN ('SHARED', 'APPROVED', 'REJECTED') THEN
    NEW.customer_visible := FALSE;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_portal_deliverables_visibility ON public.portal_project_deliverables;
CREATE TRIGGER trg_portal_deliverables_visibility
  BEFORE INSERT OR UPDATE ON public.portal_project_deliverables
  FOR EACH ROW EXECUTE FUNCTION public.portal_deliverables_visibility_guard();

-- ---------------------------------------------------------------------------
-- Feedback extensions
-- ---------------------------------------------------------------------------
ALTER TABLE public.portal_project_feedback
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'CUSTOMER_SHARED'
    CHECK (visibility IN ('INTERNAL', 'CUSTOMER_SHARED')),
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'ARCHIVED')),
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE public.portal_project_feedback f
SET organization_id = p.organization_id
FROM public.portal_projects p
WHERE f.project_id = p.id AND f.organization_id IS NULL;

-- ---------------------------------------------------------------------------
-- New tables: members, actions, activity
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.portal_project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.portal_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_role public.portal_project_member_role NOT NULL DEFAULT 'VIEWER',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_portal_project_members_user
  ON public.portal_project_members(user_id);

CREATE TABLE IF NOT EXISTS public.portal_project_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.portal_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to_type public.portal_action_assignee NOT NULL DEFAULT 'UNASSIGNED',
  assigned_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  status public.portal_action_status NOT NULL DEFAULT 'OPEN',
  priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  due_date DATE,
  customer_visible BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_project_actions_project
  ON public.portal_project_actions(project_id);

CREATE TABLE IF NOT EXISTS public.portal_project_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.portal_projects(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  visibility public.portal_activity_visibility NOT NULL DEFAULT 'INTERNAL',
  summary TEXT NOT NULL,
  metadata_safe JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_project_activity_project
  ON public.portal_project_activity(project_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.portal_project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_project_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_project_activity ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.portal_project_members FROM anon, authenticated;
REVOKE ALL ON public.portal_project_actions FROM anon, authenticated;
REVOKE ALL ON public.portal_project_activity FROM anon, authenticated;

GRANT SELECT ON public.portal_project_members TO authenticated;
GRANT SELECT ON public.portal_project_actions TO authenticated;
GRANT SELECT ON public.portal_project_activity TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.portal_project_feedback TO authenticated;

-- Staff writes via service_role (app layer). Customers: SELECT (+ feedback insert already).

DROP POLICY IF EXISTS portal_project_members_select ON public.portal_project_members;
CREATE POLICY portal_project_members_select ON public.portal_project_members
  FOR SELECT TO authenticated
  USING (public.is_staff_admin());

DROP POLICY IF EXISTS portal_project_actions_member_select ON public.portal_project_actions;
CREATE POLICY portal_project_actions_member_select ON public.portal_project_actions
  FOR SELECT TO authenticated
  USING (
    public.is_staff_admin()
    OR (
      customer_visible
      AND assigned_to_type = 'CUSTOMER'
      AND EXISTS (
        SELECT 1 FROM public.portal_projects p
        WHERE p.id = project_id
          AND p.customer_visible
          AND p.archived_at IS NULL
          AND public.is_org_member(p.organization_id)
      )
    )
  );

DROP POLICY IF EXISTS portal_project_activity_member_select ON public.portal_project_activity;
CREATE POLICY portal_project_activity_member_select ON public.portal_project_activity
  FOR SELECT TO authenticated
  USING (
    public.is_staff_admin()
    OR (
      visibility = 'CUSTOMER_VISIBLE'
      AND EXISTS (
        SELECT 1 FROM public.portal_projects p
        WHERE p.id = project_id
          AND p.customer_visible
          AND public.is_org_member(p.organization_id)
      )
    )
  );

-- Tighten project SELECT: hide archived from customers by default
DROP POLICY IF EXISTS portal_projects_member_select ON public.portal_projects;
CREATE POLICY portal_projects_member_select ON public.portal_projects
  FOR SELECT TO authenticated
  USING (
    public.is_staff_admin()
    OR (
      customer_visible
      AND archived_at IS NULL
      AND public.is_org_member(organization_id)
    )
  );

-- Feedback: customers only CUSTOMER_SHARED for own org
DROP POLICY IF EXISTS portal_feedback_member ON public.portal_project_feedback;
CREATE POLICY portal_feedback_member ON public.portal_project_feedback
  FOR SELECT TO authenticated
  USING (
    public.is_staff_admin()
    OR (
      visibility = 'CUSTOMER_SHARED'
      AND status <> 'ARCHIVED'
      AND EXISTS (
        SELECT 1 FROM public.portal_projects p
        WHERE p.id = project_id
          AND p.customer_visible
          AND public.is_org_member(p.organization_id)
      )
    )
  );

DROP POLICY IF EXISTS portal_feedback_member_insert ON public.portal_project_feedback;
CREATE POLICY portal_feedback_member_insert ON public.portal_project_feedback
  FOR INSERT TO authenticated
  WITH CHECK (
    author_user_id = auth.uid()
    AND visibility = 'CUSTOMER_SHARED'
    AND EXISTS (
      SELECT 1 FROM public.portal_projects p
      WHERE p.id = project_id
        AND p.customer_visible
        AND p.archived_at IS NULL
        AND public.is_org_member(p.organization_id)
        AND (organization_id IS NULL OR organization_id = p.organization_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Verification RPC (fail-closed)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_project_management_contracts()
RETURNS TABLE (check_name text, ok boolean, detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH checks AS (
    SELECT * FROM (VALUES
      (
        'table:portal_projects',
        to_regclass('public.portal_projects') IS NOT NULL,
        'portal_projects'
      ),
      (
        'table:portal_project_members',
        to_regclass('public.portal_project_members') IS NOT NULL,
        'portal_project_members'
      ),
      (
        'table:portal_project_actions',
        to_regclass('public.portal_project_actions') IS NOT NULL,
        'portal_project_actions'
      ),
      (
        'table:portal_project_activity',
        to_regclass('public.portal_project_activity') IS NOT NULL,
        'portal_project_activity'
      ),
      (
        'table:portal_project_milestones',
        to_regclass('public.portal_project_milestones') IS NOT NULL,
        'portal_project_milestones'
      ),
      (
        'table:portal_project_deliverables',
        to_regclass('public.portal_project_deliverables') IS NOT NULL,
        'portal_project_deliverables'
      ),
      (
        'col:portal_projects.project_number',
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'portal_projects'
            AND column_name = 'project_number' AND is_nullable = 'NO'
        ),
        'project_number NOT NULL'
      ),
      (
        'col:portal_projects.version',
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'portal_projects'
            AND column_name = 'version'
        ),
        'version'
      ),
      (
        'uniq:project_number',
        EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE schemaname = 'public' AND indexname = 'uq_portal_projects_project_number'
        ),
        'unique project_number'
      ),
      (
        'rls:portal_projects',
        (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.portal_projects'::regclass),
        'RLS on'
      ),
      (
        'rls:portal_project_actions',
        (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.portal_project_actions'::regclass),
        'RLS on'
      ),
      (
        'rls:portal_project_activity',
        (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.portal_project_activity'::regclass),
        'RLS on'
      ),
      (
        'rls:portal_project_members',
        (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.portal_project_members'::regclass),
        'RLS on'
      ),
      (
        'anon_deny:portal_projects',
        NOT has_table_privilege('anon', 'public.portal_projects', 'SELECT'),
        'anon no SELECT'
      ),
      (
        'anon_deny:portal_project_actions',
        NOT has_table_privilege('anon', 'public.portal_project_actions', 'SELECT'),
        'anon no SELECT'
      ),
      (
        'policy:projects_member_select',
        EXISTS (
          SELECT 1 FROM pg_policies
          WHERE schemaname = 'public' AND tablename = 'portal_projects'
            AND policyname = 'portal_projects_member_select'
        ),
        'member select policy'
      ),
      (
        'helper:is_org_member',
        EXISTS (
          SELECT 1 FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public' AND p.proname = 'is_org_member'
        ),
        'is_org_member'
      ),
      (
        'no_checkout_column',
        NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'portal_projects'
            AND column_name IN ('mollie_payment_id', 'checkout_session_id')
        ),
        'no payment coupling'
      )
    ) AS t(check_name, ok, detail)
  )
  SELECT c.check_name, c.ok, c.detail FROM checks c;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_project_management_contracts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_project_management_contracts() TO service_role;
