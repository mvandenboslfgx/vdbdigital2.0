-- =============================================================================
-- Catalog admin: product/category CMS extensions
-- =============================================================================
-- INDEPENDENT of P0.5 payment migrations (202607160*).
-- Do NOT apply until a separate catalog migration gate passes.
-- Marketing site keeps working without this migration (code falls back gracefully).
-- =============================================================================

-- Publication workflow statuses (additive; existing DRAFT/PUBLISHED/ARCHIVED remain)
DO $$ BEGIN
  ALTER TYPE product_status ADD VALUE IF NOT EXISTS 'REVIEW';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE product_status ADD VALUE IF NOT EXISTS 'HIDDEN';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE price_mode AS ENUM ('FIXED', 'STARTING_FROM', 'QUOTE_ONLY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE price_approval_status AS ENUM (
    'DRAFT', 'INTERNAL_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE legal_approval_status AS ENUM (
    'NOT_REVIEWED',
    'INTERNAL_REVIEW',
    'LEGAL_REVIEW_REQUIRED',
    'APPROVED_FOR_B2B',
    'APPROVED_FOR_B2C',
    'APPROVED_FOR_BOTH'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Products: commercial + content extensions (no auto-approval defaults)
-- ---------------------------------------------------------------------------
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS internal_sku TEXT,
  ADD COLUMN IF NOT EXISTS price_mode price_mode,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS vat_percent INT NOT NULL DEFAULT 21
    CHECK (vat_percent >= 0 AND vat_percent <= 100),
  ADD COLUMN IF NOT EXISTS price_includes_vat BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS compare_at_cents INT CHECK (compare_at_cents IS NULL OR compare_at_cents >= 0),
  ADD COLUMN IF NOT EXISTS price_label TEXT,
  ADD COLUMN IF NOT EXISTS cost_cents INT CHECK (cost_cents IS NULL OR cost_cents >= 0),
  ADD COLUMN IF NOT EXISTS badge TEXT,
  ADD COLUMN IF NOT EXISTS tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS audience_b2b BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS audience_b2c BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS price_status price_approval_status NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS legal_status legal_approval_status NOT NULL DEFAULT 'NOT_REVIEWED',
  ADD COLUMN IF NOT EXISTS publication_ready BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS legal_approved_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS legal_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS legal_terms_version TEXT,
  ADD COLUMN IF NOT EXISTS legal_internal_note TEXT,
  ADD COLUMN IF NOT EXISTS benefits JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cta_label TEXT,
  ADD COLUMN IF NOT EXISTS quote_cta_label TEXT,
  ADD COLUMN IF NOT EXISTS warnings TEXT,
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS primary_image_path TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_internal_sku
  ON products (internal_sku)
  WHERE internal_sku IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_price_mode ON products (price_mode);
CREATE INDEX IF NOT EXISTS idx_products_legal_status ON products (legal_status);
CREATE INDEX IF NOT EXISTS idx_products_updated_at ON products (updated_at DESC);

-- ---------------------------------------------------------------------------
-- Categories: i18n + visibility
-- ---------------------------------------------------------------------------
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS name_nl TEXT,
  ADD COLUMN IF NOT EXISTS description_nl TEXT,
  ADD COLUMN IF NOT EXISTS image_path TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- ---------------------------------------------------------------------------
-- Product translations (NL/EN structured copy)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK (locale IN ('nl', 'en')),
  name TEXT NOT NULL DEFAULT '',
  slug TEXT,
  short_description TEXT NOT NULL DEFAULT '',
  full_description TEXT NOT NULL DEFAULT '',
  benefits JSONB NOT NULL DEFAULT '[]'::jsonb,
  included_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  excluded_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  cta_label TEXT,
  quote_cta_label TEXT,
  seo_title TEXT,
  seo_description TEXT,
  delivery_time TEXT,
  target_audience TEXT,
  workflow TEXT,
  warnings TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, locale)
);

CREATE INDEX IF NOT EXISTS idx_product_translations_locale
  ON product_translations (locale);

-- ---------------------------------------------------------------------------
-- Product media (paths only — never base64 in DB)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size INT NOT NULL CHECK (byte_size > 0 AND byte_size <= 5242880),
  width INT,
  height INT,
  sort_order INT NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  alt_text_nl TEXT,
  alt_text_en TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_media_product
  ON product_media (product_id, sort_order);

-- ---------------------------------------------------------------------------
-- Reusable add-ons / extensions (no recurring payment settlement)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  name_nl TEXT,
  description_nl TEXT,
  price_cents INT CHECK (price_cents IS NULL OR price_cents >= 0),
  price_mode price_mode NOT NULL DEFAULT 'QUOTE_ONLY',
  billing_type billing_type NOT NULL DEFAULT 'ONE_TIME',
  audience_b2b BOOLEAN NOT NULL DEFAULT TRUE,
  audience_b2c BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_addon_links (
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  addon_id UUID NOT NULL REFERENCES product_addons(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, addon_id)
);

-- ---------------------------------------------------------------------------
-- RLS: deny public/authenticated writes; service role used by admin
-- ---------------------------------------------------------------------------
ALTER TABLE product_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_addon_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny_all_product_translations" ON product_translations;
CREATE POLICY "deny_all_product_translations" ON product_translations
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "deny_all_product_media" ON product_media;
CREATE POLICY "deny_all_product_media" ON product_media
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "deny_all_product_addons" ON product_addons;
CREATE POLICY "deny_all_product_addons" ON product_addons
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "deny_all_product_addon_links" ON product_addon_links;
CREATE POLICY "deny_all_product_addon_links" ON product_addon_links
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- Storage bucket metadata (create via dashboard/API if missing; path convention only)
COMMENT ON TABLE product_media IS
  'File bytes live in Storage bucket product-media; DB stores path + metadata only.';

COMMENT ON COLUMN products.legal_status IS
  'Legal publication approval — never set automatically by audience_b2b/b2c.';

COMMENT ON COLUMN products.publication_ready IS
  'Explicit commercial readiness flag — independent of marketing publish status.';
