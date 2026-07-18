-- Quotes acceptance foundation (forward-only, local only).
-- Canonical table remains public.portal_quotes — no second quote model.
-- No Mollie / checkout / payment coupling.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Extend quote status enum
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  ALTER TYPE public.portal_quote_status ADD VALUE IF NOT EXISTS 'IN_REVIEW';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.portal_quote_status ADD VALUE IF NOT EXISTS 'READY';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.portal_quote_status ADD VALUE IF NOT EXISTS 'SUPERSEDED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.portal_quote_status ADD VALUE IF NOT EXISTS 'ARCHIVED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.portal_quote_item_type AS ENUM (
    'SERVICE', 'PRODUCT', 'ADDON', 'DISCOUNT', 'CUSTOM'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE SEQUENCE IF NOT EXISTS public.portal_quote_number_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_portal_quote_number()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE n bigint;
BEGIN
  n := nextval('public.portal_quote_number_seq');
  RETURN 'OFF-' || to_char(NOW() AT TIME ZONE 'UTC', 'YYYY') || '-' || lpad(n::text, 5, '0');
END;
$$;
REVOKE ALL ON FUNCTION public.generate_portal_quote_number() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_portal_quote_number() TO service_role;

-- ---------------------------------------------------------------------------
-- Extend portal_quotes
-- ---------------------------------------------------------------------------
ALTER TABLE public.portal_quotes
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.portal_projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_cents INT NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  ADD COLUMN IF NOT EXISTS valid_from DATE,
  ADD COLUMN IF NOT EXISTS privacy_version TEXT,
  ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES public.portal_files(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS current_version_number INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sent_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_viewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS declined_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS decline_reason TEXT,
  ADD COLUMN IF NOT EXISTS withdrawn_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS withdraw_reason TEXT,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Alias expires_at ↔ valid_until (keep valid_until as source of truth)
-- accepted_version fields for acceptance snapshot pointer
ALTER TABLE public.portal_quotes
  ADD COLUMN IF NOT EXISTS accepted_version_number INT,
  ADD COLUMN IF NOT EXISTS accepted_total_cents INT,
  ADD COLUMN IF NOT EXISTS accepted_currency TEXT,
  ADD COLUMN IF NOT EXISTS accepted_terms_version TEXT;

CREATE INDEX IF NOT EXISTS idx_portal_quotes_org_status
  ON public.portal_quotes(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_portal_quotes_project
  ON public.portal_quotes(project_id) WHERE project_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Line items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.portal_quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.portal_quotes(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  item_type public.portal_quote_item_type NOT NULL DEFAULT 'CUSTOM',
  title TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC(12, 3) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_label TEXT NOT NULL DEFAULT 'stuk',
  unit_price_cents INT NOT NULL DEFAULT 0,
  discount_cents INT NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  tax_rate_basis_points INT NOT NULL DEFAULT 2100 CHECK (tax_rate_basis_points >= 0 AND tax_rate_basis_points <= 10000),
  subtotal_cents INT NOT NULL DEFAULT 0,
  tax_cents INT NOT NULL DEFAULT 0,
  total_cents INT NOT NULL DEFAULT 0,
  is_optional BOOLEAN NOT NULL DEFAULT FALSE,
  is_selected BOOLEAN NOT NULL DEFAULT TRUE,
  product_id UUID,
  addon_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_quote_items_quote
  ON public.portal_quote_items(quote_id, sort_order);

-- ---------------------------------------------------------------------------
-- Immutable versions / snapshots
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.portal_quote_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.portal_quotes(id) ON DELETE CASCADE,
  version_number INT NOT NULL CHECK (version_number >= 1),
  status public.portal_quote_status NOT NULL,
  snapshot JSONB NOT NULL,
  snapshot_checksum TEXT NOT NULL,
  document_id UUID REFERENCES public.portal_files(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (quote_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_portal_quote_versions_quote
  ON public.portal_quote_versions(quote_id, version_number DESC);

-- ---------------------------------------------------------------------------
-- Acceptance records
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.portal_quote_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.portal_quotes(id) ON DELETE CASCADE,
  quote_version_id UUID NOT NULL REFERENCES public.portal_quote_versions(id) ON DELETE RESTRICT,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  accepted_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_total_cents INT NOT NULL CHECK (accepted_total_cents >= 0),
  accepted_currency TEXT NOT NULL DEFAULT 'EUR',
  accepted_terms_version TEXT NOT NULL,
  selected_optional_item_ids UUID[] NOT NULL DEFAULT '{}',
  acceptance_checksum TEXT NOT NULL,
  ip_hash TEXT,
  user_agent_hash TEXT,
  UNIQUE (quote_id, quote_version_id)
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.portal_quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_quote_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_quote_acceptances ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.portal_quote_items FROM anon, authenticated;
REVOKE ALL ON public.portal_quote_versions FROM anon, authenticated;
REVOKE ALL ON public.portal_quote_acceptances FROM anon, authenticated;

GRANT SELECT ON public.portal_quote_items TO authenticated;
GRANT SELECT ON public.portal_quote_versions TO authenticated;
GRANT SELECT ON public.portal_quote_acceptances TO authenticated;

DROP POLICY IF EXISTS portal_quotes_member_select ON public.portal_quotes;
CREATE POLICY portal_quotes_member_select ON public.portal_quotes
  FOR SELECT TO authenticated
  USING (
    public.is_staff_admin()
    OR (
      public.is_org_member(organization_id)
      AND status IN (
        'SENT','VIEWED','ACCEPTED','DECLINED','EXPIRED','WITHDRAWN','SUPERSEDED'
      )
      AND archived_at IS NULL
    )
  );

DROP POLICY IF EXISTS portal_quote_items_member_select ON public.portal_quote_items;
CREATE POLICY portal_quote_items_member_select ON public.portal_quote_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.portal_quotes q
      WHERE q.id = quote_id
        AND (
          public.is_staff_admin()
          OR (
            public.is_org_member(q.organization_id)
            AND q.status IN ('SENT','VIEWED','ACCEPTED','DECLINED','EXPIRED','WITHDRAWN','SUPERSEDED')
            AND q.archived_at IS NULL
          )
        )
    )
  );

DROP POLICY IF EXISTS portal_quote_versions_member_select ON public.portal_quote_versions;
CREATE POLICY portal_quote_versions_member_select ON public.portal_quote_versions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.portal_quotes q
      WHERE q.id = quote_id
        AND (
          public.is_staff_admin()
          OR (
            public.is_org_member(q.organization_id)
            AND status IN ('SENT','VIEWED','ACCEPTED','DECLINED','EXPIRED','WITHDRAWN','SUPERSEDED')
          )
        )
    )
  );

DROP POLICY IF EXISTS portal_quote_acceptances_member_select ON public.portal_quote_acceptances;
CREATE POLICY portal_quote_acceptances_member_select ON public.portal_quote_acceptances
  FOR SELECT TO authenticated
  USING (
    public.is_staff_admin()
    OR public.is_org_member(organization_id)
  );

-- ---------------------------------------------------------------------------
-- Integer money helpers (basis points)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.quote_tax_cents(net_cents INT, tax_bp INT)
RETURNS INT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN net_cents IS NULL OR tax_bp IS NULL THEN 0
    ELSE ((net_cents::bigint * tax_bp::bigint) + 5000) / 10000
  END::int;
$$;

CREATE OR REPLACE FUNCTION public.quote_line_totals(
  p_quantity NUMERIC,
  p_unit_price_cents INT,
  p_discount_cents INT,
  p_tax_bp INT
)
RETURNS TABLE (subtotal_cents INT, tax_cents INT, total_cents INT)
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  gross INT;
  net INT;
  tax INT;
BEGIN
  gross := ROUND(p_quantity * p_unit_price_cents)::int;
  net := GREATEST(gross - COALESCE(p_discount_cents, 0), 0);
  tax := public.quote_tax_cents(net, p_tax_bp);
  subtotal_cents := net;
  tax_cents := tax;
  total_cents := net + tax;
  RETURN NEXT;
END;
$$;

-- ---------------------------------------------------------------------------
-- Accept RPC (transactional, auth.uid()-based)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_portal_quote(
  p_quote_id UUID,
  p_expected_version INT,
  p_selected_optional_item_ids UUID[] DEFAULT '{}'
)
RETURNS TABLE (ok BOOLEAN, detail TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_quote public.portal_quotes%ROWTYPE;
  v_role TEXT;
  v_version public.portal_quote_versions%ROWTYPE;
  v_items RECORD;
  v_subtotal INT := 0;
  v_tax INT := 0;
  v_total INT := 0;
  v_checksum TEXT;
  v_acceptance_id UUID;
  v_existing UUID;
BEGIN
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT FALSE, 'NOT_AUTHENTICATED';
    RETURN;
  END IF;

  SELECT * INTO v_quote FROM public.portal_quotes WHERE id = p_quote_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'NOT_FOUND';
    RETURN;
  END IF;

  IF v_quote.version IS DISTINCT FROM p_expected_version THEN
    RETURN QUERY SELECT FALSE, 'VERSION_CONFLICT';
    RETURN;
  END IF;

  -- Idempotent: already accepted by same user on same version
  SELECT a.id INTO v_existing
  FROM public.portal_quote_acceptances a
  WHERE a.quote_id = p_quote_id
    AND a.accepted_by = v_uid
  LIMIT 1;
  IF v_quote.status = 'ACCEPTED' AND v_existing IS NOT NULL THEN
    RETURN QUERY SELECT TRUE, 'ALREADY_ACCEPTED';
    RETURN;
  END IF;
  IF v_quote.status = 'ACCEPTED' THEN
    RETURN QUERY SELECT FALSE, 'ALREADY_ACCEPTED_OTHER';
    RETURN;
  END IF;

  IF v_quote.status NOT IN ('SENT', 'VIEWED') THEN
    RETURN QUERY SELECT FALSE, 'INVALID_STATUS';
    RETURN;
  END IF;

  IF v_quote.valid_until IS NOT NULL AND v_quote.valid_until < (NOW() AT TIME ZONE 'UTC')::date THEN
    UPDATE public.portal_quotes SET status = 'EXPIRED', updated_at = NOW() WHERE id = p_quote_id;
    RETURN QUERY SELECT FALSE, 'EXPIRED';
    RETURN;
  END IF;

  IF v_quote.terms_version IS NULL OR btrim(v_quote.terms_version) = '' THEN
    RETURN QUERY SELECT FALSE, 'TERMS_REQUIRED';
    RETURN;
  END IF;

  SELECT om.customer_role INTO v_role
  FROM public.organization_members om
  WHERE om.organization_id = v_quote.organization_id
    AND om.user_id = v_uid
    AND om.status = 'ACTIVE'
  LIMIT 1;

  IF v_role IS NULL THEN
    RETURN QUERY SELECT FALSE, 'NO_MEMBERSHIP';
    RETURN;
  END IF;

  IF v_role NOT IN ('PRIMARY', 'MEMBER') THEN
    RETURN QUERY SELECT FALSE, 'ROLE_DENIED';
    RETURN;
  END IF;

  SELECT * INTO v_version
  FROM public.portal_quote_versions
  WHERE quote_id = p_quote_id
  ORDER BY version_number DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'NO_VERSION';
    RETURN;
  END IF;

  -- Recalculate totals from current items (selected required + selected optionals)
  FOR v_items IN
    SELECT *
    FROM public.portal_quote_items
    WHERE quote_id = p_quote_id
      AND (
        is_optional = FALSE
        OR id = ANY (COALESCE(p_selected_optional_item_ids, '{}'::uuid[]))
      )
      AND (is_optional = FALSE OR is_selected = TRUE OR id = ANY (COALESCE(p_selected_optional_item_ids, '{}'::uuid[])))
  LOOP
    -- Prefer stored line totals for non-optional; for optional use stored when selected
    IF v_items.is_optional THEN
      IF NOT (v_items.id = ANY (COALESCE(p_selected_optional_item_ids, '{}'::uuid[]))) THEN
        CONTINUE;
      END IF;
    END IF;
    v_subtotal := v_subtotal + v_items.subtotal_cents;
    v_tax := v_tax + v_items.tax_cents;
    v_total := v_total + v_items.total_cents;
  END LOOP;

  -- If no items table rows, fall back to header totals
  IF NOT EXISTS (SELECT 1 FROM public.portal_quote_items WHERE quote_id = p_quote_id) THEN
    v_subtotal := v_quote.subtotal_cents;
    v_tax := v_quote.vat_cents;
    v_total := v_quote.total_cents;
  END IF;

  IF v_total < 0 THEN
    RETURN QUERY SELECT FALSE, 'NEGATIVE_TOTAL';
    RETURN;
  END IF;

  v_checksum := encode(
    digest(
      p_quote_id::text || ':' || v_version.id::text || ':' || v_total::text || ':' || coalesce(v_quote.terms_version,''),
      'sha256'
    ),
    'hex'
  );

  INSERT INTO public.portal_quote_acceptances (
    quote_id, quote_version_id, organization_id, accepted_by,
    accepted_total_cents, accepted_currency, accepted_terms_version,
    selected_optional_item_ids, acceptance_checksum
  ) VALUES (
    p_quote_id, v_version.id, v_quote.organization_id, v_uid,
    v_total, v_quote.currency, v_quote.terms_version,
    COALESCE(p_selected_optional_item_ids, '{}'::uuid[]), v_checksum
  )
  ON CONFLICT (quote_id, quote_version_id) DO NOTHING
  RETURNING id INTO v_acceptance_id;

  IF v_acceptance_id IS NULL THEN
    -- concurrent accept
    IF EXISTS (
      SELECT 1 FROM public.portal_quote_acceptances
      WHERE quote_id = p_quote_id AND accepted_by = v_uid
    ) THEN
      RETURN QUERY SELECT TRUE, 'ALREADY_ACCEPTED';
      RETURN;
    END IF;
    RETURN QUERY SELECT FALSE, 'ACCEPTANCE_CONFLICT';
    RETURN;
  END IF;

  UPDATE public.portal_quote_items
  SET is_selected = CASE
    WHEN is_optional THEN (id = ANY (COALESCE(p_selected_optional_item_ids, '{}'::uuid[])))
    ELSE TRUE
  END,
  updated_at = NOW()
  WHERE quote_id = p_quote_id;

  UPDATE public.portal_quotes SET
    status = 'ACCEPTED',
    accepted_at = NOW(),
    accepted_by = v_uid,
    accepted_version_number = v_version.version_number,
    accepted_total_cents = v_total,
    accepted_currency = currency,
    accepted_terms_version = terms_version,
    subtotal_cents = v_subtotal,
    vat_cents = v_tax,
    total_cents = v_total,
    version = version + 1,
    updated_at = NOW()
  WHERE id = p_quote_id
    AND version = p_expected_version;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'VERSION_CONFLICT';
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, 'ACCEPTED';
END;
$$;

REVOKE ALL ON FUNCTION public.accept_portal_quote(UUID, INT, UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_portal_quote(UUID, INT, UUID[]) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.decline_portal_quote(
  p_quote_id UUID,
  p_expected_version INT,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE (ok BOOLEAN, detail TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_quote public.portal_quotes%ROWTYPE;
  v_role TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT FALSE, 'NOT_AUTHENTICATED';
    RETURN;
  END IF;

  SELECT * INTO v_quote FROM public.portal_quotes WHERE id = p_quote_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'NOT_FOUND';
    RETURN;
  END IF;

  IF v_quote.version IS DISTINCT FROM p_expected_version THEN
    RETURN QUERY SELECT FALSE, 'VERSION_CONFLICT';
    RETURN;
  END IF;

  IF v_quote.status = 'DECLINED' AND v_quote.declined_by = v_uid THEN
    RETURN QUERY SELECT TRUE, 'ALREADY_DECLINED';
    RETURN;
  END IF;

  IF v_quote.status NOT IN ('SENT', 'VIEWED') THEN
    RETURN QUERY SELECT FALSE, 'INVALID_STATUS';
    RETURN;
  END IF;

  IF v_quote.valid_until IS NOT NULL AND v_quote.valid_until < (NOW() AT TIME ZONE 'UTC')::date THEN
    UPDATE public.portal_quotes SET status = 'EXPIRED', updated_at = NOW() WHERE id = p_quote_id;
    RETURN QUERY SELECT FALSE, 'EXPIRED';
    RETURN;
  END IF;

  SELECT om.customer_role INTO v_role
  FROM public.organization_members om
  WHERE om.organization_id = v_quote.organization_id
    AND om.user_id = v_uid
    AND om.status = 'ACTIVE'
  LIMIT 1;

  IF v_role IS NULL OR v_role NOT IN ('PRIMARY', 'MEMBER') THEN
    RETURN QUERY SELECT FALSE, 'ROLE_DENIED';
    RETURN;
  END IF;

  UPDATE public.portal_quotes SET
    status = 'DECLINED',
    declined_at = NOW(),
    declined_by = v_uid,
    decline_reason = NULLIF(btrim(COALESCE(p_reason, '')), ''),
    version = version + 1,
    updated_at = NOW()
  WHERE id = p_quote_id AND version = p_expected_version;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'VERSION_CONFLICT';
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, 'DECLINED';
END;
$$;

REVOKE ALL ON FUNCTION public.decline_portal_quote(UUID, INT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decline_portal_quote(UUID, INT, TEXT) TO authenticated, service_role;

-- Enable pgcrypto digest if needed
-- (created at top of migration)

-- ---------------------------------------------------------------------------
-- Verification RPC
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_quotes_acceptance_contracts()
RETURNS TABLE (check_name text, ok boolean, detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM (VALUES
    ('table:portal_quotes', to_regclass('public.portal_quotes') IS NOT NULL, 'portal_quotes'),
    ('table:portal_quote_items', to_regclass('public.portal_quote_items') IS NOT NULL, 'items'),
    ('table:portal_quote_versions', to_regclass('public.portal_quote_versions') IS NOT NULL, 'versions'),
    ('table:portal_quote_acceptances', to_regclass('public.portal_quote_acceptances') IS NOT NULL, 'acceptances'),
    (
      'fn:accept_portal_quote',
      EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='accept_portal_quote'),
      'accept RPC'
    ),
    (
      'fn:decline_portal_quote',
      EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='decline_portal_quote'),
      'decline RPC'
    ),
    (
      'rls:portal_quotes',
      (SELECT relrowsecurity FROM pg_class WHERE oid='public.portal_quotes'::regclass),
      'RLS'
    ),
    (
      'rls:portal_quote_items',
      (SELECT relrowsecurity FROM pg_class WHERE oid='public.portal_quote_items'::regclass),
      'RLS'
    ),
    (
      'rls:portal_quote_versions',
      (SELECT relrowsecurity FROM pg_class WHERE oid='public.portal_quote_versions'::regclass),
      'RLS'
    ),
    (
      'rls:portal_quote_acceptances',
      (SELECT relrowsecurity FROM pg_class WHERE oid='public.portal_quote_acceptances'::regclass),
      'RLS'
    ),
    (
      'anon_deny:portal_quotes',
      NOT has_table_privilege('anon', 'public.portal_quotes', 'SELECT'),
      'anon'
    ),
    (
      'anon_deny:acceptances',
      NOT has_table_privilege('anon', 'public.portal_quote_acceptances', 'SELECT'),
      'anon'
    ),
    (
      'no_mollie_coupling',
      NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='portal_quotes'
          AND column_name IN ('mollie_payment_id','checkout_session_id','payment_id')
      ),
      'no payment columns'
    ),
    (
      'col:portal_quotes.project_id',
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='portal_quotes' AND column_name='project_id'
      ),
      'project link'
    )
  ) AS t(check_name, ok, detail);
END;
$$;

REVOKE ALL ON FUNCTION public.verify_quotes_acceptance_contracts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_quotes_acceptance_contracts() TO service_role;

COMMENT ON TABLE public.portal_quotes IS
  'Canonical quotes store. Acceptance is digital offerteacceptatie — not a QES and not a payment.';
