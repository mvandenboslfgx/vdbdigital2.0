# RC2 staging grant security review

**Files reviewed:** the three grant migrations listed in `docs/rc2-staging-grant-reconciliation.md`.

## Per-file result

| File | Result |
| --- | --- |
| `20260723140000_invoice_rpc_grant_hardening.sql` | **GRANT MIGRATION SECURITY PASS** |
| `20260723150000_invoice_rpc_grant_verify_alignment.sql` | **GRANT MIGRATION SECURITY PASS** |
| `20260724103105_staging_cloud_grant_hardening.sql` | **GRANT MIGRATION SECURITY PASS** |

## Checks

| Check | Result |
| --- | --- |
| Business data INSERT/UPDATE/DELETE/TRUNCATE | None (GRANT privilege keywords only) |
| Storage / Auth mutation | None |
| Migration-history mutation | None |
| Checkout / Mollie live activation | None |
| RC3 / messaging objects | None |
| Broad GRANT to PUBLIC (data) | None — REVOKE from PUBLIC on financial RPCs |
| Unintended GRANT to anon | None — explicit REVOKE ALL FROM anon on sensitive tables |
| Unrestricted authenticated financial mutation via RPC | Denied — invoice issue/record/reverse → service_role only |
| service_role grants | Limited to verifiers + invoice/payment RPCs requiring server authority |
| RLS bypass for normal clients | No — authenticated table DML still subject to RLS |
| Schema qualification | `public.` used |
| Objects exist before grants | Invoice/portal objects created in earlier migrations (`<=20260719170000` / partner set / portal) |

## Catalog / service_role note

These migrations restore **PostgREST-usable authenticated DML** on portal/org tables and lock sensitive RPCs to `service_role`. They do **not** grant `service_role` (or `anon` SELECT) on `categories`/`products`.

After a pure 39-migration `db reset`, local ACL remains `service_role=Dxt` on catalog tables → `npm run db:seed` / `npm run db:test-rls` still fail without a separate authorized catalog-privilege migration or local CLI bootstrap alignment with hosted defaults.

**CATALOG RLS ACL RECONCILIATION:** FAIL (gap outside these three files’ SQL scope).
