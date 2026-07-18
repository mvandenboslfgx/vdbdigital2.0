# Customer Portal Migration

## File

`supabase/migrations/20260717000000_customer_portal.sql`

Forward-only. Creates organizations, portal entities, RLS, private storage buckets, `portal_verify_customer_contracts()`.

## Local apply only

1. Confirm Docker local Supabase (`project_id` local, API on localhost).
2. Confirm `NEXT_PUBLIC_SUPABASE_URL` host is `127.0.0.1` or `localhost`.
3. Confirm **not** `--linked` against production.
4. Confirm `CHECKOUT_ENABLED=false` and `P05_MIGRATION_APPLIED` unset.
5. Apply: `npx supabase migration up` (or `db reset` on clean local only).
6. Verify: `npm run db:verify-customer-portal`

## Forbidden

- `supabase db push` to production
- Remote migration apply / repair
- Setting `P05_MIGRATION_APPLIED` for this work
