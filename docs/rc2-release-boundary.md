# RC2 release boundary

## In RC2 (`vdb-backend-contract@0.2.0-rc.2` / `2026.07.24.mobile-compat-rc2`)

- Partner foundation (8 migrations `202607221*`)
- Invoice/portal grant hardening (`20260723140000`, `20260723150000`)
- Staging cloud grant hardening (`20260724103105`)
- Mobile compat (`20260724160000`)
- Tracked migration count: **39**
- Final migration version: **20260724160000**
- Storage: six private buckets

## Outside RC2 (reserved / deferred)

- **RC3 messaging** (`20260725120000`–`20260725120300`) — appointments/messaging support
- Production apply of any RC2/RC3 migration
- Checkout enablement / `P05_MIGRATION_APPLIED` / Mollie live
- Package registry publish (bundle `unpublished: true` until explicit freeze)

## Version policy for this reconciliation

`KEEP_RC2_VERSION` — privilege-only grants already on staging; no schemaVersion bump; not RC3.

## Freeze gates still later

- Push / tag / staging baseline freeze
- Next.js production-high triage
- Concurrent race tests
- Approved remote-link full isolation tag (when authorized)
