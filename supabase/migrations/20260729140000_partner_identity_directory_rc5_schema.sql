-- STATUS: LOCAL ONLY — partner identity + directory rc.5 schema foundation
-- Contract: vdb-backend-contract@0.2.0-rc.5
-- schemaVersion: 2026.07.29.partner-identity-directory-rc5
-- Target: staging only after local verify. Production NOT authorized.
--
-- Scope of this file (schema only; RPCs live in 20260729140100 / 20260729140200):
--   1. Partner identity enums (type, verification, payout profile, agreements)
--   2. Additive columns on partner_applications and partner_profiles
--   3. partner_agreement_versions + partner_agreement_acceptances (RLS on)
--   4. Placeholder agreement seed (LEGAL REVIEW REQUIRED — not binding text)
--   5. Conservative backfill of existing partners
--   6. Fail-closed feature flags
--
-- Additive only. This file never changes partner_profiles.status, never changes
-- payout_eligible and never infers partner_type from a KvK number.

-- ---------------------------------------------------------------------------
-- 1) Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.partner_type AS ENUM (
    'INDIVIDUAL', 'BUSINESS'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.partner_verification_status AS ENUM (
    'NOT_STARTED', 'PENDING', 'VERIFIED', 'REJECTED', 'MANUAL_REVIEW', 'EXPIRED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.partner_payout_profile_status AS ENUM (
    'NOT_STARTED', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED', 'REVIEW_REQUIRED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.partner_agreement_type AS ENUM (
    'INDIVIDUAL_PARTNER', 'BUSINESS_PARTNER'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.partner_type_classification_status AS ENUM (
    'UNKNOWN', 'KNOWN', 'REVIEW_REQUIRED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 2a) partner_applications
-- ---------------------------------------------------------------------------
ALTER TABLE public.partner_applications
  ADD COLUMN IF NOT EXISTS partner_type public.partner_type,
  ADD COLUMN IF NOT EXISTS staff_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS staff_approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.partner_applications.partner_type IS
  'rc.5 — INDIVIDUAL (particulier) or BUSINESS. NULL means the applicant predates typed intake; never inferred from kvk_number.';
COMMENT ON COLUMN public.partner_applications.staff_approved_at IS
  'rc.5 — moment a staff reviewer approved this application. Approval alone never activates a partner.';
COMMENT ON COLUMN public.partner_applications.staff_approved_by IS
  'rc.5 — staff user who recorded the approval.';

CREATE INDEX IF NOT EXISTS idx_partner_applications_partner_type
  ON public.partner_applications (partner_type);

-- ---------------------------------------------------------------------------
-- 2b) partner_profiles
-- ---------------------------------------------------------------------------
ALTER TABLE public.partner_profiles
  ADD COLUMN IF NOT EXISTS partner_type public.partner_type,
  ADD COLUMN IF NOT EXISTS type_classification_status public.partner_type_classification_status
    NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN IF NOT EXISTS age_verification_status public.partner_verification_status
    NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN IF NOT EXISTS age_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS age_verification_source text,
  ADD COLUMN IF NOT EXISTS age_verification_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS identity_verification_status public.partner_verification_status
    NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN IF NOT EXISTS identity_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS identity_verification_provider_ref text,
  ADD COLUMN IF NOT EXISTS business_verification_status public.partner_verification_status
    NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN IF NOT EXISTS business_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS business_verification_provider_ref text,
  ADD COLUMN IF NOT EXISTS payout_profile_status public.partner_payout_profile_status
    NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN IF NOT EXISTS payout_profile_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS staff_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS staff_approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS legacy_activation_grandfathered boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS activation_block_codes text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS required_agreement_type public.partner_agreement_type,
  ADD COLUMN IF NOT EXISTS required_agreement_version text;

COMMENT ON COLUMN public.partner_profiles.partner_type IS
  'rc.5 — canonical partner type. NULL until a typed intake or staff classification sets it.';
COMMENT ON COLUMN public.partner_profiles.type_classification_status IS
  'rc.5 — UNKNOWN (never classified), KNOWN (typed intake), REVIEW_REQUIRED (legacy row awaiting staff classification).';
COMMENT ON COLUMN public.partner_profiles.age_verification_status IS
  'rc.5 — 18+ gate. Only VERIFIED (and not expired) satisfies the activation checklist.';
COMMENT ON COLUMN public.partner_profiles.age_verification_source IS
  'rc.5 — free-text provenance label (e.g. provider name or staff process). Never store document data here.';
COMMENT ON COLUMN public.partner_profiles.identity_verification_provider_ref IS
  'rc.5 — opaque provider reference. Never store identity document contents or numbers.';
COMMENT ON COLUMN public.partner_profiles.business_verification_status IS
  'rc.5 — company verification. Stays NOT_STARTED and is not required for INDIVIDUAL partners.';
COMMENT ON COLUMN public.partner_profiles.payout_profile_status IS
  'rc.5 — payout profile review state. payout_eligible may only become true while this is APPROVED.';
COMMENT ON COLUMN public.partner_profiles.staff_approved_at IS
  'rc.5 — staff approval marker mirrored from the partner application. Approval alone never activates.';
COMMENT ON COLUMN public.partner_profiles.legacy_activation_grandfathered IS
  'rc.5 — TRUE for partners that were already ACTIVE before the rc.5 activation checklist existed.';
COMMENT ON COLUMN public.partner_profiles.activation_block_codes IS
  'rc.5 — last known blocking codes from partner_activation_checklist (diagnostic only, never an authorization source).';
COMMENT ON COLUMN public.partner_profiles.required_agreement_type IS
  'rc.5 — agreement family the partner must accept: INDIVIDUAL → INDIVIDUAL_PARTNER, BUSINESS → BUSINESS_PARTNER.';

CREATE INDEX IF NOT EXISTS idx_partner_profiles_partner_type
  ON public.partner_profiles (partner_type);
CREATE INDEX IF NOT EXISTS idx_partner_profiles_type_classification_status
  ON public.partner_profiles (type_classification_status);

-- ---------------------------------------------------------------------------
-- 3) Agreement catalogue + acceptances
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_agreement_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_type public.partner_agreement_type NOT NULL,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  body_placeholder TEXT NOT NULL
    DEFAULT 'LEGAL_REVIEW_REQUIRED — placeholder only; not a binding legal text.',
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  legal_review_status TEXT NOT NULL DEFAULT 'REQUIRED',
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT partner_agreement_versions_type_version_unique UNIQUE (agreement_type, version)
);

-- At most one current version per agreement family: the activation checklist
-- resolves "the" current agreement and must never see two candidates.
CREATE UNIQUE INDEX IF NOT EXISTS uq_partner_agreement_versions_current
  ON public.partner_agreement_versions (agreement_type)
  WHERE is_current;

COMMENT ON TABLE public.partner_agreement_versions IS
  'rc.5 — partner agreement catalogue. Bodies are placeholders pending legal review; nothing here is a binding legal text.';
COMMENT ON COLUMN public.partner_agreement_versions.legal_review_status IS
  'rc.5 — REQUIRED until legal signs off. Staff must not present a REQUIRED body as a final agreement.';

CREATE TABLE IF NOT EXISTS public.partner_agreement_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partner_profiles(id) ON DELETE CASCADE,
  agreement_version_id UUID NOT NULL REFERENCES public.partner_agreement_versions(id),
  agreement_type public.partner_agreement_type NOT NULL,
  agreement_version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_by_user_id UUID NOT NULL REFERENCES public.profiles(id),
  integrity_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT partner_agreement_acceptances_partner_version_unique UNIQUE (partner_id, agreement_version_id)
);

CREATE INDEX IF NOT EXISTS idx_partner_agreement_acceptances_partner
  ON public.partner_agreement_acceptances (partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_agreement_acceptances_version
  ON public.partner_agreement_acceptances (agreement_version_id);

COMMENT ON TABLE public.partner_agreement_acceptances IS
  'rc.5 — immutable record that a partner accepted one agreement version. Written by accept_partner_agreement only.';

ALTER TABLE public.partner_agreement_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_agreement_acceptances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS partner_agreement_versions_deny_anon ON public.partner_agreement_versions;
CREATE POLICY partner_agreement_versions_deny_anon ON public.partner_agreement_versions
  AS RESTRICTIVE FOR ALL TO anon
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS partner_agreement_versions_select_authenticated ON public.partner_agreement_versions;
CREATE POLICY partner_agreement_versions_select_authenticated ON public.partner_agreement_versions
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS partner_agreement_versions_staff_all ON public.partner_agreement_versions;
CREATE POLICY partner_agreement_versions_staff_all ON public.partner_agreement_versions
  FOR ALL TO authenticated
  USING (public.is_staff_admin())
  WITH CHECK (public.is_staff_admin());

DROP POLICY IF EXISTS partner_agreement_acceptances_deny_anon ON public.partner_agreement_acceptances;
CREATE POLICY partner_agreement_acceptances_deny_anon ON public.partner_agreement_acceptances
  AS RESTRICTIVE FOR ALL TO anon
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS partner_agreement_acceptances_select_own ON public.partner_agreement_acceptances;
CREATE POLICY partner_agreement_acceptances_select_own ON public.partner_agreement_acceptances
  FOR SELECT TO authenticated
  USING (public.is_staff_admin() OR public.partner_owns_profile(partner_id));

DROP POLICY IF EXISTS partner_agreement_acceptances_staff_all ON public.partner_agreement_acceptances;
CREATE POLICY partner_agreement_acceptances_staff_all ON public.partner_agreement_acceptances
  FOR ALL TO authenticated
  USING (public.is_staff_admin())
  WITH CHECK (public.is_staff_admin());

REVOKE ALL ON TABLE public.partner_agreement_versions FROM PUBLIC;
REVOKE ALL ON TABLE public.partner_agreement_versions FROM anon;
REVOKE ALL ON TABLE public.partner_agreement_acceptances FROM PUBLIC;
REVOKE ALL ON TABLE public.partner_agreement_acceptances FROM anon;

-- Reads only: acceptances are written by SECURITY DEFINER RPCs.
GRANT SELECT ON TABLE public.partner_agreement_versions TO authenticated;
GRANT SELECT ON TABLE public.partner_agreement_acceptances TO authenticated;

-- ---------------------------------------------------------------------------
-- 4) Placeholder agreements (LEGAL REVIEW REQUIRED)
-- ---------------------------------------------------------------------------
INSERT INTO public.partner_agreement_versions (
  agreement_type, version, title, body_placeholder, is_required, is_current, legal_review_status
) VALUES
  (
    'INDIVIDUAL_PARTNER',
    'v0.0.0-draft',
    'Partnerovereenkomst particulier (concept)',
    'LEGAL_REVIEW_REQUIRED — placeholder only; not a binding legal text. Awaiting legal review before any partner may be held to it.',
    true,
    true,
    'REQUIRED'
  ),
  (
    'BUSINESS_PARTNER',
    'v0.0.0-draft',
    'Partnerovereenkomst zakelijk (concept)',
    'LEGAL_REVIEW_REQUIRED — placeholder only; not a binding legal text. Awaiting legal review before any partner may be held to it.',
    true,
    true,
    'REQUIRED'
  )
ON CONFLICT ON CONSTRAINT partner_agreement_versions_type_version_unique DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5) Conservative backfill
--    Status, payout_eligible and compliance_status are intentionally untouched.
-- ---------------------------------------------------------------------------
UPDATE public.partner_profiles
SET type_classification_status = 'REVIEW_REQUIRED',
    updated_at = NOW()
WHERE partner_type IS NULL
  AND type_classification_status = 'UNKNOWN';

UPDATE public.partner_profiles
SET legacy_activation_grandfathered = true,
    updated_at = NOW()
WHERE status = 'ACTIVE'
  AND legacy_activation_grandfathered = false;

-- ---------------------------------------------------------------------------
-- 6) Feature flags (fail-closed)
-- ---------------------------------------------------------------------------
INSERT INTO public.feature_flags (key, enabled, description)
VALUES
  ('partner_compliance_fixtures', false,
   'FAIL-CLOSED — staging-only synthetic compliance fixtures for partner verification statuses'),
  ('support_internal_notes_rpc', false,
   'FAIL-CLOSED by default — internal support notes RPC; operator may enable on staging')
ON CONFLICT (key) DO NOTHING;
;
