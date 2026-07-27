# RC2 catalog privilege contract (least-privilege)

## What went wrong (reproducible from Git, no hosted bootstrap)

In a clean local DB created by `npx supabase db reset` using the RC2 Git migration chain, the catalog RLS gate failed:

- `npm run db:seed` failed while upserting `public.categories`
- `npm run db:test-rls` failed because `anon` could not read the expected public catalog rows (published, non-concept products)

Root cause: SQL privilege gaps between local Git state vs hosted Supabase defaults.

## Contract target

After a pure local reset from Git, the following must be reproducible without any manual Supabase default-ACL alignment:

- `db:seed` succeeds (uses `service_role` to upsert `public.categories` and `public.products`)
- `catalog db:test-rls` succeeds:
  - `anon` can read only the intended public catalog rows
  - `anon` cannot write catalog records
  - RLS remains the mechanism for row-level visibility

## Least-privilege SQL contract

This remediation is implemented by a single new migration:

- `20260724173000_catalog_role_acl_privileges_contract.sql`

Privileges added (SQL-level only; RLS policies remain unchanged):

- `service_role`: `SELECT, INSERT, UPDATE, DELETE` on `public.categories` and `public.products`
- `anon`: `SELECT` on `public.categories` and `public.products`
- `authenticated`: `SELECT` on `public.categories` and `public.products`

No broad `PUBLIC` grants, no write privileges to `anon`, no RLS bypass changes.

## RC3 boundary

This is catalog ACL only. RC3 messaging migrations (`2026072512*`) remain strictly outside RC2.

