# Shared backend RC2 validation matrix

Local-only gates for `vdb-backend-contract@0.2.0-rc.2` / `2026.07.27.financial-concurrency-rc2`.

| Suite | Command | Required |
| --- | --- | --- |
| Clean reset | `npx supabase db reset` | 42 migrations, final `20260724190000` |
| Seed | `npm run db:seed` | PASS |
| Catalog RLS | `npm run db:test-rls` | 13/13, 0 skipped |
| Partner contracts | `npm run db:verify-partner-backend` | PASS (temp enable `partner_payouts`, restore false) |
| Invoices financial | `npm run db:verify-invoices-financial` | PASS |
| Payments schema | `npm run db:verify-p0-payments` | PASS (schema; behavioral separate) |
| Quotes | `npm run db:verify-quotes-acceptance` | PASS |
| Portal | `npm run db:verify-customer-portal` | PASS |
| Catalog alignment | `npm run catalog:verify-alignment` | PASS |
| Catalog hygiene | `npm run catalog:verify-no-<legacy-chat-brand>` | PASS |
| Typecheck | `npm run typecheck` | PASS |
| Lint | `npm run lint` | PASS (0 errors) |
| Unit | `npm test` | PASS |
| Access-control | `npm run test:access-control` | PASS |
| Security | `npm run test:security` | PASS |
| Build | `npm run build` | PASS |
| npm audit prod | `npm audit --omit=dev` | 0/0/0/0 |
| Secret scan | `npm run env:scan-secrets` | REAL_SECRET_MATCHES=0 |
| Concurrency | `npx tsx scripts/test-rc2-financial-concurrency.ts` | 2 runs, 594 / 1582, 0 failures |
| Types drift | regenerate `--local` vs bundle `database.types.ts` | PASS |

## Explicitly not claimed as executed in this clean-room

Remote-linked `audit:supabase-full` / schema / storage / foreign-data against production URL (no `.env.local`). Local Docker Storage proof: 6 private / 0 public buckets.

## Role-change

| Subcase | Status |
| --- | --- |
| Payout vs partner suspension | PASS |
| Staff-authority revocation during mutation | `STAFF_REVOCATION_CONCURRENCY_NON_BLOCKING_LIMITATION` |
