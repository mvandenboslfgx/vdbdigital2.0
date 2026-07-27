# Shared backend RC2 local freeze

**Verdict:** SHARED BACKEND RC2 LOCAL FREEZE PASS  
**Branch:** `freeze/shared-backend-rc2-local`  
**Pre-freeze HEAD:** `34c0a788086f2c29768da0d15a787f54c49f4d45`  
**Local tag:** `shared-backend-rc2-local-freeze`

## Identity

| Field | Value |
| --- | --- |
| contractVersion | `vdb-backend-contract@0.2.0-rc.2` |
| schemaVersion | `2026.07.27.financial-concurrency-rc2` |
| migrations | 42 |
| final migration | `20260724190000_partner_payout_liability_concurrency.sql` |

## What this freeze is

An immutable **local** release candidate for the VDB shared backend RC2 surface. It records Git HEAD, migration SHA256s, contract bundle, dependency baseline, concurrency proof, and explicit boundaries.

## What this freeze is not

- Not staging-ready / staging-apply authorized
- Not Git-push authorized
- Not production-ready / production-apply authorized
- Not a remote link or deployment authorization

## Dependency baseline

- next `16.2.12`
- scoped override `next.postcss` → `8.5.23`
- scoped override `next.sharp` → `0.35.3`
- npm production audit: critical/high/moderate/low = 0

## Concurrency proof

- Runs: 2/2 PASS
- Iterations: 594
- Concurrent calls: 1582
- Unexpected errors / invariant failures / duplicates / overspends / ledger imbalances: 0

## Role-change limitation

`STAFF_REVOCATION_CONCURRENCY_NON_BLOCKING_LIMITATION`

Payout-vs-suspension race PASS. Staff-authority revocation during mutation is not temporally modeled (auth checked at call start). Core financial invariants remain proven; freeze does **not** claim all authorization races are proven.

## RC3 boundary

RC3 messaging migrations (`2026072512*`) are outside RC2 — not in the 42-set, not in the bundle, not in the tag.

## Staging / production

- Staging `qzekuvmgfekzsowdecyk`: exists; remote RC2 apply/validation **not authorized** from this clean-room; data preflight required before any later apply.
- Production `nhsrdnjfsxfikfbdmdfj`: unchanged; exact-17 apply does **not** authorize these 42 RC2 migrations.

## Artifact hashes (SHA256)

Canonical list: `contracts/releases/vdb-backend-contract-0.2.0-rc.2/SHA256SUMS`

| Artifact | SHA256 |
| --- | --- |
| migrations.json | `ae850b2aa94d51a2e4a2ee0fb9b0da0115053d0cf9e5aa7dcc928110c52bbee0` |
| migrations.sha256 | `a0963bb95c95e0452154d822bdd78ccda9e0bda1f8e69d7856ca26f5fad2385a` |
| database.types.ts | `ba897f0f0b5cd1a0056752be42119b2a33958fc8869608ebc0a733f4185bed60` |
| package-lock.json | `9f0d59a10614a6e32770e69ddd15501270f46676fb09a0a92a74a3ddc6ebfff5` |

Bundle aggregate hash is recorded in `BUNDLE_SHA256.txt` after `scripts/finalize-rc2-freeze-hashes.ts`.

## Next gate

`STAGING RC2 PREFLIGHT AND EXPLICIT REMOTE AUTHORIZATION REQUIRED`
