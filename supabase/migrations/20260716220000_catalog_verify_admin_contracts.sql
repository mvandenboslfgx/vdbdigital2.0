-- =============================================================================
-- Catalog admin contract verification RPC (read-only)
-- Independent of P0.5 payment RPCs. Do NOT apply until catalog dry-run gate.
-- =============================================================================

CREATE OR REPLACE FUNCTION catalog_verify_admin_contracts()
RETURNS TABLE(check_name TEXT, ok BOOLEAN, detail TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
  v_oid OID;
  v_secdef BOOLEAN;
  v_search TEXT;
  v_acl TEXT;
BEGIN
  -- --- Tables ---
  RETURN QUERY SELECT 'table:products'::TEXT, to_regclass('public.products') IS NOT NULL, 'products'::TEXT;
  RETURN QUERY SELECT 'table:categories'::TEXT, to_regclass('public.categories') IS NOT NULL, 'categories'::TEXT;
  RETURN QUERY SELECT 'table:product_translations'::TEXT, to_regclass('public.product_translations') IS NOT NULL, 'product_translations'::TEXT;
  RETURN QUERY SELECT 'table:product_media'::TEXT, to_regclass('public.product_media') IS NOT NULL, 'product_media'::TEXT;
  RETURN QUERY SELECT 'table:product_addons'::TEXT, to_regclass('public.product_addons') IS NOT NULL, 'product_addons'::TEXT;
  RETURN QUERY SELECT 'table:product_addon_links'::TEXT, to_regclass('public.product_addon_links') IS NOT NULL, 'product_addon_links'::TEXT;

  -- --- Enums ---
  SELECT COUNT(*) INTO v_count FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
  WHERE t.typname = 'product_status' AND e.enumlabel IN ('DRAFT','REVIEW','PUBLISHED','HIDDEN','ARCHIVED');
  RETURN QUERY SELECT 'enum:product_status'::TEXT, v_count = 5, format('found %s/5', v_count);

  SELECT COUNT(*) INTO v_count FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
  WHERE t.typname = 'price_mode' AND e.enumlabel IN ('FIXED','STARTING_FROM','QUOTE_ONLY');
  RETURN QUERY SELECT 'enum:price_mode'::TEXT, v_count = 3, format('found %s/3', v_count);

  SELECT COUNT(*) INTO v_count FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
  WHERE t.typname = 'legal_approval_status'
    AND e.enumlabel IN (
      'NOT_REVIEWED','INTERNAL_REVIEW','LEGAL_REVIEW_REQUIRED',
      'APPROVED_FOR_B2B','APPROVED_FOR_B2C','APPROVED_FOR_BOTH'
    );
  RETURN QUERY SELECT 'enum:legal_approval_status'::TEXT, v_count = 6, format('found %s/6', v_count);

  SELECT COUNT(*) INTO v_count FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
  WHERE t.typname = 'price_approval_status'
    AND e.enumlabel IN ('DRAFT','INTERNAL_REVIEW','APPROVED','PUBLISHED','ARCHIVED');
  RETURN QUERY SELECT 'enum:price_approval_status'::TEXT, v_count = 5, format('found %s/5', v_count);

  -- --- Required product columns ---
  RETURN QUERY
  SELECT 'column:products.internal_sku'::TEXT,
         EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='internal_sku' AND data_type='text'),
         'text nullable'::TEXT;
  RETURN QUERY
  SELECT 'column:products.price_mode'::TEXT,
         EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='price_mode'),
         'price_mode enum'::TEXT;
  RETURN QUERY
  SELECT 'column:products.version'::TEXT,
         EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema='public' AND table_name='products'
             AND column_name='version' AND is_nullable='NO'
             AND data_type='integer'
         ),
         'int NOT NULL (optimistic concurrency)'::TEXT;
  RETURN QUERY
  SELECT 'column:products.legal_status'::TEXT,
         EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema='public' AND table_name='products'
             AND column_name='legal_status' AND is_nullable='NO'
         ),
         'NOT NULL default NOT_REVIEWED'::TEXT;
  RETURN QUERY
  SELECT 'column:products.price_status'::TEXT,
         EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema='public' AND table_name='products'
             AND column_name='price_status' AND is_nullable='NO'
         ),
         'NOT NULL default DRAFT'::TEXT;
  RETURN QUERY
  SELECT 'column:products.publication_ready'::TEXT,
         EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema='public' AND table_name='products'
             AND column_name='publication_ready' AND is_nullable='NO'
             AND data_type='boolean'
         ),
         'boolean NOT NULL default false'::TEXT;
  RETURN QUERY
  SELECT 'column:products.audience_b2b'::TEXT,
         EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='audience_b2b'),
         'boolean'::TEXT;
  RETURN QUERY
  SELECT 'column:products.audience_b2c'::TEXT,
         EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='audience_b2c'),
         'boolean'::TEXT;
  RETURN QUERY
  SELECT 'column:products.legal_approved_by'::TEXT,
         EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='legal_approved_by'),
         'uuid FK profiles'::TEXT;
  RETURN QUERY
  SELECT 'column:products.legal_approved_at'::TEXT,
         EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='legal_approved_at'),
         'timestamptz'::TEXT;

  -- Categories extensions
  RETURN QUERY
  SELECT 'column:categories.is_active'::TEXT,
         EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categories' AND column_name='is_active'),
         'boolean'::TEXT;
  RETURN QUERY
  SELECT 'column:categories.name_nl'::TEXT,
         EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categories' AND column_name='name_nl'),
         'text'::TEXT;

  -- Translations
  RETURN QUERY
  SELECT 'column:product_translations.locale'::TEXT,
         EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_translations' AND column_name='locale'),
         'nl|en'::TEXT;

  -- Media
  RETURN QUERY
  SELECT 'column:product_media.storage_path'::TEXT,
         EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_media' AND column_name='storage_path' AND is_nullable='NO'),
         'text NOT NULL'::TEXT;
  RETURN QUERY
  SELECT 'column:product_media.mime_type'::TEXT,
         EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_media' AND column_name='mime_type'),
         'text'::TEXT;

  -- --- Indexes / constraints ---
  RETURN QUERY
  SELECT 'index:idx_products_internal_sku'::TEXT,
         EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_products_internal_sku'),
         'unique partial on internal_sku'::TEXT;
  RETURN QUERY
  SELECT 'index:idx_product_translations_locale_slug'::TEXT,
         EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_product_translations_locale_slug'),
         'unique (locale, slug) where slug set'::TEXT;
  RETURN QUERY
  SELECT 'index:idx_product_media_storage_path'::TEXT,
         EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_product_media_storage_path'),
         'unique storage_path'::TEXT;
  RETURN QUERY
  SELECT 'constraint:product_translations_product_locale'::TEXT,
         EXISTS (
           SELECT 1 FROM pg_constraint
           WHERE conrelid = 'public.product_translations'::regclass
             AND contype = 'u'
         ),
         'UNIQUE(product_id, locale)'::TEXT;
  RETURN QUERY
  SELECT 'fk:product_media.product_id'::TEXT,
         EXISTS (
           SELECT 1 FROM information_schema.table_constraints tc
           JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
           WHERE tc.table_schema='public' AND tc.table_name='product_media'
             AND tc.constraint_type='FOREIGN KEY' AND kcu.column_name='product_id'
         ),
         'FK products'::TEXT;
  RETURN QUERY
  SELECT 'fk:product_addon_links'::TEXT,
         EXISTS (
           SELECT 1 FROM information_schema.table_constraints
           WHERE table_schema='public' AND table_name='product_addon_links' AND constraint_type='FOREIGN KEY'
         ),
         'FK product + addon'::TEXT;

  -- --- RLS ---
  RETURN QUERY
  SELECT 'rls:product_translations.enabled'::TEXT,
         COALESCE((SELECT relrowsecurity FROM pg_class WHERE oid='public.product_translations'::regclass), false),
         'RLS on'::TEXT;
  RETURN QUERY
  SELECT 'rls:product_media.enabled'::TEXT,
         COALESCE((SELECT relrowsecurity FROM pg_class WHERE oid='public.product_media'::regclass), false),
         'RLS on'::TEXT;
  RETURN QUERY
  SELECT 'rls:product_addons.enabled'::TEXT,
         COALESCE((SELECT relrowsecurity FROM pg_class WHERE oid='public.product_addons'::regclass), false),
         'RLS on'::TEXT;
  RETURN QUERY
  SELECT 'rls:product_addon_links.enabled'::TEXT,
         COALESCE((SELECT relrowsecurity FROM pg_class WHERE oid='public.product_addon_links'::regclass), false),
         'RLS on'::TEXT;

  RETURN QUERY
  SELECT 'policy:product_translations.deny_anon_auth'::TEXT,
         EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_translations' AND policyname='deny_all_product_translations'),
         'deny ALL to anon, authenticated'::TEXT;
  RETURN QUERY
  SELECT 'policy:product_media.deny_anon_auth'::TEXT,
         EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_media' AND policyname='deny_all_product_media'),
         'deny ALL'::TEXT;
  RETURN QUERY
  SELECT 'policy:product_addons.deny_anon_auth'::TEXT,
         EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_addons' AND policyname='deny_all_product_addons'),
         'deny ALL'::TEXT;
  RETURN QUERY
  SELECT 'policy:product_addon_links.deny_anon_auth'::TEXT,
         EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_addon_links' AND policyname='deny_all_product_addon_links'),
         'deny ALL'::TEXT;

  -- --- Data integrity (read-only) ---
  SELECT COUNT(*) INTO v_count
  FROM (
    SELECT internal_sku FROM products
    WHERE internal_sku IS NOT NULL
    GROUP BY internal_sku HAVING COUNT(*) > 1
  ) d;
  RETURN QUERY SELECT 'data:duplicate_sku'::TEXT, v_count = 0, format('%s duplicate SKU groups', v_count);

  SELECT COUNT(*) INTO v_count
  FROM (
    SELECT slug FROM products GROUP BY slug HAVING COUNT(*) > 1
  ) d;
  RETURN QUERY SELECT 'data:duplicate_product_slug'::TEXT, v_count = 0, format('%s duplicate slug groups', v_count);

  SELECT COUNT(*) INTO v_count
  FROM (
    SELECT locale, slug FROM product_translations
    WHERE slug IS NOT NULL AND length(trim(slug)) > 0
    GROUP BY locale, slug HAVING COUNT(*) > 1
  ) d;
  RETURN QUERY SELECT 'data:duplicate_translation_slug'::TEXT, v_count = 0, format('%s duplicate locale+slug', v_count);

  SELECT COUNT(*) INTO v_count
  FROM product_media m
  LEFT JOIN products p ON p.id = m.product_id
  WHERE p.id IS NULL;
  RETURN QUERY SELECT 'data:orphan_media'::TEXT, v_count = 0, format('%s orphan media rows', v_count);

  SELECT COUNT(*) INTO v_count
  FROM product_translations t
  LEFT JOIN products p ON p.id = t.product_id
  WHERE p.id IS NULL;
  RETURN QUERY SELECT 'data:orphan_translations'::TEXT, v_count = 0, format('%s orphan translations', v_count);

  SELECT COUNT(*) INTO v_count
  FROM product_addon_links l
  LEFT JOIN products p ON p.id = l.product_id
  LEFT JOIN product_addons a ON a.id = l.addon_id
  WHERE p.id IS NULL OR a.id IS NULL;
  RETURN QUERY SELECT 'data:orphan_addon_links'::TEXT, v_count = 0, format('%s orphan addon links', v_count);

  -- Invalid combinations that look checkout-eligible but are not valid for one-time checkout
  SELECT COUNT(*) INTO v_count
  FROM products
  WHERE status = 'PUBLISHED'
    AND price_mode = 'FIXED'
    AND billing_type IN ('MONTHLY','YEARLY')
    AND publication_ready = TRUE
    AND legal_status IN ('APPROVED_FOR_B2B','APPROVED_FOR_B2C','APPROVED_FOR_BOTH');
  RETURN QUERY
  SELECT 'data:recurring_marked_ready'::TEXT,
         v_count = 0,
         format('%s published FIXED+recurring+ready rows (server checkout must still block)', v_count);

  SELECT COUNT(*) INTO v_count
  FROM products
  WHERE legal_status IN ('APPROVED_FOR_B2B','APPROVED_FOR_B2C','APPROVED_FOR_BOTH')
    AND price_status NOT IN ('APPROVED','PUBLISHED');
  RETURN QUERY
  SELECT 'data:legal_without_price_approval'::TEXT,
         v_count = 0,
         format('%s legal-approved without price approval', v_count);

  SELECT COUNT(*) INTO v_count
  FROM products
  WHERE price_mode = 'FIXED' AND (price_cents IS NULL OR price_cents <= 0)
    AND status IN ('PUBLISHED','REVIEW');
  RETURN QUERY
  SELECT 'data:fixed_without_price'::TEXT,
         v_count = 0,
         format('%s FIXED without positive price_cents', v_count);

  SELECT COUNT(*) INTO v_count
  FROM products
  WHERE price_mode = 'STARTING_FROM' AND (from_price_cents IS NULL OR from_price_cents <= 0)
    AND status IN ('PUBLISHED','REVIEW');
  RETURN QUERY
  SELECT 'data:starting_from_without_price'::TEXT,
         v_count = 0,
         format('%s STARTING_FROM without from_price', v_count);

  -- Defaults: no row should have been auto-approved by migration
  SELECT COUNT(*) INTO v_count
  FROM products
  WHERE legal_status IS NULL OR publication_ready IS NULL;
  RETURN QUERY
  SELECT 'data:legal_fields_nonnull'::TEXT,
         v_count = 0,
         format('%s null legal/publication fields', v_count);

  -- --- This verifier function security ---
  SELECT p.oid, p.prosecdef, COALESCE(array_to_string(p.proconfig, ','), '')
  INTO v_oid, v_secdef, v_search
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'catalog_verify_admin_contracts';

  RETURN QUERY SELECT 'rpc:catalog_verify_admin_contracts.signature'::TEXT, v_oid IS NOT NULL, 'function exists'::TEXT;
  RETURN QUERY SELECT 'rpc:catalog_verify_admin_contracts.security_definer'::TEXT, COALESCE(v_secdef, false), 'SECURITY DEFINER'::TEXT;
  RETURN QUERY
  SELECT 'rpc:catalog_verify_admin_contracts.search_path'::TEXT,
         COALESCE(v_search ILIKE '%search_path=public%', false),
         COALESCE(v_search, 'missing')::TEXT;

  SELECT COALESCE(string_agg(privilege_type, ','), '') INTO v_acl
  FROM information_schema.routine_privileges
  WHERE routine_schema='public'
    AND routine_name='catalog_verify_admin_contracts'
    AND grantee IN ('anon', 'authenticated', 'PUBLIC');

  RETURN QUERY
  SELECT 'rpc:catalog_verify_admin_contracts.no_public_execute'::TEXT,
         v_acl IS NULL OR v_acl = '',
         format('grantees anon/auth/public: %s', COALESCE(NULLIF(v_acl, ''), 'none'));

  SELECT COUNT(*) INTO v_count
  FROM information_schema.routine_privileges
  WHERE routine_schema='public'
    AND routine_name='catalog_verify_admin_contracts'
    AND grantee = 'service_role'
    AND privilege_type = 'EXECUTE';

  RETURN QUERY
  SELECT 'rpc:catalog_verify_admin_contracts.service_role_execute'::TEXT,
         v_count > 0,
         format('service_role EXECUTE grants: %s', v_count);
END;
$$;

REVOKE ALL ON FUNCTION catalog_verify_admin_contracts() FROM PUBLIC;
REVOKE ALL ON FUNCTION catalog_verify_admin_contracts() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION catalog_verify_admin_contracts() TO service_role;

COMMENT ON FUNCTION catalog_verify_admin_contracts() IS
  'Read-only catalog admin schema/data contract verifier. No mutations. service_role only.';
