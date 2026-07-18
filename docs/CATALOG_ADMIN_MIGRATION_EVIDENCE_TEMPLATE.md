# Catalog admin migration evidence template

Fill after a dry-run (never paste secrets or customer PII).

## Meta

| Field | Value |
|-------|--------|
| Git commit | |
| Operator | |
| Date (UTC) | |
| Environment | dry-run / staging / (never claim prod without backup) |

## Migration checksums (SHA-256)

| File | SHA-256 |
|------|---------|
| `20260716200000_catalog_admin.sql` | |
| `20260716210000_catalog_admin_hardening.sql` | |
| `20260716220000_catalog_verify_admin_contracts.sql` | |
| `20260716230000_catalog_admin_storage.sql` | |

Record with: `Get-FileHash supabase/migrations/20260716*.sql` (Windows) or `sha256sum`.

## Backup / PITR

| Check | Result |
|-------|--------|
| Backup / dump taken before apply | PASS / FAIL |
| Restore proven on dry-run | PASS / FAIL / N/A |
| PITR available | PASS / FAIL / N/A (Free plan) |

## Dry-run environment

| Check | Result |
|-------|--------|
| Docker / local Supabase or staging project | |
| `npx supabase db reset` or equivalent applied migrations in order | |
| P0.5 payment migrations applied? | Independent — optional |

## Migration apply result

| Migration | Applied | Notes |
|-----------|---------|-------|
| `20260716200000_catalog_admin` | | |
| `20260716210000_catalog_admin_hardening` | | |
| `20260716220000_catalog_verify_admin_contracts` | | |
| `20260716230000_catalog_admin_storage` | | |

## Verifier

```bash
npm run db:verify-catalog-admin
```

| Check | Result |
|-------|--------|
| Repo files + checksums | |
| RPC `catalog_verify_admin_contracts` present | |
| All required contracts PASS | |
| Anon cannot EXECUTE verifier | |
| RESULT line | PASS / FAIL / SKIPPED |

Paste RESULT line only (no secrets):

```text

```

## Alignment

```bash
npm run catalog:verify-alignment
```

| Check | Result |
|-------|--------|
| Duplicate SKU | |
| Duplicate slug | |
| Published unmapped shop products | |
| Informational MISSING_* counts | |
| RESULT | |

## RLS / grants

| Check | Result |
|-------|--------|
| product_* tables RLS enabled | |
| deny policies for anon/authenticated | |
| verifier EXECUTE only service_role | |

## Storage

| Check | Result |
|-------|--------|
| Bucket `product-media` private | |
| MIME / size limits | |
| Client upload denied | |
| service_role server-only confirmed | |

## Tests / build

| Command | Result |
|---------|--------|
| `npm run lint` | |
| `npm run typecheck` | |
| `npm test` | |
| `npm run test:access-control` | |
| `npm run build` | |
| `npm run env:scan-secrets` | |

## Open deviations

-

## Safety confirmations

```env
CHECKOUT_ENABLED=false
```

```text
P05_MIGRATION_APPLIED not set.
Legal approvals were not auto-granted by migration (defaults NOT_REVIEWED / publication_ready=false).
No production catalog migration applied in the hygiene-only phase.
```
