-- =============================================================================
-- Partner identity foundation (BCP-STAGING-001)
-- Local-only. Does not enable checkout. Does not touch remote.
-- Outside production apply baseline ending at 20260719170000.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.partner_application_status AS ENUM (
    'DRAFT', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'WITHDRAWN'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.partner_profile_status AS ENUM (
    'PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.partner_code_status AS ENUM (
    'ACTIVE', 'REVOKED', 'EXPIRED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.partner_lead_status AS ENUM (
    'NEW', 'IN_REVIEW', 'ASSIGNED', 'CONVERTED', 'REJECTED', 'CLOSED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.partner_sale_status AS ENUM (
    'PENDING', 'CONFIRMED', 'SETTLED', 'CANCELLED', 'REVERSED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.partner_commission_status AS ENUM (
    'PENDING', 'ELIGIBLE', 'APPROVED', 'PAID', 'REVERSED', 'ADJUSTED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.partner_payout_request_status AS ENUM (
    'REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.partner_payout_status AS ENUM (
    'PENDING', 'PAID', 'FAILED', 'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.partner_ledger_account AS ENUM (
    'COMMISSION_LIABILITY',
    'PAYOUT_CLEARING',
    'CASH',
    'ADJUSTMENT',
    'REVENUE_CLEARING'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- Partner profile (canonical identity; PENDING ≈ partner_pending, ACTIVE ≈ partner)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.partner_profile_status NOT NULL DEFAULT 'PENDING',
  display_name TEXT,
  legal_name TEXT,
  payout_eligible BOOLEAN NOT NULL DEFAULT FALSE,
  compliance_status TEXT NOT NULL DEFAULT 'UNKNOWN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  suspended_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_partner_profiles_user ON public.partner_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_partner_profiles_status ON public.partner_profiles(status);

ALTER TABLE public.partner_profiles ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.partner_profiles IS
  'Canonical partner identity. Status PENDING≈partner_pending, ACTIVE≈partner. Not stored in admin_roles.';

-- ---------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER, fixed search_path) — after table exists
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_active_partner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.partner_profiles pp
    JOIN public.profiles p ON p.id = pp.user_id
    WHERE pp.user_id = auth.uid()
      AND pp.status = 'ACTIVE'
      AND p.is_active IS DISTINCT FROM FALSE
  );
$$;

CREATE OR REPLACE FUNCTION public.partner_owns_profile(p_partner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.partner_profiles pp
    WHERE pp.id = p_partner_id
      AND pp.user_id = auth.uid()
      AND pp.status IN ('ACTIVE', 'PENDING', 'SUSPENDED')
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_partner() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_partner() TO authenticated;
REVOKE ALL ON FUNCTION public.partner_owns_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.partner_owns_profile(uuid) TO authenticated;
