-- =============================================================================
-- Catalog SSOT v1 (LOCAL PROPOSAL — do not apply remotely without owner gate)
--
-- One catalog contract for website, mobile app and partner portal.
-- Existing rows are deliberately NOT activated by this migration.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS min_quantity integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_quantity integer NOT NULL DEFAULT 99,
  ADD COLUMN IF NOT EXISTS quantity_label_nl text NOT NULL DEFAULT 'licentie',
  ADD COLUMN IF NOT EXISTS quantity_label_en text NOT NULL DEFAULT 'license';

DO $$ BEGIN
  ALTER TABLE public.products
    ADD CONSTRAINT products_quantity_bounds
    CHECK (
      min_quantity >= 1
      AND max_quantity >= min_quantity
      AND max_quantity <= 999
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS products_public_catalog_idx
  ON public.products (sort_order, featured, name)
  WHERE status = 'PUBLISHED' AND is_active = true AND is_concept = false;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS product_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.products.is_active IS
  'Operational availability. Public catalog requires both status=PUBLISHED and is_active=true.';
COMMENT ON COLUMN public.order_items.product_snapshot IS
  'Immutable catalog, price, period and localization snapshot captured when the order is created.';

-- Partner catalog fields are stored on the Owner product row: no second catalog.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS partner_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS partner_visibility text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS partner_commission_type text NOT NULL DEFAULT 'bps',
  ADD COLUMN IF NOT EXISTS partner_commission_value numeric(12, 4),
  ADD COLUMN IF NOT EXISTS partner_commission_currency text NOT NULL DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS partner_commission_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS partner_minimum_price_cents integer,
  ADD COLUMN IF NOT EXISTS partner_maximum_discount_bps integer,
  ADD COLUMN IF NOT EXISTS partner_requires_approval boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS partner_terms text,
  ADD COLUMN IF NOT EXISTS partner_sales_copy text,
  ADD COLUMN IF NOT EXISTS partner_availability text NOT NULL DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS partner_priority integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS partner_featured boolean NOT NULL DEFAULT false;

DO $$ BEGIN
  ALTER TABLE public.products ADD CONSTRAINT products_partner_visibility_allowed
    CHECK (partner_visibility IN (
      'none', 'all_active', 'approval_required', 'selected_group', 'paused',
      'campaign', 'quote_only', 'requestable'
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.products ADD CONSTRAINT products_partner_commission_type_allowed
    CHECK (partner_commission_type IN ('bps', 'fixed_cents', 'tiered', 'manual_quote'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.products ADD CONSTRAINT products_partner_commission_status_allowed
    CHECK (partner_commission_status IN ('draft', 'active', 'paused', 'retired'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.products ADD CONSTRAINT products_partner_availability_allowed
    CHECK (partner_availability IN ('available', 'limited', 'paused', 'out_of_stock'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS products_partner_catalog_idx
  ON public.products (partner_featured DESC, partner_priority, name)
  WHERE partner_enabled = true;

ALTER TABLE public.partner_leads
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS product_slug text,
  ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS product_snapshot jsonb;

DO $$ BEGIN
  ALTER TABLE public.partner_leads ADD CONSTRAINT partner_leads_quantity_positive
    CHECK (quantity >= 1 AND quantity <= 999);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS partner_leads_product_id_idx
  ON public.partner_leads (product_id)
  WHERE product_id IS NOT NULL;

-- A single fail-closed predicate is shared by RLS and all catalog consumers.
CREATE OR REPLACE FUNCTION private.catalog_product_is_public(p_product_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.products AS p
    JOIN public.categories AS c ON c.id = p.category_id
    WHERE p.id = p_product_id
      AND p.status::text = 'PUBLISHED'
      AND p.is_active = true
      AND coalesce(p.is_concept, false) = false
      AND p.publication_ready = true
      AND p.price_status::text IN ('APPROVED', 'PUBLISHED')
      AND p.legal_status::text IN (
        'APPROVED_FOR_B2B', 'APPROVED_FOR_B2C', 'APPROVED_FOR_BOTH'
      )
      AND c.is_active = true
      AND length(trim(p.name)) >= 2
      AND length(trim(p.short_description)) > 0
      AND length(trim(p.full_description)) > 0
      AND p.currency ~ '^[A-Z]{3}$'
      AND p.min_quantity >= 1
      AND p.max_quantity >= p.min_quantity
      AND (
        (p.price_mode::text = 'FIXED' AND p.price_cents > 0)
        OR (p.price_mode::text = 'STARTING_FROM' AND p.from_price_cents > 0)
        OR (p.price_mode::text = 'QUOTE_ONLY' AND p.billing_type::text = 'QUOTE_ONLY')
      )
      AND EXISTS (
        SELECT 1
        FROM public.product_translations AS t
        WHERE t.product_id = p.id
          AND t.locale = 'nl'
          AND length(trim(t.name)) >= 2
          AND length(trim(t.short_description)) > 0
          AND length(trim(t.full_description)) > 0
          AND length(trim(coalesce(t.seo_title, ''))) > 0
          AND length(trim(coalesce(t.seo_description, ''))) > 0
          AND jsonb_typeof(t.included_items) = 'array'
          AND jsonb_array_length(t.included_items) > 0
      )
      AND EXISTS (
        SELECT 1
        FROM public.product_translations AS t
        WHERE t.product_id = p.id
          AND t.locale = 'en'
          AND length(trim(t.name)) >= 2
          AND length(trim(t.short_description)) > 0
          AND length(trim(t.full_description)) > 0
          AND length(trim(coalesce(t.seo_title, ''))) > 0
          AND length(trim(coalesce(t.seo_description, ''))) > 0
          AND jsonb_typeof(t.included_items) = 'array'
          AND jsonb_array_length(t.included_items) > 0
      )
      AND EXISTS (
        SELECT 1
        FROM public.product_media AS m
        WHERE m.product_id = p.id
          AND m.is_primary = true
          AND length(trim(m.storage_path)) > 0
          AND length(trim(coalesce(m.alt_text_nl, ''))) > 0
          AND length(trim(coalesce(m.alt_text_en, ''))) > 0
      )
  );
$$;

REVOKE ALL ON FUNCTION private.catalog_product_is_public(uuid) FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.catalog_product_is_public(uuid)
  TO anon, authenticated, service_role;

-- Replace permissive legacy catalog policies with the canonical predicate.
DROP POLICY IF EXISTS "Public can read published products" ON public.products;
DROP POLICY IF EXISTS "Deny authenticated read draft products" ON public.products;
DROP POLICY IF EXISTS products_public_catalog_select ON public.products;
CREATE POLICY products_public_catalog_select
  ON public.products FOR SELECT TO anon, authenticated
  USING (private.catalog_product_is_public(id));

DROP POLICY IF EXISTS "Public can read categories" ON public.categories;
DROP POLICY IF EXISTS categories_public_catalog_select ON public.categories;
CREATE POLICY categories_public_catalog_select
  ON public.categories FOR SELECT TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.products AS p
      WHERE p.category_id = categories.id
        AND private.catalog_product_is_public(p.id)
    )
  );

DROP POLICY IF EXISTS "deny_all_product_translations" ON public.product_translations;
DROP POLICY IF EXISTS product_translations_public_catalog_select ON public.product_translations;
CREATE POLICY product_translations_public_catalog_select
  ON public.product_translations FOR SELECT TO anon, authenticated
  USING (private.catalog_product_is_public(product_id));

DROP POLICY IF EXISTS "deny_all_product_media" ON public.product_media;
DROP POLICY IF EXISTS product_media_public_catalog_select ON public.product_media;
CREATE POLICY product_media_public_catalog_select
  ON public.product_media FOR SELECT TO anon, authenticated
  USING (private.catalog_product_is_public(product_id));

GRANT SELECT ON TABLE public.categories, public.products,
  public.product_translations, public.product_media TO anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.categories, public.products,
  public.product_translations, public.product_media FROM anon, authenticated;

-- Remove legacy policies that accidentally allowed access to every other bucket.
DROP POLICY IF EXISTS "product_media_deny_anon_select" ON storage.objects;
DROP POLICY IF EXISTS "product_media_deny_anon_mutate" ON storage.objects;
DROP POLICY IF EXISTS "product_media_deny_anon_update" ON storage.objects;
DROP POLICY IF EXISTS "product_media_deny_anon_delete" ON storage.objects;
DROP POLICY IF EXISTS "product_media_deny_authenticated_all" ON storage.objects;
DROP POLICY IF EXISTS product_media_public_object_select ON storage.objects;

CREATE POLICY product_media_public_object_select
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (
    bucket_id = 'product-media'
    AND EXISTS (
      SELECT 1
      FROM public.product_media AS m
      WHERE m.storage_path = storage.objects.name
        AND private.catalog_product_is_public(m.product_id)
    )
  );

-- Public catalog RPC: same rows and copy for browser, native app and portals.
DROP FUNCTION IF EXISTS public.list_public_catalog(text);
CREATE FUNCTION public.list_public_catalog(p_locale text DEFAULT 'nl')
RETURNS TABLE (
  product_id uuid,
  slug text,
  name text,
  short_description text,
  full_description text,
  category_id uuid,
  category_slug text,
  category_name text,
  price_cents integer,
  from_price_cents integer,
  price_mode text,
  billing_type text,
  currency text,
  vat_percent integer,
  price_includes_vat boolean,
  delivery_time text,
  included_items jsonb,
  excluded_items jsonb,
  cta_label text,
  quote_cta_label text,
  image_storage_path text,
  image_alt_text text,
  min_quantity integer,
  max_quantity integer,
  quantity_label text,
  featured boolean,
  sort_order integer,
  version integer
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT
    p.id,
    p.slug,
    t.name,
    t.short_description,
    t.full_description,
    c.id,
    c.slug,
    CASE WHEN lower(p_locale) = 'nl' THEN coalesce(c.name_nl, c.name) ELSE c.name END,
    p.price_cents,
    p.from_price_cents,
    p.price_mode::text,
    p.billing_type::text,
    p.currency,
    p.vat_percent,
    p.price_includes_vat,
    coalesce(t.delivery_time, p.delivery_time),
    t.included_items,
    t.excluded_items,
    coalesce(t.cta_label, p.cta_label),
    coalesce(t.quote_cta_label, p.quote_cta_label),
    m.storage_path,
    CASE WHEN lower(p_locale) = 'nl' THEN m.alt_text_nl ELSE m.alt_text_en END,
    p.min_quantity,
    p.max_quantity,
    CASE WHEN lower(p_locale) = 'nl' THEN p.quantity_label_nl ELSE p.quantity_label_en END,
    p.featured,
    p.sort_order,
    p.version
  FROM public.products AS p
  JOIN public.categories AS c ON c.id = p.category_id
  JOIN public.product_translations AS t
    ON t.product_id = p.id
   AND t.locale = CASE WHEN lower(p_locale) = 'en' THEN 'en' ELSE 'nl' END
  JOIN LATERAL (
    SELECT pm.storage_path, pm.alt_text_nl, pm.alt_text_en
    FROM public.product_media AS pm
    WHERE pm.product_id = p.id AND pm.is_primary = true
    ORDER BY pm.sort_order, pm.id
    LIMIT 1
  ) AS m ON true
  WHERE private.catalog_product_is_public(p.id)
  ORDER BY p.featured DESC, p.sort_order, t.name;
$$;

REVOKE ALL ON FUNCTION public.list_public_catalog(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_catalog(text) TO anon, authenticated;

-- Partner list is an authenticated projection of the exact same public rows.
DROP FUNCTION IF EXISTS public.list_partner_catalog();
DROP FUNCTION IF EXISTS public.list_partner_catalog(text);
CREATE FUNCTION public.list_partner_catalog(p_locale text DEFAULT 'nl')
RETURNS TABLE (
  product_id uuid,
  slug text,
  name text,
  short_description text,
  category_slug text,
  category_name text,
  price_cents integer,
  from_price_cents integer,
  price_label text,
  billing_type text,
  currency text,
  vat_percent integer,
  audience_b2b boolean,
  audience_b2c boolean,
  delivery_time text,
  primary_image_path text,
  image_alt_text text,
  min_quantity integer,
  max_quantity integer,
  quantity_label text,
  partner_visibility text,
  partner_commission_type text,
  partner_commission_value numeric,
  partner_commission_currency text,
  partner_commission_status text,
  partner_requires_approval boolean,
  partner_terms text,
  partner_sales_copy text,
  partner_availability text,
  partner_featured boolean,
  partner_priority integer,
  cta_mode text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.partner_profiles AS pp
    WHERE pp.user_id = auth.uid() AND pp.status::text = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    pc.product_id,
    pc.slug,
    pc.name,
    pc.short_description,
    pc.category_slug,
    pc.category_name,
    pc.price_cents,
    pc.from_price_cents,
    p.price_label,
    pc.billing_type,
    pc.currency,
    pc.vat_percent,
    p.audience_b2b,
    p.audience_b2c,
    pc.delivery_time,
    pc.image_storage_path,
    pc.image_alt_text,
    pc.min_quantity,
    pc.max_quantity,
    pc.quantity_label,
    p.partner_visibility,
    p.partner_commission_type,
    p.partner_commission_value,
    p.partner_commission_currency,
    p.partner_commission_status,
    p.partner_requires_approval,
    p.partner_terms,
    p.partner_sales_copy,
    p.partner_availability,
    p.partner_featured,
    p.partner_priority,
    CASE
      WHEN p.partner_visibility = 'quote_only' OR pc.price_mode = 'QUOTE_ONLY' THEN 'quote'
      WHEN p.partner_requires_approval THEN 'lead_request'
      ELSE 'lead'
    END
  FROM public.list_public_catalog(p_locale) AS pc
  JOIN public.products AS p ON p.id = pc.product_id
  WHERE p.partner_enabled = true
    AND p.partner_visibility IN ('all_active', 'campaign', 'quote_only', 'requestable')
    AND p.partner_availability IN ('available', 'limited')
    AND p.partner_commission_status = 'active'
  ORDER BY p.partner_featured DESC, p.partner_priority, pc.name;
END;
$$;

REVOKE ALL ON FUNCTION public.list_partner_catalog(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_partner_catalog(text) TO authenticated;

-- Quantity-aware partner lead creation with a server-calculated product snapshot.
CREATE OR REPLACE FUNCTION public.create_partner_lead(
  p_contact_name text,
  p_contact_email text,
  p_dedupe_key text,
  p_company text,
  p_phone text,
  p_message text,
  p_code text,
  p_product_id uuid,
  p_quantity integer
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_partner_id uuid;
  v_code_id uuid;
  v_id uuid;
  v_product public.products%ROWTYPE;
  v_snapshot jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '42501'; END IF;
  IF length(trim(coalesce(p_contact_name, ''))) < 2
     OR length(trim(p_contact_name)) > 200 THEN
    RAISE EXCEPTION 'INVALID_CONTACT_NAME';
  END IF;
  IF length(trim(coalesce(p_contact_email, ''))) < 3
     OR length(trim(p_contact_email)) > 320
     OR position('@' IN p_contact_email) = 0 THEN
    RAISE EXCEPTION 'INVALID_CONTACT_EMAIL';
  END IF;
  IF length(trim(coalesce(p_dedupe_key, ''))) < 8
     OR length(trim(p_dedupe_key)) > 500 THEN
    RAISE EXCEPTION 'INVALID_DEDUPE_KEY';
  END IF;
  IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 999 THEN
    RAISE EXCEPTION 'INVALID_QUANTITY';
  END IF;

  SELECT pp.id INTO v_partner_id
  FROM public.partner_profiles AS pp
  WHERE pp.user_id = auth.uid() AND pp.status::text = 'ACTIVE';
  IF v_partner_id IS NULL THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501'; END IF;

  IF p_product_id IS NOT NULL THEN
    SELECT p.* INTO v_product FROM public.products AS p WHERE p.id = p_product_id;
    IF v_product.id IS NULL THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND'; END IF;
    IF NOT private.catalog_product_is_public(v_product.id)
       OR v_product.partner_enabled IS NOT TRUE
       OR v_product.partner_visibility NOT IN ('all_active', 'campaign', 'quote_only', 'requestable')
       OR v_product.partner_availability NOT IN ('available', 'limited')
       OR v_product.partner_commission_status IS DISTINCT FROM 'active' THEN
      RAISE EXCEPTION 'PRODUCT_NOT_PARTNER_ELIGIBLE';
    END IF;
    IF p_quantity < v_product.min_quantity OR p_quantity > v_product.max_quantity THEN
      RAISE EXCEPTION 'INVALID_QUANTITY';
    END IF;
    v_snapshot := jsonb_build_object(
      'product_id', v_product.id,
      'slug', v_product.slug,
      'name', v_product.name,
      'quantity', p_quantity,
      'unit_price_cents', v_product.price_cents,
      'total_price_cents', CASE
        WHEN v_product.price_cents IS NULL THEN NULL
        ELSE v_product.price_cents * p_quantity
      END,
      'billing_type', v_product.billing_type::text,
      'currency', v_product.currency,
      'vat_percent', v_product.vat_percent,
      'price_includes_vat', v_product.price_includes_vat,
      'product_version', v_product.version,
      'legal_status', v_product.legal_status::text,
      'price_status', v_product.price_status::text,
      'partner_commission_type', v_product.partner_commission_type,
      'partner_commission_value', v_product.partner_commission_value,
      'partner_commission_currency', v_product.partner_commission_currency,
      'captured_at', now()
    );
  ELSIF p_quantity <> 1 THEN
    RAISE EXCEPTION 'INVALID_QUANTITY';
  END IF;

  IF p_code IS NOT NULL THEN
    SELECT pc.id INTO v_code_id
    FROM public.partner_codes AS pc
    WHERE pc.partner_id = v_partner_id
      AND pc.code_normalized = public.normalize_partner_code(p_code)
      AND pc.status::text = 'ACTIVE';
  END IF;

  INSERT INTO public.partner_leads (
    partner_id, partner_code_id, contact_name, contact_email, contact_phone,
    company_name, message, dedupe_key, created_by, attribution_locked_at,
    product_id, product_slug, quantity, product_snapshot
  ) VALUES (
    v_partner_id, v_code_id, trim(p_contact_name), lower(trim(p_contact_email)), p_phone,
    p_company, p_message, lower(trim(p_dedupe_key)), auth.uid(), now(),
    v_product.id, v_product.slug, p_quantity, v_snapshot
  )
  ON CONFLICT (partner_id, dedupe_key) DO UPDATE
    SET updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_partner_lead(
  p_contact_name text,
  p_contact_email text,
  p_dedupe_key text,
  p_company text,
  p_phone text,
  p_message text,
  p_code text,
  p_product_id uuid
) RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.create_partner_lead(
    p_contact_name, p_contact_email, p_dedupe_key, p_company, p_phone,
    p_message, p_code, p_product_id, 1
  );
$$;

CREATE OR REPLACE FUNCTION public.create_partner_lead(
  p_contact_name text,
  p_contact_email text,
  p_dedupe_key text,
  p_company text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_message text DEFAULT NULL,
  p_code text DEFAULT NULL
) RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.create_partner_lead(
    p_contact_name, p_contact_email, p_dedupe_key, p_company, p_phone,
    p_message, p_code, NULL::uuid, 1
  );
$$;

REVOKE ALL ON FUNCTION public.create_partner_lead(text,text,text,text,text,text,text,uuid,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_partner_lead(text,text,text,text,text,text,text,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_partner_lead(text,text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_partner_lead(text,text,text,text,text,text,text,uuid,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_partner_lead(text,text,text,text,text,text,text,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_partner_lead(text,text,text,text,text,text,text) TO authenticated;

-- Harden atomic order creation and preserve authoritative snapshots.
CREATE OR REPLACE FUNCTION public.create_order_with_items(p_order jsonb, p_items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.orders (
    id, order_number, status, customer_email, customer_first_name, customer_last_name,
    customer_company, customer_phone, customer_type, subtotal_cents, vat_cents, total_cents,
    vat_rate, notes, confirmation_sent, delivery_released, idempotency_key, payment_init_status
  ) VALUES (
    (p_order->>'id')::uuid,
    p_order->>'order_number',
    coalesce(p_order->>'status', 'PENDING')::public.order_status,
    p_order->>'customer_email', p_order->>'customer_first_name', p_order->>'customer_last_name',
    p_order->>'customer_company', p_order->>'customer_phone', p_order->>'customer_type',
    (p_order->>'subtotal_cents')::integer, (p_order->>'vat_cents')::integer,
    (p_order->>'total_cents')::integer, (p_order->>'vat_rate')::numeric,
    p_order->>'notes', coalesce((p_order->>'confirmation_sent')::boolean, false),
    coalesce((p_order->>'delivery_released')::boolean, false),
    nullif(p_order->>'idempotency_key', ''),
    coalesce(p_order->>'payment_init_status', 'PENDING')
  );

  INSERT INTO public.order_items (
    order_id, product_id, product_name, product_slug, quantity,
    unit_price_cents, total_cents, billing_type, product_snapshot
  )
  SELECT
    (item->>'order_id')::uuid,
    (item->>'product_id')::uuid,
    item->>'product_name',
    item->>'product_slug',
    (item->>'quantity')::integer,
    (item->>'unit_price_cents')::integer,
    (item->>'total_cents')::integer,
    (item->>'billing_type')::public.billing_type,
    coalesce(item->'product_snapshot', '{}'::jsonb) || jsonb_build_object(
      'quantity', (item->>'quantity')::integer,
      'unit_price_cents', (item->>'unit_price_cents')::integer,
      'total_cents', (item->>'total_cents')::integer,
      'billing_type', item->>'billing_type',
      'captured_at', now()
    )
  FROM jsonb_array_elements(p_items) AS item;
END;
$$;

REVOKE ALL ON FUNCTION public.create_order_with_items(jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_with_items(jsonb, jsonb) TO service_role;

-- Transparent annual TV/streaming proposal. It is intentionally REVIEW/inactive:
-- publication is blocked until lawful supplier/content rights and media upload are approved.
INSERT INTO public.categories (
  id, slug, name, description, sort_order, name_nl, description_nl, is_active
) VALUES (
  '10000000-0000-4000-8000-000000000010',
  'tv-streaming',
  'TV & streaming',
  'Transparent annual access products for authorised TV and streaming services.',
  70,
  'TV & streaming',
  'Transparante jaarproducten voor geautoriseerde TV- en streamingdiensten.',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  name_nl = EXCLUDED.name_nl,
  description_nl = EXCLUDED.description_nl,
  is_active = EXCLUDED.is_active;

INSERT INTO public.products (
  id, slug, internal_sku, name, short_description, full_description,
  category_id, price_cents, from_price_cents, price_mode, billing_type,
  currency, vat_percent, price_includes_vat, price_label, status, is_concept,
  is_active, publication_ready, price_status, legal_status, audience_b2b,
  audience_b2c, delivery_time, included_items, excluded_items, featured,
  sort_order, seo_title, seo_description, cta_label, quote_cta_label,
  min_quantity, max_quantity, quantity_label_nl, quantity_label_en, tags,
  warnings, version
) VALUES (
  '10000000-0000-4000-8000-000000000100',
  'tv-streaming-jaarabonnement',
  'TV-STREAM-YEAR-001',
  'TV Streaming Jaarabonnement',
  'Eén jaar toegang tot een vooraf bevestigde, geautoriseerde TV-streamingdienst.',
  'Een transparant jaarabonnement voor toegang tot de TV-streamingdienst die op de offerte of orderbevestiging staat. Zender-, app-, apparaat- en regiobeschikbaarheid worden vóór bestelling schriftelijk bevestigd. Er worden geen gedeelde accounts, illegale streams of omzeilingsdiensten geleverd.',
  (SELECT id FROM public.categories WHERE slug = 'tv-streaming'),
  10000, NULL, 'FIXED', 'YEARLY', 'EUR', 21, true, '€ 100 per licentie per jaar',
  'REVIEW', false, false, false, 'APPROVED', 'LEGAL_REVIEW_REQUIRED', true, true,
  'Na verificatie van beschikbaarheid en rechten',
  '["12 maanden toegang voor één licentie", "Vooraf bevestigde dienst en beschikbaarheid", "Ondersteuning bij activatie"]'::jsonb,
  '["Niet-bevestigde zenders of content", "Illegale of ongeautoriseerde streams", "Apparaat of internetverbinding"]'::jsonb,
  false, 70,
  'TV Streaming Jaarabonnement | VDB Digital',
  'Transparante jaarlicentie voor een vooraf bevestigde en geautoriseerde TV-streamingdienst.',
  'Beschikbaarheid aanvragen', 'Offerte aanvragen',
  1, 3, 'licentie', 'license',
  '["tv", "streaming", "jaarabonnement"]'::jsonb,
  'Publicatie vereist aantoonbare leverancier/contentrechten en een primaire Supabase Storage-afbeelding.',
  1
)
ON CONFLICT (slug) DO UPDATE SET
  internal_sku = EXCLUDED.internal_sku,
  name = EXCLUDED.name,
  short_description = EXCLUDED.short_description,
  full_description = EXCLUDED.full_description,
  category_id = EXCLUDED.category_id,
  price_cents = EXCLUDED.price_cents,
  price_mode = EXCLUDED.price_mode,
  billing_type = EXCLUDED.billing_type,
  currency = EXCLUDED.currency,
  vat_percent = EXCLUDED.vat_percent,
  price_includes_vat = EXCLUDED.price_includes_vat,
  price_label = EXCLUDED.price_label,
  min_quantity = EXCLUDED.min_quantity,
  max_quantity = EXCLUDED.max_quantity,
  quantity_label_nl = EXCLUDED.quantity_label_nl,
  quantity_label_en = EXCLUDED.quantity_label_en,
  tags = EXCLUDED.tags,
  warnings = EXCLUDED.warnings,
  status = 'REVIEW',
  is_concept = false,
  is_active = false,
  publication_ready = false,
  legal_status = 'LEGAL_REVIEW_REQUIRED',
  updated_at = now();

INSERT INTO public.product_translations (
  product_id, locale, name, slug, short_description, full_description,
  benefits, included_items, excluded_items, cta_label, quote_cta_label,
  seo_title, seo_description, delivery_time, target_audience, workflow, warnings
) VALUES
(
  (SELECT id FROM public.products WHERE slug = 'tv-streaming-jaarabonnement'),
  'nl', 'TV Streaming Jaarabonnement', 'tv-streaming-jaarabonnement',
  'Eén jaar toegang tot een vooraf bevestigde, geautoriseerde TV-streamingdienst.',
  'Je koopt één jaar toegang voor het gekozen aantal licenties. De exacte dienst, beschikbare zenders/content, ondersteunde apps, apparaten en regio worden vóór de bestelling schriftelijk bevestigd. VDB Digital levert geen gedeelde accounts, illegale streams of methoden om toegangsbeperkingen te omzeilen.',
  '["Duidelijke prijs per licentie per jaar", "Vooraf schriftelijke bevestiging van het aanbod", "Ondersteuning bij activatie"]'::jsonb,
  '["12 maanden toegang per licentie", "Activatie-instructies", "Support tijdens de abonnementsperiode"]'::jsonb,
  '["Niet schriftelijk bevestigde content", "Internetverbinding en hardware", "Ongeautoriseerde toegang of accountdeling"]'::jsonb,
  'Beschikbaarheid aanvragen', 'Offerte aanvragen',
  'TV Streaming Jaarabonnement | VDB Digital',
  'Jaarlicentie van €100 voor een vooraf bevestigde en geautoriseerde TV-streamingdienst.',
  'Na verificatie van beschikbaarheid en rechten',
  'Consumenten en bedrijven die legale, vooraf gespecificeerde TV-streamingtoegang zoeken.',
  'Aanvraag, rechten- en beschikbaarheidscontrole, schriftelijke bevestiging, activatie.',
  'Aanbod kan per dienst, apparaat en regio verschillen; dit wordt vóór bestelling bevestigd.'
),
(
  (SELECT id FROM public.products WHERE slug = 'tv-streaming-jaarabonnement'),
  'en', 'TV Streaming Annual Subscription', 'tv-streaming-annual-subscription',
  'One year of access to a pre-confirmed, authorised TV streaming service.',
  'You purchase one year of access for the selected number of licences. The exact service, available channels/content, supported apps, devices and region are confirmed in writing before ordering. VDB Digital does not provide shared accounts, illegal streams or methods that bypass access restrictions.',
  '["Clear annual price per licence", "Written confirmation of the offering", "Activation support"]'::jsonb,
  '["12 months of access per licence", "Activation instructions", "Support during the subscription term"]'::jsonb,
  '["Content not confirmed in writing", "Internet connection and hardware", "Unauthorised access or account sharing"]'::jsonb,
  'Request availability', 'Request a quote',
  'TV Streaming Annual Subscription | VDB Digital',
  '€100 annual licence for a pre-confirmed, authorised TV streaming service.',
  'After rights and availability verification',
  'Consumers and businesses looking for lawful, clearly specified TV streaming access.',
  'Request, rights and availability check, written confirmation, activation.',
  'Availability varies by service, device and region and is confirmed before ordering.'
)
ON CONFLICT (product_id, locale) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  short_description = EXCLUDED.short_description,
  full_description = EXCLUDED.full_description,
  benefits = EXCLUDED.benefits,
  included_items = EXCLUDED.included_items,
  excluded_items = EXCLUDED.excluded_items,
  cta_label = EXCLUDED.cta_label,
  quote_cta_label = EXCLUDED.quote_cta_label,
  seo_title = EXCLUDED.seo_title,
  seo_description = EXCLUDED.seo_description,
  delivery_time = EXCLUDED.delivery_time,
  target_audience = EXCLUDED.target_audience,
  workflow = EXCLUDED.workflow,
  warnings = EXCLUDED.warnings,
  updated_at = now();
