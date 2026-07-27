# vdb-backend-contract@0.2.0-rc.2

Mobile compatibility delta on top of partner `0.2.0-rc.1`, plus financial concurrency hardening.

## schemaVersion

`2026.07.27.financial-concurrency-rc2`

## Includes (additive)

- All partner RC1 tables/RPCs/ledger/payout invariants
- Customer portal tables listed as canonical (`portal_*`, orgs, profiles)
- Shared `feature_flags` rows for Mobile fail-closed keys
- `feature_flag_enabled(text[])` + payout gate on `partner_payouts`
- `verify_mobile_compat_contracts()`
- Staging grant reconciliation + catalog ACL privilege contract
- **Financial concurrency remediation:**
  - `20260724180000_partner_sale_single_conversion_concurrency.sql` — `UNIQUE(partner_lead_id)` + hardened `confirm_partner_sale`
  - `20260724190000_partner_payout_liability_concurrency.sql` — `partner_profiles FOR UPDATE` serialization in `request_partner_payout`
  - Error codes: `PARTNER_LEAD_ALREADY_CONVERTED`, `PARTNER_INSUFFICIENT_LIABILITY`
  - Tracked migration count: **42** (final version `20260724190000`)

## Explicitly NOT published as canonical

- Owner historical freeze `0.1.0`
- Mobile local proposal `0.1.1` / `2026.07.24.remediation`

## Deferred (not in rc.2 schema)

- Appointments, Mobile admin work-queue RPCs, Mobile document upload helpers
- Marketing assets bucket / partner reviews (still deferred from rc.1)
- **RC3 messaging** (`2026072512*`) — outside RC2 boundary

## Version decision

`KEEP_RC2_VERSION` for `contractVersion` (unpublished `0.2.0-rc.2`); `schemaVersion` bumped for concurrency migrations. Not RC3.

## Not authorized

- Remote migration apply / repair / db push
- Production apply (exact-17 does not authorize RC2/RC3)
- Package registry publish
- Mollie / payouts enablement
- Checkout / P05 activation

## Local freeze

Local annotated freeze tag: `shared-backend-rc2-local-freeze` (not pushed).

Role-change: payout-vs-suspension PASS; staff-authority revocation during mutation is `STAFF_REVOCATION_CONCURRENCY_NON_BLOCKING_LIMITATION` (not claimed as proven).

## Consumers must pin

```text
VDB_BACKEND_CONTRACT=vdb-backend-contract@0.2.0-rc.2
VDB_SCHEMA_VERSION=2026.07.27.financial-concurrency-rc2
```

Partner clients remain compatible with the rc.1 partner surface embedded in rc.2.
Losers of concurrent lead conversion receive `PARTNER_LEAD_ALREADY_CONVERTED`.
Losers of concurrent overspend payout requests receive `PARTNER_INSUFFICIENT_LIABILITY`.
