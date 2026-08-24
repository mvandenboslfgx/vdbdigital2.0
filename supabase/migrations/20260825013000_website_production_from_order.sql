-- Website production after paid order.
-- Staging-safe: additive, IF NOT EXISTS. No production apply from this file alone.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_organization_id
  ON public.orders (organization_id);

ALTER TABLE public.portal_projects
  ADD COLUMN IF NOT EXISTS source_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_portal_projects_source_order_id
  ON public.portal_projects (source_order_id)
  WHERE source_order_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.website_production_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.portal_projects(id) ON DELETE SET NULL,
  job_type text NOT NULL,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled', 'pending_review')),
  spec jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_error text,
  attempt_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, job_type)
);

CREATE INDEX IF NOT EXISTS website_production_jobs_status_idx
  ON public.website_production_jobs (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.website_intakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL UNIQUE REFERENCES public.portal_projects(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'NOT_STARTED'
    CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'NEEDS_INFO', 'APPROVED')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS website_intakes_org_idx
  ON public.website_intakes (organization_id, status);

CREATE TABLE IF NOT EXISTS public.platform_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_error text,
  attempt_count integer NOT NULL DEFAULT 0,
  next_retry_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS platform_events_status_idx
  ON public.platform_events (status, created_at DESC);

CREATE INDEX IF NOT EXISTS platform_events_type_idx
  ON public.platform_events (event_type, created_at DESC);

ALTER TABLE public.website_production_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.website_production_jobs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.website_intakes FROM PUBLIC, anon;
REVOKE ALL ON public.platform_events FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON public.website_production_jobs TO service_role;
GRANT SELECT ON public.website_production_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.website_intakes TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.platform_events TO service_role;
GRANT SELECT, UPDATE ON public.website_intakes TO authenticated;

DROP POLICY IF EXISTS website_intakes_member_select ON public.website_intakes;
CREATE POLICY website_intakes_member_select ON public.website_intakes
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id) OR public.is_staff_admin());

DROP POLICY IF EXISTS website_intakes_member_update ON public.website_intakes;
CREATE POLICY website_intakes_member_update ON public.website_intakes
  FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

DROP POLICY IF EXISTS website_jobs_staff_select ON public.website_production_jobs;
CREATE POLICY website_jobs_staff_select ON public.website_production_jobs
  FOR SELECT TO authenticated
  USING (public.is_staff_admin());
