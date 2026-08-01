-- Legal localization architecture preparation.
-- Technical metadata only: no row is approved, made effective, or accepted here.

ALTER TABLE public.portal_files
  ADD COLUMN IF NOT EXISTS document_locale TEXT
    CHECK (document_locale IS NULL OR document_locale IN ('en', 'nl')),
  ADD COLUMN IF NOT EXISTS governing_locale TEXT
    CHECK (governing_locale IS NULL OR governing_locale IN ('en', 'nl')),
  ADD COLUMN IF NOT EXISTS document_version TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS effective_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS content_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_portal_files_legal_locale_version
  ON public.portal_files (document_locale, document_version)
  WHERE document_locale IS NOT NULL;

ALTER TABLE public.partner_agreement_versions
  ADD COLUMN IF NOT EXISTS document_locale TEXT
    CHECK (document_locale IS NULL OR document_locale IN ('en', 'nl')),
  ADD COLUMN IF NOT EXISTS governing_locale TEXT
    CHECK (governing_locale IS NULL OR governing_locale IN ('en', 'nl')),
  ADD COLUMN IF NOT EXISTS document_version TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS effective_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS content_hash TEXT;

ALTER TABLE public.partner_agreement_acceptances
  ADD COLUMN IF NOT EXISTS document_locale TEXT
    CHECK (document_locale IS NULL OR document_locale IN ('en', 'nl')),
  ADD COLUMN IF NOT EXISTS governing_locale TEXT
    CHECK (governing_locale IS NULL OR governing_locale IN ('en', 'nl')),
  ADD COLUMN IF NOT EXISTS document_version TEXT,
  ADD COLUMN IF NOT EXISTS content_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_partner_agreement_versions_locale_version
  ON public.partner_agreement_versions (
    agreement_type,
    document_locale,
    document_version
  );

COMMENT ON COLUMN public.portal_files.approved_at IS
  'Human legal approval timestamp. NULL remains a hard legal-review blocker.';
COMMENT ON COLUMN public.portal_files.effective_at IS
  'Effective timestamp set only after legal approval; this migration does not populate it.';
COMMENT ON COLUMN public.portal_files.accepted_at IS
  'Optional acceptance timestamp for a legally reviewable document; not inferred from visibility or upload.';
COMMENT ON COLUMN public.partner_agreement_versions.approved_at IS
  'Human legal approval timestamp. legal_review_status remains authoritative and REQUIRED by default.';
COMMENT ON COLUMN public.partner_agreement_versions.content_hash IS
  'Hash of the exact reviewed legal body. NULL until a reviewed immutable body exists.';
COMMENT ON COLUMN public.partner_agreement_acceptances.content_hash IS
  'Snapshot hash of the exact accepted content; never generated from placeholder text.';
