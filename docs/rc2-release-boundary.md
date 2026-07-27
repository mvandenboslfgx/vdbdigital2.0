# RC2 release boundary

## In RC2 (`vdb-backend-contract@0.2.0-rc.2` / `2026.07.27.financial-concurrency-rc2`)

- Partner foundation (8 migrations `202607221*`)
- Invoice/portal grant hardening (`20260723140000`, `20260723150000`)
- Staging cloud grant hardening (`20260724103105`)
- Mobile compat (`20260724160000`)
- Catalog ACL remediation (`20260724173000`)
- Sale single-conversion concurrency (`20260724180000`)
- Payout liability serialization (`20260724190000`)
- Tracked migration count: **42**
- Final migration version: **20260724190000**
- Storage: six private buckets

## Outside RC2 (reserved / deferred)

- **RC3 messaging** (`20260725120000`–`20260725120300`) — appointments/messaging support
- Production apply of any RC2/RC3 migration
- Checkout enablement / `P05_MIGRATION_APPLIED` / Mollie live
- Package registry publish (bundle `unpublished: true` until explicit freeze)

## Version policy for concurrency remediation

`KEEP_RC2_VERSION` for contractVersion; schemaVersion bumped to `2026.07.27.financial-concurrency-rc2`.

## Freeze gates still later

- Push / tag / staging baseline freeze (requires staging duplicate/overspend preflight)
- Approved remote-link full isolation tag (when authorized)
