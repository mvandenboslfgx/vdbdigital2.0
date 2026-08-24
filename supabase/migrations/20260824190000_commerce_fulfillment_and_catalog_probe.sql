-- Additive RC7 commerce/catalog completion. Staging-safe: IF NOT EXISTS / WHERE NOT EXISTS.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS min_quantity integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_quantity integer NOT NULL DEFAULT 99,
  ADD COLUMN IF NOT EXISTS quantity_label_nl text NOT NULL DEFAULT 'licentie',
  ADD COLUMN IF NOT EXISTS quantity_label_en text NOT NULL DEFAULT 'license',
  ADD COLUMN IF NOT EXISTS market_price_cents integer,
  ADD COLUMN IF NOT EXISTS retail_price_cents integer,
  ADD COLUMN IF NOT EXISTS sale_price_cents integer,
  ADD COLUMN IF NOT EXISTS sale_starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS sale_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS partner_price_cents integer,
  ADD COLUMN IF NOT EXISTS minimum_sale_price_cents integer,
  ADD COLUMN IF NOT EXISTS below_floor_owner_approved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lowest_price_30d_cents integer,
  ADD COLUMN IF NOT EXISTS current_price_since timestamptz,
  ADD COLUMN IF NOT EXISTS fulfillment_type text NOT NULL DEFAULT 'MANUAL_REVIEW';

UPDATE public.products
SET is_active = (status::text = 'PUBLISHED' AND coalesce(is_concept, false) = false);

UPDATE public.products
SET retail_price_cents = coalesce(retail_price_cents, price_cents)
WHERE retail_price_cents IS NULL AND price_cents IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.fulfillment_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL UNIQUE,
  order_id uuid NOT NULL,
  payment_id text,
  product_slug text,
  fulfillment_type text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  provider text NOT NULL DEFAULT 'internal',
  attempt_count integer NOT NULL DEFAULT 0,
  last_error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fulfillment_jobs_status_idx
  ON public.fulfillment_jobs (status, created_at DESC);

ALTER TABLE public.fulfillment_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fulfillment_jobs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.fulfillment_jobs TO service_role;

INSERT INTO public.categories (slug, name, description, is_active, sort_order)
SELECT 'websites', 'Websites', 'Website- en webshopprojecten', true, 10
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE slug = 'websites');

INSERT INTO public.products (
  slug,
  name,
  short_description,
  full_description,
  category_id,
  price_cents,
  retail_price_cents,
  billing_type,
  price_mode,
  status,
  is_concept,
  is_active,
  publication_ready,
  price_status,
  legal_status,
  audience_b2b,
  audience_b2c,
  vat_percent,
  price_includes_vat,
  min_quantity,
  max_quantity,
  primary_image_path,
  fulfillment_type,
  featured,
  sort_order
)
SELECT
  'rc7-catalog-probe',
  'RC7 catalogusprobe — websiteproject',
  'Staging-testproduct voor publicatie zonder code-deploy.',
  'Intern staging-testproduct van VDB Digital. Dit is geen licentie van een derde partij. Het bewijst dat een gepubliceerd Supabase-product zonder Git-deploy op de website verschijnt.',
  c.id,
  49500,
  49500,
  'ONE_TIME',
  'FIXED',
  'PUBLISHED',
  false,
  true,
  true,
  'APPROVED',
  'APPROVED_FOR_BOTH',
  true,
  true,
  21,
  true,
  1,
  5,
  '/images/catalog/product-fallback.svg',
  'WEBSITE_PROJECT',
  true,
  1
FROM public.categories c
WHERE c.slug = 'websites'
  AND NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'rc7-catalog-probe');

INSERT INTO public.product_translations (
  product_id, locale, name, slug, short_description, full_description,
  included_items, excluded_items, seo_title, seo_description
)
SELECT
  p.id,
  'nl',
  'RC7 catalogusprobe — websiteproject',
  p.slug,
  'Staging-testproduct voor publicatie zonder code-deploy.',
  'Intern staging-testproduct van VDB Digital. Dit is geen licentie van een derde partij.',
  '["Projectintake","Website-opzet","Staging-publicatiecheck"]'::jsonb,
  '["Geen derde-partijlicentie"]'::jsonb,
  'RC7 catalogusprobe',
  'Staging-testproduct om cataloguspublicatie te bewijzen.'
FROM public.products p
WHERE p.slug = 'rc7-catalog-probe'
  AND NOT EXISTS (
    SELECT 1 FROM public.product_translations t WHERE t.product_id = p.id AND t.locale = 'nl'
  );

INSERT INTO public.product_translations (
  product_id, locale, name, slug, short_description, full_description,
  included_items, excluded_items, seo_title, seo_description
)
SELECT
  p.id,
  'en',
  'RC7 catalog probe — website project',
  p.slug,
  'Staging test product for publish-without-deploy.',
  'Internal VDB Digital staging test product. Not a third-party licence.',
  '["Project intake","Website setup","Staging publication check"]'::jsonb,
  '["No third-party licence"]'::jsonb,
  'RC7 catalog probe',
  'Staging test product to prove catalog publication.'
FROM public.products p
WHERE p.slug = 'rc7-catalog-probe'
  AND NOT EXISTS (
    SELECT 1 FROM public.product_translations t WHERE t.product_id = p.id AND t.locale = 'en'
  );

INSERT INTO public.product_media (
  product_id, storage_path, mime_type, byte_size, sort_order, is_primary, alt_text_nl, alt_text_en
)
SELECT
  p.id,
  '/images/catalog/product-fallback.svg',
  'image/svg+xml',
  1024,
  0,
  true,
  'VDB Digital catalogusprobe',
  'VDB Digital catalog probe'
FROM public.products p
WHERE p.slug = 'rc7-catalog-probe'
  AND NOT EXISTS (
    SELECT 1 FROM public.product_media m WHERE m.product_id = p.id AND m.is_primary = true
  );

INSERT INTO public.products (
  slug,
  name,
  short_description,
  full_description,
  category_id,
  price_cents,
  retail_price_cents,
  billing_type,
  price_mode,
  status,
  is_concept,
  is_active,
  publication_ready,
  price_status,
  legal_status,
  audience_b2b,
  audience_b2c,
  vat_percent,
  price_includes_vat,
  min_quantity,
  max_quantity,
  quantity_label_nl,
  quantity_label_en,
  fulfillment_type,
  featured,
  sort_order
)
SELECT
  'vdb-jaarlicentie-per-seat',
  'VDB jaarlicentie (per seat) — concept',
  'Jaarlijkse licentie per seat. Nog niet verkoopbaar tot leverancier, rechten en fulfillment bevestigd zijn.',
  'Conceptproduct: 100 euro per jaar per licentie/seat. Dit is geen derde-partijmerk. Status blijft DRAFT totdat leveranciersrechten, verkoop-/distributierechten en fulfillment aantoonbaar zijn.',
  c.id,
  10000,
  10000,
  'YEARLY',
  'FIXED',
  'DRAFT',
  true,
  false,
  false,
  'DRAFT',
  'NOT_REVIEWED',
  true,
  false,
  21,
  true,
  1,
  99,
  'licentie',
  'license',
  'SUBSCRIPTION',
  false,
  90
FROM public.categories c
WHERE c.slug = 'websites'
  AND NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'vdb-jaarlicentie-per-seat');
