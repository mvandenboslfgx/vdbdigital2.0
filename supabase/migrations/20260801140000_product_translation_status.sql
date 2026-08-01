-- =============================================================================
-- Phase 4: product_translations SSOT foundation — workflow status gate
-- =============================================================================
-- Additive only. Depends on 20260716200000_catalog_admin.sql (product_translations).
-- NOT applied to staging/production in this workstream.
-- Does not modify any existing migration file.
--
-- Purpose: let the storefront eventually read localized copy directly from
-- product_translations, while guaranteeing that machine-generated content can
-- never reach the public site without an explicit human promotion step.
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE product_translation_status AS ENUM (
    'draft',
    'machine_translated',
    'needs_review',
    'approved',
    'published',
    'stale'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE product_translations
  ADD COLUMN IF NOT EXISTS status product_translation_status NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS source_hash TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Fast lookup for the storefront's "give me published copy for this locale" query.
CREATE INDEX IF NOT EXISTS idx_product_translations_locale_status_published
  ON product_translations (locale, status)
  WHERE status = 'published';

COMMENT ON COLUMN product_translations.status IS
  'Translation workflow gate: draft -> machine_translated|needs_review -> approved -> published (or stale on source drift). '
  'machine_translated NEVER auto-publishes to the storefront — only status = published (or approved, for gated admin preview) '
  'is ever surfaced to visitors. Promotion to published always requires an explicit human action.';

COMMENT ON COLUMN product_translations.source_hash IS
  'Hash of the EN source content this translation was generated/reviewed against — used to detect staleness (source changed after translation).';

COMMENT ON COLUMN product_translations.reviewed_at IS
  'Timestamp of the last human review action (e.g. needs_review -> approved). NULL when never reviewed by a person.';

COMMENT ON COLUMN product_translations.published_at IS
  'Timestamp the translation was promoted to status = published. NULL when never published.';
