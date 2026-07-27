# RC2 catalog ACL security review

## Scope

Reviewed only the new migration:

- `supabase/migrations/20260724173000_catalog_role_acl_privileges_contract.sql`

This migration contains **no data changes** and **no business logic changes**.
It only codifies the minimum SQL privileges required for seed/tests to run
on a clean local reset.

## Explicit checks

1. **No business data mutations**
   - Migration contains only `GRANT` statements on `public.categories` and `public.products`.
   - No `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`.

2. **No storage/auth mutations**
   - No references to `storage.*` or `auth.*`.

3. **No broad access**
   - No `GRANT ... TO PUBLIC`.
   - No writes granted to `anon`.

4. **No RLS bypass changes**
   - No `ALTER TABLE ... FORCE|NO FORCE ROW LEVEL SECURITY`.
   - No changes to `SECURITY DEFINER` functions.

5. **Least-privilege alignment**
   - `service_role` receives only the table DML required for `db:seed` and `db:test-rls`.
   - `anon` and `authenticated` receive only `SELECT` for public catalog visibility; row-level exposure remains governed by existing RLS policies.

## RC3 boundary

No RC3 messaging migrations are copied/added by this remediation.

