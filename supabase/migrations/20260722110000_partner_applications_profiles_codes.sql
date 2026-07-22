-- =============================================================================
-- Partner applications, profile fields, codes (BCP-STAGING-002..004)
-- Outside production apply baseline ending at 20260719170000.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.partner_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.partner_application_status NOT NULL DEFAULT 'DRAFT',
  legal_name TEXT NOT NULL DEFAULT '',
  trade_name TEXT,
  kvk_number TEXT,
  vat_number TEXT,
  contact_email TEXT NOT NULL DEFAULT '',
  contact_phone TEXT,
  notes TEXT,
  version INT NOT NULL DEFAULT 1,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- At most one open application per user (DRAFT/SUBMITTED/IN_REVIEW)
CREATE UNIQUE INDEX IF NOT EXISTS uq_partner_applications_open_user
  ON public.partner_applications (user_id)
  WHERE status IN ('DRAFT', 'SUBMITTED', 'IN_REVIEW');

CREATE INDEX IF NOT EXISTS idx_partner_applications_user ON public.partner_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_partner_applications_status ON public.partner_applications(status);

CREATE TABLE IF NOT EXISTS public.partner_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partner_profiles(id) ON DELETE CASCADE,
  code_normalized TEXT NOT NULL,
  code_display TEXT NOT NULL,
  status public.partner_code_status NOT NULL DEFAULT 'ACTIVE',
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  CONSTRAINT partner_codes_normalized_unique UNIQUE (code_normalized)
);

CREATE INDEX IF NOT EXISTS idx_partner_codes_partner ON public.partner_codes(partner_id);

ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_codes ENABLE ROW LEVEL SECURITY;

-- Normalize helper
CREATE OR REPLACE FUNCTION public.normalize_partner_code(p_code text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(trim(p_code));
$$;

REVOKE ALL ON FUNCTION public.normalize_partner_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.normalize_partner_code(text) TO authenticated, anon;
