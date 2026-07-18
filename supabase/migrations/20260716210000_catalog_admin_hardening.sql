-- =============================================================================
-- Catalog admin hardening (forward-only; does NOT edit 20260716200000)
-- Independent of P0.5 payment migrations. Do NOT apply until catalog dry-run gate.
-- =============================================================================

-- Unique translation slug per locale (active marketing URLs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_translations_locale_slug
  ON product_translations (locale, slug)
  WHERE slug IS NOT NULL AND length(trim(slug)) > 0;

-- Prevent duplicate storage paths
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_media_storage_path
  ON product_media (storage_path);

-- MIME allowlist at DB layer (defense in depth; app also validates)
DO $$ BEGIN
  ALTER TABLE product_media
    ADD CONSTRAINT product_media_mime_allowed
    CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp', 'image/gif'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Ensure version stays positive (optimistic concurrency)
DO $$ BEGIN
  ALTER TABLE products
    ADD CONSTRAINT products_version_positive
    CHECK (version >= 1);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON INDEX idx_product_translations_locale_slug IS
  'Prevents duplicate public slugs within a locale.';
