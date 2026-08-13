# Production ACTIVE Partner Classification (read-only)

**Date:** 2026-07-29
**Project:** `nhsrdnjfsxfikfbdmdfj`
**Method:** read-only SQL + vault fingerprint match
**Writes:** none
**PII in this file:** none (email SHA-256 fingerprints + partner/user fingerprints only)

## Verdict summary

| Record | Classification | Partner type | Action now |
|--------|----------------|--------------|------------|
| ACTIVE-1 | `SYNTHETIC_CONFIRMED` | `UNKNOWN_REVIEW_REQUIRED` | No change; later controlled cleanup candidate |
| ACTIVE-2 | `SYNTHETIC_CONFIRMED` | `UNKNOWN_REVIEW_REQUIRED` | No change; later controlled cleanup candidate |

Both production ACTIVE partners are **aantoonbaar synthetische smoke-accounts**. Neither was deactivated, typed, or compliance-migrated in this gate.

## Matching method

1. Loaded emails from local vault `partner-production-auth-smoke.env` (keys only documented elsewhere; plaintext never written here).
2. Computed `sha256(lower(trim(email)))` fingerprints.
3. Compared to production `profiles.email` hashes for `partner_profiles.status = 'ACTIVE'`.
4. Confirmed vault `SUPABASE_PROJECT_REF = nhsrdnjfsxfikfbdmdfj` and `VDB_DEPLOYMENT_ENVIRONMENT = production`.

### Vault fingerprints (email SHA-256)

| Vault key | Fingerprint (full SHA-256) | Short |
|-----------|----------------------------|-------|
| `PROD_SMOKE_PARTNER_A_EMAIL` | `ab2bb14b96b3cfa60e25e6e93abb0e6e241e2ec8bd803b401a4f4222b8e0f673` | `ab2bb14b96b3cfa6` |
| `PROD_SMOKE_PARTNER_B_EMAIL` | `6175cbf5415705a66cfaafe15799a5183d943b452691b66513b6b03f96b8a9da` | `6175cbf5415705a6` |
| `PROD_SMOKE_PARTNER_PENDING_EMAIL` | `b4c56a76c3768ef1729940a7d1100d94f54400b7014d75fad6949f45c381e152` | `b4c56a76c3768ef1` |

### Production ACTIVE rows (masked)

| Label | partner_fp | user_fp | email_sha256 match | created_at (UTC) |
|-------|------------|---------|--------------------|------------------|
| ACTIVE-1 | `85b5b70fee3d2653` | `b47dec143666eb94` | exact `PROD_SMOKE_PARTNER_A` | `2026-07-28 15:41:15.168Z` |
| ACTIVE-2 | `bbeffced560d852b` | `4ffd8c4fcef5dd64` | exact `PROD_SMOKE_PARTNER_B` | `2026-07-28 15:41:15.609Z` |

## Supporting signals (non-PII)

| Signal | ACTIVE-1 | ACTIVE-2 |
|--------|----------|----------|
| Vault email hash match | yes (A) | yes (B) |
| Name synthetic hint (`synth|test|smoke|fixture`) | true | true |
| Application row | none | none |
| Partner codes | 0 | 0 |
| Leads / sales / commissions / payout requests | 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 |
| `payout_eligible` | false | false |
| `compliance_status` | `UNKNOWN` | `UNKNOWN` |
| Created as near-simultaneous batch | yes (~441 ms apart) | yes |

## Partner type

Production schema at tip `20260728213625` has **no** `partner_type` column (RC5 not applied).
Type is therefore `UNKNOWN_REVIEW_REQUIRED` for both. No inference from company/KVK/trade/display name was used.

## Safe default / promotion plan

- Conceptually treat as grandfathered smoke fixtures until a controlled cleanup ticket.
- Production promote plan: mark both `REVIEW_REQUIRED` for type classification **or** schedule synthetic cleanup after Owner sign-off.
- Do **not** auto-deactivate, auto-type, or grant new capabilities.
- Do **not** delete in this freeze.

## Production safety re-check (read-only)

| Check | Result |
|-------|--------|
| Migration tip | `20260728213625` |
| `admin_get_product` present | false |
| `partner_profiles.partner_type` present | false |
| `support_internal_notes_rpc` enabled | false |
| ACTIVE count | 2 |
| Writes this session | none |

## Classification labels used

- `SYNTHETIC_CONFIRMED` — exact vault smoke fingerprint match + corroborating synthetic naming hint + empty commercial activity.
- Partner type `UNKNOWN_REVIEW_REQUIRED` — RC5 type model not on production; no reliable type proof.
