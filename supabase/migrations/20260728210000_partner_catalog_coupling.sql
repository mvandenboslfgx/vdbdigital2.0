-- Partner catalog coupling (additive): Owner products remain SSOT.
-- Partners consume via SECURITY DEFINER RPCs only (no parallel catalog).
-- Checkout / Mollie / payout execution remain fail-closed at application layer.

-- 1) Partner eligibility + commission config on products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS partner_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS partner_visibility text NOT NULL DEFAULT 'none'
    CHECK (partner_visibility IN (
      'none',
      'all_active',
      'approval_required',
      'selected_group',
      'paused',
      'campaign',
      'quote_only',
      'requestable'
    )),
  ADD COLUMN IF NOT EXISTS partner_commission_type text NOT NULL DEFAULT 'bps'
    CHECK (partner_commission_type IN ('bps', 'fixed_cents', 'tiered', 'manual_quote')),
  ADD COLUMN IF NOT EXISTS partner_commission_value numeric(12, 4),
  ADD COLUMN IF NOT EXISTS partner_commission_currency text NOT NULL DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS partner_commission_status text NOT NULL DEFAULT 'draft'
    CHECK (partner_commission_status IN ('draft', 'active', 'paused', 'retired')),
  ADD COLUMN IF NOT EXISTS partner_minimum_price_cents integer,
  ADD COLUMN IF NOT EXISTS partner_maximum_discount_bps integer,
  ADD COLUMN IF NOT EXISTS partner_requires_approval boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS partner_terms text,
  ADD COLUMN IF NOT EXISTS partner_sales_copy text,
  ADD COLUMN IF NOT EXISTS partner_availability text NOT NULL DEFAULT 'available'
    CHECK (partner_availability IN ('available', 'limited', 'paused', 'out_of_stock')),
  ADD COLUMN IF NOT EXISTS partner_priority integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS partner_featured boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.products.partner_enabled IS
  'When true and visibility/availability allow, ACTIVE partners may list this Owner product.';
COMMENT ON COLUMN public.products.partner_commission_value IS
  'For bps: basis points (1000=10%). For fixed_cents: integer cents. Never expose cost_cents to partners.';

CREATE INDEX IF NOT EXISTS products_partner_enabled_idx
  ON public.products (partner_enabled, partner_visibility, partner_availability)
  WHERE partner_enabled = true;

-- 2) Lead ↔ product attribution (historical snapshot)
ALTER TABLE public.partner_leads
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS product_slug text,
  ADD COLUMN IF NOT EXISTS product_snapshot jsonb;

CREATE INDEX IF NOT EXISTS partner_leads_product_id_idx
  ON public.partner_leads (product_id)
  WHERE product_id IS NOT NULL;

-- 3) Safe partner catalog RPC (no cost_cents / supplier secrets)
CREATE OR REPLACE FUNCTION public.list_partner_catalog()
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
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_id uuid;
  v_status text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  SELECT id, status::text INTO v_partner_id, v_status
  FROM public.partner_profiles
  WHERE user_id = auth.uid();

  IF v_partner_id IS NULL OR v_status IS DISTINCT FROM 'ACTIVE' THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.slug,
    p.name,
    p.short_description,
    c.slug,
    c.name,
    p.price_cents,
    p.from_price_cents,
    p.price_label,
    p.billing_type::text,
    p.currency,
    p.vat_percent,
    p.audience_b2b,
    p.audience_b2c,
    p.delivery_time,
    p.primary_image_path,
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
      WHEN p.partner_visibility = 'quote_only' OR p.price_mode::text = 'QUOTE_ONLY' THEN 'quote'
      WHEN p.partner_requires_approval THEN 'lead_request'
      ELSE 'lead'
    END AS cta_mode
  FROM public.products p
  LEFT JOIN public.categories c ON c.id = p.category_id
  WHERE p.partner_enabled = true
    AND p.partner_visibility IN ('all_active', 'campaign', 'quote_only', 'requestable')
    AND p.partner_availability IN ('available', 'limited')
    AND coalesce(p.is_concept, false) = false
    AND p.status::text = 'PUBLISHED'
    AND coalesce(p.publication_ready, false) = true
    AND p.legal_status::text IN ('APPROVED_FOR_B2B', 'APPROVED_FOR_B2C', 'APPROVED_FOR_BOTH')
    AND p.price_status::text IN ('APPROVED', 'PUBLISHED')
  ORDER BY p.partner_featured DESC, p.partner_priority ASC, p.name ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_partner_catalog() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_partner_catalog() TO authenticated;

-- 4) Extend create_partner_lead with optional product binding (new overload)
CREATE OR REPLACE FUNCTION public.create_partner_lead(
  p_contact_name text,
  p_contact_email text,
  p_dedupe_key text,
  p_company text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_message text DEFAULT NULL,
  p_code text DEFAULT NULL,
  p_product_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_id uuid;
  v_code_id uuid;
  v_id uuid;
  v_product public.products%ROWTYPE;
  v_snapshot jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;

  SELECT id INTO v_partner_id FROM public.partner_profiles
  WHERE user_id = auth.uid() AND status = 'ACTIVE';
  IF v_partner_id IS NULL THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  IF p_product_id IS NOT NULL THEN
    SELECT * INTO v_product FROM public.products WHERE id = p_product_id;
    IF v_product.id IS NULL THEN
      RAISE EXCEPTION 'PRODUCT_NOT_FOUND';
    END IF;
    IF v_product.partner_enabled IS NOT TRUE
       OR v_product.partner_visibility NOT IN ('all_active', 'campaign', 'quote_only', 'requestable')
       OR v_product.partner_availability NOT IN ('available', 'limited')
       OR coalesce(v_product.is_concept, false) = true
       OR v_product.status::text IS DISTINCT FROM 'PUBLISHED'
       OR coalesce(v_product.publication_ready, false) IS NOT TRUE
       OR v_product.legal_status::text NOT IN ('APPROVED_FOR_B2B', 'APPROVED_FOR_B2C', 'APPROVED_FOR_BOTH')
       OR v_product.price_status::text NOT IN ('APPROVED', 'PUBLISHED') THEN
      RAISE EXCEPTION 'PRODUCT_NOT_PARTNER_ELIGIBLE';
    END IF;
    v_snapshot := jsonb_build_object(
      'product_id', v_product.id,
      'slug', v_product.slug,
      'name', v_product.name,
      'price_cents', v_product.price_cents,
      'from_price_cents', v_product.from_price_cents,
      'currency', v_product.currency,
      'vat_percent', v_product.vat_percent,
      'partner_commission_type', v_product.partner_commission_type,
      'partner_commission_value', v_product.partner_commission_value,
      'partner_commission_currency', v_product.partner_commission_currency,
      'legal_status', v_product.legal_status::text,
      'price_status', v_product.price_status::text,
      'captured_at', NOW()
    );
  END IF;

  IF p_code IS NOT NULL THEN
    SELECT id INTO v_code_id FROM public.partner_codes
    WHERE partner_id = v_partner_id
      AND code_normalized = public.normalize_partner_code(p_code)
      AND status = 'ACTIVE';
  END IF;

  INSERT INTO public.partner_leads (
    partner_id, partner_code_id, contact_name, contact_email, contact_phone,
    company_name, message, dedupe_key, created_by, attribution_locked_at,
    product_id, product_slug, product_snapshot
  ) VALUES (
    v_partner_id, v_code_id, p_contact_name, lower(trim(p_contact_email)), p_phone,
    p_company, p_message, lower(trim(p_dedupe_key)), auth.uid(), NOW(),
    v_product.id, v_product.slug, v_snapshot
  )
  ON CONFLICT (partner_id, dedupe_key) DO UPDATE
    SET updated_at = NOW(),
        product_id = COALESCE(EXCLUDED.product_id, public.partner_leads.product_id),
        product_slug = COALESCE(EXCLUDED.product_slug, public.partner_leads.product_slug),
        product_snapshot = COALESCE(EXCLUDED.product_snapshot, public.partner_leads.product_snapshot)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_partner_lead(text,text,text,text,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_partner_lead(text,text,text,text,text,text,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_partner_lead(text,text,text,text,text,text,text,uuid) TO authenticated;

-- Keep 7-arg wrapper for mobile/compat callers
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
SET search_path = public
AS $$
  SELECT public.create_partner_lead(
    p_contact_name, p_contact_email, p_dedupe_key, p_company, p_phone, p_message, p_code, NULL::uuid
  );
$$;

REVOKE ALL ON FUNCTION public.create_partner_lead(text,text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_partner_lead(text,text,text,text,text,text,text) TO authenticated;
