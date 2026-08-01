-- Legal document version + acceptance architecture — technical scaffolding only.
-- No legal document content is authored, approved, made effective, or seeded
-- in this migration. `approved_at` and `effective_at` must never be set by
-- application code or a future migration without a documented human legal
-- review; see column comments below. Additive only — this migration does not
-- alter `portal_files`, `partner_agreement_versions`, or
-- `partner_agreement_acceptances` (see `20260801013715_legal_document_localization_prep.sql`
-- for that separate, partner/portal-scoped locale metadata).
--
-- Scope: marketing-site legal documents only (terms, privacy, cookies,
-- refund policy — `src/app/(legal)/**`). Distinct problem from partner
-- agreements / portal file legal metadata.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Versions: one immutable row per (document_key, document_locale, document_version)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.legal_document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- e.g. "terms", "privacy", "cookies", "refund-policy" — matches src/i18n/config.ts paths.
  document_key TEXT NOT NULL CHECK (btrim(document_key) <> ''),
  document_locale TEXT NOT NULL CHECK (document_locale IN ('en', 'nl')),
  -- The locale whose wording is legally authoritative when translations diverge.
  governing_locale TEXT NOT NULL CHECK (governing_locale IN ('en', 'nl')),
  document_version TEXT NOT NULL CHECK (btrim(document_version) <> ''),
  -- Hash of the exact reviewed legal body. NULL until a reviewed immutable body exists.
  content_hash TEXT,
  approved_at TIMESTAMPTZ,
  effective_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_key, document_locale, document_version)
);

CREATE INDEX IF NOT EXISTS idx_legal_document_versions_key_locale
  ON public.legal_document_versions (document_key, document_locale);

CREATE INDEX IF NOT EXISTS idx_legal_document_versions_effective
  ON public.legal_document_versions (document_key, document_locale, effective_at DESC)
  WHERE effective_at IS NOT NULL;

COMMENT ON TABLE public.legal_document_versions IS
  'Immutable legal document version metadata for marketing-site legal pages. Technical scaffolding only — no content stored here, no rows seeded by migration.';
COMMENT ON COLUMN public.legal_document_versions.approved_at IS
  'Human legal approval timestamp. Must NEVER be set by application code, a seed script, or a migration — this is a hard legal-review blocker until a person sets it through a reviewed operator workflow.';
COMMENT ON COLUMN public.legal_document_versions.effective_at IS
  'Effective (published/enforceable) timestamp. Must only be set after approved_at is set by legal review. This migration does not populate either column.';
COMMENT ON COLUMN public.legal_document_versions.governing_locale IS
  'Locale whose text controls in case of translation conflict — set by legal review, not inferred from document_locale.';
COMMENT ON COLUMN public.legal_document_versions.content_hash IS
  'Hash of the exact reviewed legal body for a given version. NULL until a reviewed immutable body exists; never populated from placeholder or draft text.';

-- ---------------------------------------------------------------------------
-- Acceptances: separate from versions — one row per user acceptance event.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.legal_document_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_version_id UUID NOT NULL
    REFERENCES public.legal_document_versions(id) ON DELETE RESTRICT,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_locale TEXT NOT NULL CHECK (accepted_locale IN ('en', 'nl')),
  -- Hashed, not raw — never store a plaintext IP address for an acceptance record.
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, document_version_id)
);

CREATE INDEX IF NOT EXISTS idx_legal_document_acceptances_user
  ON public.legal_document_acceptances (user_id, accepted_at DESC);

CREATE INDEX IF NOT EXISTS idx_legal_document_acceptances_version
  ON public.legal_document_acceptances (document_version_id);

COMMENT ON TABLE public.legal_document_acceptances IS
  'Per-user acceptance events for a specific legal_document_versions row. Not seeded; no acceptance exists until a real user action creates one.';
COMMENT ON COLUMN public.legal_document_acceptances.ip_hash IS
  'Optional hashed IP for abuse/fraud review. Never store a raw/plaintext IP address here.';

-- ---------------------------------------------------------------------------
-- RLS — deny-all for anon; no authenticated policy granted yet.
-- Only service_role (server-side, RLS-bypassing) may read/write until a
-- follow-up migration adds narrowly-scoped authenticated policies (e.g. a
-- user reading their own acceptance history from the portal).
-- ---------------------------------------------------------------------------
ALTER TABLE public.legal_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_document_versions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.legal_document_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_document_acceptances FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.legal_document_versions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.legal_document_acceptances FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS legal_document_versions_deny_anon ON public.legal_document_versions;
CREATE POLICY legal_document_versions_deny_anon ON public.legal_document_versions
  AS RESTRICTIVE
  FOR ALL TO anon
  USING (FALSE)
  WITH CHECK (FALSE);

DROP POLICY IF EXISTS legal_document_acceptances_deny_anon ON public.legal_document_acceptances;
CREATE POLICY legal_document_acceptances_deny_anon ON public.legal_document_acceptances
  AS RESTRICTIVE
  FOR ALL TO anon
  USING (FALSE)
  WITH CHECK (FALSE);

-- ---------------------------------------------------------------------------
-- Verification RPC (service_role only) — no content assertions, structure only.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_legal_document_versions_contracts()
RETURNS TABLE (check_name text, ok boolean, detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM (VALUES
    (
      'table:legal_document_versions',
      to_regclass('public.legal_document_versions') IS NOT NULL,
      'versions table exists'
    ),
    (
      'table:legal_document_acceptances',
      to_regclass('public.legal_document_acceptances') IS NOT NULL,
      'acceptances table exists'
    ),
    (
      'rls:legal_document_versions',
      (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.legal_document_versions'::regclass),
      'RLS enabled'
    ),
    (
      'rls:legal_document_acceptances',
      (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.legal_document_acceptances'::regclass),
      'RLS enabled'
    ),
    (
      'anon_deny:legal_document_versions',
      NOT has_table_privilege('anon', 'public.legal_document_versions', 'SELECT'),
      'anon has no privileges'
    ),
    (
      'anon_deny:legal_document_acceptances',
      NOT has_table_privilege('anon', 'public.legal_document_acceptances', 'SELECT'),
      'anon has no privileges'
    ),
    (
      'no_seeded_approvals',
      NOT EXISTS (SELECT 1 FROM public.legal_document_versions WHERE approved_at IS NOT NULL),
      'no row has been approved by this migration'
    ),
    (
      'no_seeded_content',
      NOT EXISTS (SELECT 1 FROM public.legal_document_versions),
      'no legal document content has been seeded'
    )
  ) AS t(check_name, ok, detail);
END;
$$;

REVOKE ALL ON FUNCTION public.verify_legal_document_versions_contracts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_legal_document_versions_contracts() TO service_role;
