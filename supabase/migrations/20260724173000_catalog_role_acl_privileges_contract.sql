-- =============================================================================
-- RC2 CATALOG PRIVILEGE CONTRACT REMEDIATION (least-privilege)
--
-- Goal (source-of-truth reproducibility):
-- After a pure local `supabase db reset` from the Git migration chain,
-- `db:seed` and `db:test-rls` must succeed without relying on hosted Supabase
-- default privileges/ACL side effects.
--
-- Verified failure mode (prior FAIL):
-- - service_role lacked INSERT/UPDATE on `public.categories` and `public.products`
--   => `npm run db:seed` failed while upserting categories/products.
-- - anon lacked SELECT on `public.categories` and `public.products`
--   => `npm run db:test-rls` could not read published non-concept products.
--
-- Security boundary:
-- - No broad PUBLIC/anon write permissions.
-- - No RLS bypass changes; only SQL privileges required for seed/tests.
-- - Least privilege only for the catalog objects used by seed and tests.
-- =============================================================================

-- Seed/bootstrap + catalog verifier needs DML on these two tables.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.categories TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.products TO service_role;

-- Anon must be able to read the public catalog surface (RLS decides row visibility).
GRANT SELECT ON TABLE public.categories TO anon;
GRANT SELECT ON TABLE public.products TO anon;

-- Authenticated clients need the same public read surface (RLS decides what rows).
GRANT SELECT ON TABLE public.categories TO authenticated;
GRANT SELECT ON TABLE public.products TO authenticated;

