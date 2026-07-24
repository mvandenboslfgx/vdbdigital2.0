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

## Explicitly NOT published as canonical

- Owner historical freeze `0.1.0`
- Mobile local proposal `0.1.1` / `2026.07.24.remediation`

## Deferred (not in rc.2 schema)

- Appointments, Mobile admin work-queue RPCs, Mobile document upload helpers
- Marketing assets bucket / partner reviews (still deferred from rc.1)

## Not authorized

- Staging project creation
- Remote migration apply
- Production apply
- Package registry publish
- Mollie / payouts enablement

## Consumers must pin

```text
VDB_BACKEND_CONTRACT=vdb-backend-contract@0.2.0-rc.2
VDB_SCHEMA_VERSION=2026.07.24.mobile-compat-rc2
```

Partner clients remain compatible with the rc.1 partner surface embedded in rc.2.
