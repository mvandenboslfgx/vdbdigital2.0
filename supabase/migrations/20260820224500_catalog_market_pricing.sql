-- =============================================================================
-- Catalog market pricing (LOCAL PROPOSAL — do not apply remotely without owner)
--
-- Public catalog sells on market value. Discount is a sales instrument.
-- Supplier cost remains internal. Existing price_cents stays the charged
-- customer unit price so current RPCs and snapshots keep working.
-- =============================================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS market_price_cents integer,
  ADD COLUMN IF NOT EXISTS retail_price_cents integer,
  ADD COLUMN IF NOT EXISTS sale_price_cents integer,
  ADD COLUMN IF NOT EXISTS sale_starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS sale_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS partner_price_cents integer,
  ADD COLUMN IF NOT EXISTS minimum_sale_price_cents integer,
  ADD COLUMN IF NOT EXISTS below_floor_owner_approved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS below_floor_approved_by uuid,
  ADD COLUMN IF NOT EXISTS below_floor_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS current_price_since timestamptz,
  ADD COLUMN IF NOT EXISTS lowest_price_30d_cents integer;

DO $$ BEGIN
  ALTER TABLE public.products
    ADD CONSTRAINT products_market_price_nonneg
    CHECK (market_price_cents IS NULL OR market_price_cents >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.products
    ADD CONSTRAINT products_retail_price_nonneg
    CHECK (retail_price_cents IS NULL OR retail_price_cents >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.products
    ADD CONSTRAINT products_sale_price_nonneg
    CHECK (sale_price_cents IS NULL OR sale_price_cents >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.products
    ADD CONSTRAINT products_partner_price_nonneg
    CHECK (partner_price_cents IS NULL OR partner_price_cents >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.products
    ADD CONSTRAINT products_minimum_sale_price_nonneg
    CHECK (minimum_sale_price_cents IS NULL OR minimum_sale_price_cents >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.products
    ADD CONSTRAINT products_sale_window_order
    CHECK (sale_starts_at IS NULL OR sale_ends_at IS NULL OR sale_ends_at > sale_starts_at);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN public.products.market_price_cents IS
  'External market value / labeled benchmark. NEVER a public discount anchor.';
COMMENT ON COLUMN public.products.retail_price_cents IS
  'Standard VDB selling price, usually around market value.';
COMMENT ON COLUMN public.products.sale_price_cents IS
  'Temporary campaign price. Null when no sale is configured.';
COMMENT ON COLUMN public.products.partner_price_cents IS
  'Optional special partner price. Null until explicitly enabled.';
COMMENT ON COLUMN public.products.minimum_sale_price_cents IS
  'Hard customer-price floor. Sale/retail may not go below this without OWNER approval.';
COMMENT ON COLUMN public.products.lowest_price_30d_cents IS
  'Lowest VDB customer price offered in the 30 days before the current price started. Public discount anchor.';
COMMENT ON COLUMN public.products.cost_cents IS
  'Internal supplier cost / inkoop. Never expose on public catalog RPCs.';
COMMENT ON COLUMN public.products.price_cents IS
  'Resolved customer unit price (active sale or retail). Compatibility field for existing clients.';
COMMENT ON COLUMN public.products.compare_at_cents IS
  'Public strikethrough only when equal to lowest_price_30d_cents and a legal discount exists. Never market_price.';

UPDATE public.products
SET
  retail_price_cents = coalesce(retail_price_cents, price_cents, from_price_cents),
  market_price_cents = coalesce(
    market_price_cents,
    compare_at_cents,
    price_cents,
    from_price_cents
  )
WHERE retail_price_cents IS NULL OR market_price_cents IS NULL;

CREATE TABLE IF NOT EXISTS public.product_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  customer_price_cents integer NOT NULL CHECK (customer_price_cents > 0),
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_to timestamptz,
  source text NOT NULL DEFAULT 'published_catalog',
  recorded_by uuid,
  CONSTRAINT product_price_history_window_order
    CHECK (effective_to IS NULL OR effective_to > effective_from)
);

CREATE INDEX IF NOT EXISTS product_price_history_product_from_idx
  ON public.product_price_history (product_id, effective_from DESC);

COMMENT ON TABLE public.product_price_history IS
  'Offered VDB customer prices for ACM 30-day prior-price and audit. Not a public catalog.';

ALTER TABLE public.product_price_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.product_price_history FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.product_price_history TO service_role;

CREATE OR REPLACE FUNCTION private.catalog_sale_is_active(
  p_sale_price_cents integer,
  p_sale_starts_at timestamptz,
  p_sale_ends_at timestamptz,
  p_now timestamptz DEFAULT now()
) RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    p_sale_price_cents IS NOT NULL
    AND p_sale_price_cents > 0
    AND (p_sale_starts_at IS NULL OR p_sale_starts_at <= p_now)
    AND (p_sale_ends_at IS NULL OR p_sale_ends_at > p_now);
$$;

CREATE OR REPLACE FUNCTION private.catalog_customer_unit_price_cents(p public.products)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN p.price_mode::text = 'QUOTE_ONLY' THEN NULL
    WHEN private.catalog_sale_is_active(p.sale_price_cents, p.sale_starts_at, p.sale_ends_at) THEN p.sale_price_cents
    ELSE coalesce(p.retail_price_cents, p.price_cents)
  END;
$$;

CREATE OR REPLACE FUNCTION private.catalog_discount_percentage(
  p_anchor_cents integer,
  p_customer_cents integer
) RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_anchor_cents IS NULL OR p_customer_cents IS NULL THEN NULL
    WHEN p_anchor_cents <= 0 OR p_customer_cents >= p_anchor_cents THEN NULL
    ELSE round(((p_anchor_cents - p_customer_cents)::numeric / p_anchor_cents::numeric) * 100)::integer
  END;
$$;

CREATE OR REPLACE FUNCTION private.catalog_lowest_price_30d(
  p_product_id uuid,
  p_current_since timestamptz,
  p_now timestamptz DEFAULT now()
) RETURNS integer
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT MIN(h.customer_price_cents)
  FROM public.product_price_history AS h
  WHERE h.product_id = p_product_id
    AND p_current_since IS NOT NULL
    AND h.effective_from < p_current_since
    AND coalesce(h.effective_to, p_now) > (p_current_since - interval '30 days');
$$;

CREATE OR REPLACE FUNCTION private.catalog_product_is_offered(p public.products)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p.status::text = 'PUBLISHED' AND p.is_active = true AND coalesce(p.is_concept, false) = false;
$$;

CREATE OR REPLACE FUNCTION private.catalog_sync_canonical_prices()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_customer integer;
  v_owner boolean := false;
  v_offered boolean := false;
BEGIN
  IF NEW.retail_price_cents IS NULL THEN
    NEW.retail_price_cents := NEW.price_cents;
  END IF;
  IF NEW.market_price_cents IS NULL THEN
    NEW.market_price_cents := coalesce(NEW.retail_price_cents, NEW.price_cents);
  END IF;

  v_customer := private.catalog_customer_unit_price_cents(NEW);
  v_offered := private.catalog_product_is_offered(NEW);

  IF v_customer IS NOT NULL
     AND NEW.minimum_sale_price_cents IS NOT NULL
     AND v_customer < NEW.minimum_sale_price_cents THEN
    IF NEW.below_floor_approved_by IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.admin_roles AS ar
        WHERE ar.user_id = NEW.below_floor_approved_by
          AND ar.role::text = 'OWNER'
      ) INTO v_owner;
    END IF;
    IF NEW.below_floor_owner_approved IS NOT TRUE OR v_owner IS NOT TRUE THEN
      RAISE EXCEPTION 'PRICE_BELOW_FLOOR'
        USING ERRCODE = 'P0001',
              DETAIL = 'Customer price is below minimum_sale_price_cents without OWNER approval.';
    END IF;
  ELSE
    NEW.below_floor_owner_approved := false;
    NEW.below_floor_approved_by := NULL;
    NEW.below_floor_approved_at := NULL;
  END IF;

  NEW.price_cents := v_customer;

  IF v_offered AND v_customer IS NOT NULL THEN
    IF TG_OP = 'INSERT' THEN
      NEW.current_price_since := now();
    ELSIF v_customer IS DISTINCT FROM OLD.price_cents
       OR private.catalog_product_is_offered(OLD) IS NOT TRUE THEN
      NEW.current_price_since := now();
    END IF;
  ELSE
    NEW.current_price_since := NULL;
    NEW.lowest_price_30d_cents := NULL;
  END IF;

  IF NEW.current_price_since IS NOT NULL THEN
    NEW.lowest_price_30d_cents := private.catalog_lowest_price_30d(NEW.id, NEW.current_price_since);
  END IF;

  -- Public strikethrough is history-only. market_price is never a discount anchor.
  IF v_customer IS NOT NULL
     AND NEW.lowest_price_30d_cents IS NOT NULL
     AND v_customer < NEW.lowest_price_30d_cents THEN
    NEW.compare_at_cents := NEW.lowest_price_30d_cents;
  ELSE
    NEW.compare_at_cents := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_sync_canonical_prices ON public.products;
CREATE TRIGGER trg_products_sync_canonical_prices
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION private.catalog_sync_canonical_prices();

CREATE OR REPLACE FUNCTION private.catalog_record_offered_price()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_should_record boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_should_record := private.catalog_product_is_offered(NEW)
      AND NEW.price_cents IS NOT NULL
      AND NEW.price_cents > 0;
  ELSE
    UPDATE public.product_price_history
    SET effective_to = now()
    WHERE product_id = NEW.id
      AND effective_to IS NULL
      AND (
        private.catalog_product_is_offered(NEW) IS NOT TRUE
        OR NEW.price_cents IS DISTINCT FROM OLD.price_cents
        OR private.catalog_product_is_offered(OLD) IS NOT TRUE
      );

    v_should_record := private.catalog_product_is_offered(NEW)
      AND NEW.price_cents IS NOT NULL
      AND NEW.price_cents > 0
      AND (
        NEW.price_cents IS DISTINCT FROM OLD.price_cents
        OR private.catalog_product_is_offered(OLD) IS NOT TRUE
      );
  END IF;

  IF v_should_record AND NOT EXISTS (
    SELECT 1
    FROM public.product_price_history AS h
    WHERE h.product_id = NEW.id
      AND h.effective_to IS NULL
      AND h.customer_price_cents = NEW.price_cents
  ) THEN
    INSERT INTO public.product_price_history (
      product_id,
      customer_price_cents,
      effective_from,
      source
    ) VALUES (
      NEW.id,
      NEW.price_cents,
      coalesce(NEW.current_price_since, now()),
      'published_catalog'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_record_offered_price ON public.products;
CREATE TRIGGER trg_products_record_offered_price
  AFTER INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION private.catalog_record_offered_price();

REVOKE ALL ON FUNCTION private.catalog_sync_canonical_prices() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.catalog_record_offered_price() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.catalog_lowest_price_30d(uuid, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.catalog_sale_is_active(integer, timestamptz, timestamptz, timestamptz)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.catalog_customer_unit_price_cents(public.products)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.catalog_discount_percentage(integer, integer)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.catalog_product_is_offered(public.products)
  TO anon, authenticated, service_role;

-- Recreate public catalog RPC with public price fields only. Never return cost/margin.
DROP FUNCTION IF EXISTS public.list_public_catalog();
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
  version integer,
  market_price_cents integer,
  retail_price_cents integer,
  sale_price_cents integer,
  customer_price_cents integer,
  lowest_price_30d_cents integer,
  legal_discount_percentage integer,
  sale_active boolean
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
    private.catalog_customer_unit_price_cents(p),
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
    p.version,
    coalesce(p.market_price_cents, p.retail_price_cents),
    p.retail_price_cents,
    CASE
      WHEN private.catalog_sale_is_active(p.sale_price_cents, p.sale_starts_at, p.sale_ends_at)
      THEN p.sale_price_cents
      ELSE NULL
    END,
    private.catalog_customer_unit_price_cents(p),
    p.lowest_price_30d_cents,
    private.catalog_discount_percentage(
      p.lowest_price_30d_cents,
      private.catalog_customer_unit_price_cents(p)
    ),
    private.catalog_sale_is_active(p.sale_price_cents, p.sale_starts_at, p.sale_ends_at)
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
  cta_mode text,
  market_price_cents integer,
  retail_price_cents integer,
  sale_price_cents integer,
  customer_price_cents integer,
  lowest_price_30d_cents integer,
  legal_discount_percentage integer,
  sale_active boolean,
  partner_price_cents integer
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
    END,
    pc.market_price_cents,
    pc.retail_price_cents,
    pc.sale_price_cents,
    pc.customer_price_cents,
    pc.lowest_price_30d_cents,
    pc.legal_discount_percentage,
    pc.sale_active,
    p.partner_price_cents
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
