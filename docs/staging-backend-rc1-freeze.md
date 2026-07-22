# Staging Backend RC1 Freeze

**Date:** 2026-07-22  
**Verdict target:** `SHARED BACKEND STAGING RC1 FREEZE PASS`  
**Pre-RC HEAD:** `c390bd2ce92f418ba7670bd901e6dd2a72e7a5b6`  
**Branch:** `phase/shared-partner-backend`  
**RC tag (local):** `shared-partner-backend-rc1`

## Contract

| Field | Value |
|-------|-------|
| contractVersion | `vdb-backend-contract@0.2.0-rc.1` |
| schemaVersion | `2026.07.22.partner-rc1` |
| Release bundle | `contracts/releases/vdb-backend-contract-0.2.0-rc.1/` |
| Bundle SHA256 | `01f933a2aa4b3cc235304c8879dfa912690f87f35638b2877c366c67debd8b5e` |
| Types source | `src/types/database.partner-rc1.ts` (copied, not hand-written) |
| Types SHA256 | `43590d90252c6813aa2d4cecfcb88abdba21c3c2133c0df1d46fb91f4e90c64a` |
| Migration manifest | `contracts/releases/vdb-backend-contract-0.2.0-rc.1/migration-manifest.json` |
| Artifact mirror | `docs/artifacts/partner-rc1-migration-manifest.json` |

## Partner migrations (exactly 8)

| Version | Filename | SHA256 |
|---------|----------|--------|
| 20260722100000 | partner_identity_roles.sql | `9184ada8546d565b4d2fefd34872d7f4882ff6e39bd49725056f1e3a31d47c42` |
| 20260722110000 | partner_applications_profiles_codes.sql | `3ebf64ce136c478bee3181e3db5a9ce847f31f67626b97b914e24a09e3adb33d` |
| 20260722120000 | partner_leads_and_sales.sql | `137676c21bc69d21d688cf49ce0fddc71b77dc594afaebadf7bcd688bded5ecf` |
| 20260722130000 | partner_commissions_and_ledger.sql | `e734673ddbad4c01cc272da40c1c622aa5dbcf2e14e01a7063e21764672ecfaf` |
| 20260722140000 | partner_payouts.sql | `f434e08e5ab5e3a71676542d043c3e9f44dffefdc130c232a8dd71dc426f4ec2` |
| 20260722150000 | partner_cash_receipts_adjustments.sql | `964344536aa1842927b277c334a0eb1a133420cc5da748f8def29c66ec976353` |
| 20260722160000 | partner_rls_and_rpcs.sql | `b356503c584383a2e1e003c7bdef0cf78887ddf23c2130658e486100e0d0518f` |
| 20260722170000 | partner_verify_contracts.sql | `f4002471d92aba99e4151b3d8e9d89afc5ee465dd243b2913f94ec4bbcb913a9` |

Highest migration version: `20260722170000`.  
No pre-existing migration files modified relative to base `93ab6cc`.  
No production history repair. No new baseline marker.

## Validation results (local `vdbdigital2` only)

| Check | Result |
|-------|--------|
| Clean `supabase db reset` | PASS |
| BACKEND CONTRACT RC1 DRIFT CHECK | PASS |
| Partner scenarios 4/5/6/8/9/10 | PASS |
| Financial integrity | PASS |
| Typecheck | PASS |
| Access-control suite | PASS (66) |
| Partner + catalog hygiene | PASS (23) |
| Secret scan | REAL_SECRET_MATCHES=0 |
| Checkout | false / fail-closed |
| P05_MIGRATION_APPLIED | unset |
| Mollie live | not configured for this freeze |

## BCP status

| ID | Status |
|----|--------|
| BCP-STAGING-001 … 008, 010 | IMPLEMENTED |
| BCP-STAGING-009 marketing assets | DEFERRED_NON_BLOCKING |
| BCP-STAGING-011 reviews | DEFERRED_NON_BLOCKING |

## Storage baseline

Exactly six private buckets unchanged:

`customer-documents`, `invoice-documents`, `product-media`, `project-files`, `quote-documents`, `support-attachments`

No seventh bucket in RC1.

## Production / staging boundary

- Production project ref (denylist only): `nhsrdnjfsxfikfbdmdfj`
- Exact-17 production apply baseline ending at `20260719170000` does **not** authorize partner migrations
- Staging project **NOT CREATED**
- No `supabase link` / `db push` / migration repair / remote SQL executed in this freeze
- Proposed future project name: `VDB Digital Staging` (`environment-id=vdb-staging`, region `eu-west-1`)
- Recommended org candidate for creation auth (owner must confirm): **VDB Digital Software** / `imxezqspfjxsyajhexmz` (distinct from production org **vdb nieuw**)
- Alternate same-name org also present: `wrymyfczxjvywhrrzgfq` — must be explicitly chosen in authorization message
- CLI region choice includes `eu-west-1`
- No existing project named `VDB Digital Staging`

## Staging worktree (after freeze commit + tag)

Path: `C:\Users\XXX\vdbdigital-staging-rc1`  
Purpose: later link **only** the new staging project; original worktree remote target unchanged.

## Secrets

No secrets, connection strings, service-role values, or passwords in this document or the release bundle.
