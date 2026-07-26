# vdb-backend-contract@0.2.0-rc.2

Mobile compatibility delta on top of partner `0.2.0-rc.1`.

## schemaVersion

`2026.07.24.mobile-compat-rc2`

## Includes (additive)

- All partner RC1 tables/RPCs/ledger/payout invariants (unchanged contract surface)
- Customer portal tables listed as canonical (`portal_*`, orgs, profiles)
- Shared `feature_flags` rows for Mobile fail-closed keys
- `feature_flag_enabled(text[])` + payout gate on `partner_payouts`
- `verify_mobile_compat_contracts()`
- Explicit Mobile → owner table/RPC mapping (client adapters required where signatures differ)
- **Staging grant reconciliation (privilege-only, same `0.2.0-rc.2` / schemaVersion):**
  - `20260723140000_invoice_rpc_grant_hardening.sql`
  - `20260723150000_invoice_rpc_grant_verify_alignment.sql`
  - `20260724103105_staging_cloud_grant_hardening.sql`
  - Tracked migration count at RC2 freeze candidate: **39** (final version still `20260724160000`)

## Explicitly NOT published as canonical

- Owner historical freeze `0.1.0`
- Mobile local proposal `0.1.1` / `2026.07.24.remediation`

## Deferred (not in rc.2 schema)

- Appointments, Mobile admin work-queue RPCs, Mobile document upload helpers
- Marketing assets bucket / partner reviews (still deferred from rc.1)
- **RC3 messaging** (`2026072512*`) — outside RC2 boundary

## Version decision

`KEEP_RC2_VERSION` — bundle remains `unpublished: true`; no RC2 git tag existed; grants were already part of intended staging RC2 privilege state. No SemVer bump / no RC3 version for grants.

## Not authorized

- Remote migration apply / repair / db push (this reconciliation is Git-only)
- Production apply (exact-17 does not authorize RC2/RC3)
- Package registry publish
- Mollie / payouts enablement
- Checkout / P05 activation

## Consumers must pin

```text
VDB_BACKEND_CONTRACT=vdb-backend-contract@0.2.0-rc.2
VDB_SCHEMA_VERSION=2026.07.24.mobile-compat-rc2
```

Partner clients remain compatible with the rc.1 partner surface embedded in rc.2.
