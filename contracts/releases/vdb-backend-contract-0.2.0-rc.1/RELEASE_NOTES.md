# vdb-backend-contract@0.2.0-rc.1

Additive partner/affiliate backend for shared staging RC1.

## Includes

- Partner identity, applications, codes, leads, sales
- Commissions, balanced ledger, payouts, cash receipts, adjustments
- RLS + SECURITY DEFINER RPCs
- schemaVersion `2026.07.22.partner-rc1`

## Deferred

- BCP-STAGING-009 marketing assets / 7th Storage bucket
- BCP-STAGING-011 partner reviews

## Not authorized

- Production apply (exact-17 baseline unchanged)
- Package registry publish
- Staging project creation (separate authorization)

## Consumers

Pin:

```text
VDB_BACKEND_CONTRACT=vdb-backend-contract@0.2.0-rc.1
VDB_SCHEMA_VERSION=2026.07.22.partner-rc1
```

Verify types SHA256 against `checksums.json` → `database.types.ts`.
