# Verify vdb-backend-contract@0.2.0-rc.2

Local-only verification against `vdbdigital2` (42 migrations, schemaVersion `2026.07.27.financial-concurrency-rc2`).

1. `npx supabase db reset` → exit 0, final `20260724190000`
2. `npm run db:seed`
3. `npm run db:test-rls` → 13/13
4. `npm run db:verify-partner-backend`
5. `npm run db:verify-invoices-financial`
6. `npx tsx scripts/test-rc2-financial-concurrency.ts` → RUN1/RUN2 PASS (594 / 1582)
7. Compare `migrations.sha256` and `SHA256SUMS`

Do not apply remotely without separate authorization.
