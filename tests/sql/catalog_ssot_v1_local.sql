-- Local-only catalog SSOT assertions.
-- Run against a local Supabase stack after:
--   npx supabase start
--   npx supabase db reset
-- Never point this at staging or production.

\set ON_ERROR_STOP on

DO $$
BEGIN
  IF current_setting('cluster_name', true) ILIKE '%prod%' THEN
    RAISE EXCEPTION 'BLOCKED: production-like cluster_name';
  END IF;
END $$;

-- 1) TV product exists with the locked commercial terms and is not public.
SELECT
  CASE
    WHEN p.slug = 'tv-streaming-jaarabonnement'
     AND p.price_cents = 10000
     AND p.billing_type::text = 'YEARLY'
     AND p.min_quantity = 1
     AND p.max_quantity = 3
     AND p.status::text = 'REVIEW'
     AND p.is_active = false
     AND p.publication_ready = false
     AND p.legal_status::text = 'LEGAL_REVIEW_REQUIRED'
    THEN 'PASS tv_product_locked_review'
    ELSE 'FAIL tv_product_locked_review'
  END AS assertion
FROM public.products p
WHERE p.slug = 'tv-streaming-jaarabonnement';

SELECT
  CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM public.list_public_catalog('nl')
      WHERE slug = 'tv-streaming-jaarabonnement'
    )
     AND NOT EXISTS (
      SELECT 1 FROM public.list_public_catalog('en')
      WHERE slug = 'tv-streaming-jaarabonnement'
    )
    THEN 'PASS tv_absent_from_public_rpc'
    ELSE 'FAIL tv_absent_from_public_rpc'
  END AS assertion;

-- 2) Public predicate requires the full gate.
SELECT
  CASE
    WHEN pg_get_functiondef('private.catalog_product_is_public(uuid)'::regprocedure)
      LIKE '%publication_ready = true%'
     AND pg_get_functiondef('private.catalog_product_is_public(uuid)'::regprocedure)
      LIKE '%is_active = true%'
    THEN 'PASS public_predicate_fail_closed'
    ELSE 'FAIL public_predicate_fail_closed'
  END AS assertion;

-- 3) create_order_with_items is service_role only.
SELECT
  CASE
    WHEN pg_get_functiondef('public.create_order_with_items(jsonb,jsonb)'::regprocedure)
      LIKE '%service_role%'
    THEN 'PASS create_order_with_items_service_role'
    ELSE 'FAIL create_order_with_items_service_role'
  END AS assertion;

-- 4) Anon execute on create_order_with_items must not exist.
SELECT
  CASE
    WHEN NOT has_function_privilege(
      'anon',
      'public.create_order_with_items(jsonb,jsonb)',
      'EXECUTE'
    )
    THEN 'PASS anon_cannot_create_order'
    ELSE 'FAIL anon_cannot_create_order'
  END AS assertion;

-- 5) Partner catalog execute is authenticated, not anon.
SELECT
  CASE
    WHEN has_function_privilege('authenticated', 'public.list_partner_catalog(text)', 'EXECUTE')
     AND NOT has_function_privilege('anon', 'public.list_partner_catalog(text)', 'EXECUTE')
    THEN 'PASS partner_catalog_authenticated_only'
    ELSE 'FAIL partner_catalog_authenticated_only'
  END AS assertion;

-- 6) Anon may list the public catalog RPC, never mutate catalog tables.
SELECT
  CASE
    WHEN has_function_privilege('anon', 'public.list_public_catalog(text)', 'EXECUTE')
     AND NOT has_table_privilege('anon', 'public.products', 'INSERT')
     AND NOT has_table_privilege('anon', 'public.products', 'UPDATE')
     AND NOT has_table_privilege('anon', 'public.products', 'DELETE')
    THEN 'PASS anon_public_catalog_read_only'
    ELSE 'FAIL anon_public_catalog_read_only'
  END AS assertion;

-- 7) Partner lead RPC is authenticated-only and quantity-aware.
SELECT
  CASE
    WHEN has_function_privilege(
      'authenticated',
      'public.create_partner_lead(text,text,text,text,text,text,text,uuid,integer)',
      'EXECUTE'
    )
     AND NOT has_function_privilege(
      'anon',
      'public.create_partner_lead(text,text,text,text,text,text,text,uuid,integer)',
      'EXECUTE'
    )
     AND pg_get_functiondef(
      'public.create_partner_lead(text,text,text,text,text,text,text,uuid,integer)'::regprocedure
     ) LIKE '%INVALID_QUANTITY%'
     AND pg_get_functiondef(
      'public.create_partner_lead(text,text,text,text,text,text,text,uuid,integer)'::regprocedure
     ) LIKE '%product_snapshot%'
    THEN 'PASS create_partner_lead_snapshot_and_quantity'
    ELSE 'FAIL create_partner_lead_snapshot_and_quantity'
  END AS assertion;

-- 8) Public predicate remains fail-closed on legal status and translations.
SELECT
  CASE
    WHEN pg_get_functiondef('private.catalog_product_is_public(uuid)'::regprocedure)
      LIKE '%LEGAL_REVIEW_REQUIRED%' IS NOT TRUE
     AND pg_get_functiondef('private.catalog_product_is_public(uuid)'::regprocedure)
      LIKE '%APPROVED_FOR_B2B%'
     AND pg_get_functiondef('private.catalog_product_is_public(uuid)'::regprocedure)
      LIKE '%locale = ''nl''%'
     AND pg_get_functiondef('private.catalog_product_is_public(uuid)'::regprocedure)
      LIKE '%locale = ''en''%'
     AND pg_get_functiondef('private.catalog_product_is_public(uuid)'::regprocedure)
      LIKE '%alt_text_nl%'
     AND pg_get_functiondef('private.catalog_product_is_public(uuid)'::regprocedure)
      LIKE '%c.is_active = true%'
    THEN 'PASS public_predicate_legal_i18n_media_category'
    ELSE 'FAIL public_predicate_legal_i18n_media_category'
  END AS assertion;
