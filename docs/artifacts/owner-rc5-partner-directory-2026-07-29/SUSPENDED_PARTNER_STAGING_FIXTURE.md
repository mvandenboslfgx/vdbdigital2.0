# SUSPENDED Partner Staging Fixture â€” Owner RC5

**Date:** 2026-07-29
**Owner repo:** `vdbdigital2.0`
**Branch:** `phase/shared-partner-backend`
**HEAD:** `8264893c25ba6438393c0469fcc623c68fbfa93d`
**Contract:** `vdb-backend-contract@0.2.0-rc.5`
**schemaVersion:** `2026.07.29.partner-identity-directory-rc5`
**Staging ref:** `qzekuvmgfekzsowdecyk`
**Staging migration tip:** `20260729140400`
**Production ref (untouched):** `nhsrdnjfsxfikfbdmdfj`

## Verdict

`SUSPENDED PARTNER STAGING FIXTURE PASS â€” PARTNERS MATRIX MAY RESUME â€” PRODUCTION UNTOUCHED`

## Strategy

**Preference B** â€” local guarded staging fixture provisioner.

Preference A (`suspend_partner` via admin/owner JWT + AAL2) was **technically impossible** on this staging project:

- Staging ADMIN / OWNER synthetic accounts have **0 verified MFA factors**.
- Canonical RPC `suspend_partner(uuid, text, text)` calls `require_aal2()` after `is_admin_or_owner()`.
- No staging TOTP secrets exist in the local vault for automation.

Owner AAL2 coverage for the real mutation path remains the existing RC4 unit/matrix tests. This fixture is **synthetic staging testdata**, not a substitute for runtime AAL2 suspension proofs.

### Provisioner

- Script (WIP, uncommitted): `scripts/staging/provision-suspended-partner-fixture.mjs`
- Hard guards: CLI linked ref must be `qzekuvmgfekzsowdecyk`; refuse `nhsrdnjfsxfikfbdmdfj`
- Never reads `.env.local` (points at production)
- Staging API keys loaded via `supabase projects api-keys --project-ref=qzekuvmgfekzsowdecyk`
- Auth user via Admin API; consistent `partner_profiles` row via linked staging SQL
- No contract change, no migration, no permanent fixture RPC, no AAL2 relaxation

## Fixture identity (masked)

| Field | Value |
| --- | --- |
| Strategy | B |
| Fixture kind | `SUSPENDED_PARTNER_RC5` |
| Fingerprint (SHA-256 prefix) | `099764f54e18` |
| Partner ID masked | `3754b24dâ€¦` |
| User ID masked | `92ae3b8bâ€¦` |
| Email masked | `sta***@example.test` |
| Display name | `STAGING_RC5_FIXTURE SUSPENDED_PARTNER` |
| Status | `SUSPENDED` |
| `payout_eligible` | `false` |
| `suspended_at` | set |
| Vault path | `C:\Users\XXX\.vdb-vault\partner-staging-suspended-rc5.env` |
| Vault manifest | `C:\Users\XXX\.vdb-vault\partner-staging-suspended-rc5.manifest.json` |

No passwords, tokens, TOTP secrets, service-role keys, or full IDs in this document.

## Capability matrix (proven on staging)

| Capability | Expected | Result |
| --- | --- | --- |
| Login | succeeds | PASS |
| Profile status after login | `SUSPENDED` | PASS |
| Session refresh / restore | still `SUSPENDED` | PASS |
| `list_partner_catalog` | deny (`FORBIDDEN`) | PASS |
| `create_partner_lead` (8-arg) | deny (`FORBIDDEN`) | PASS |
| `request_partner_payout` | deny / not configured | PASS (`FEATURE_NOT_CONFIGURED`) |
| `confirm_partner_sale` | deny (`FORBIDDEN`) | PASS |
| Admin / owner role | none | PASS |
| Cross-partner `partner_leads` read | empty | PASS |
| Internal support notes (`is_internal=true`) | not readable | PASS |
| Logout clears session | yes | PASS |
| Relogin | still `SUSPENDED` | PASS |

Commission approval RPCs are staff-gated; suspended partner cannot reach an accrual action path. Sale confirm deny covers the sale mutation surface for non-staff callers.

## Staging population after provision

| Status | Count |
| --- | --- |
| ACTIVE | 3 (unchanged; includes `part_a` / `part_b`) |
| PENDING | 2 |
| SUSPENDED | 1 (this fixture) |

Existing ACTIVE matrix fixtures `e8374bc0â€¦` (`part_a`) and `473c484câ€¦` (`part_b`) remain `ACTIVE`.

## Production safety (read-only)

CLI remained linked to staging (`qzekuvmgfekzsowdecyk`) throughout. No production write, migration, RPC, feature-flag change, or deployment was performed.

Production read-only probe (`nhsrdnjfsxfikfbdmdfj`):

| Check | Result |
| --- | --- |
| Partner status counts | `ACTIVE=2`, `PENDING=1` |
| `SUSPENDED` partners | `0` |
| Rows with `STAGING_RC5_FIXTURE` display | `0` |
| Profiles matching suspended fixture email | `0` |
| Two production ACTIVE smoke partners | untouched |

## Cleanup instruction

Local operator only:

1. Do **not** delete or suspend `part_a` / `part_b`.
2. To remove this fixture: delete the synthetic staging auth user (Admin API) and its `partner_profiles` / `profiles` rows on **staging only**, or leave it for ongoing matrix use.
3. Delete local vault files when credentials must be rotated:
   - `C:\Users\XXX\.vdb-vault\partner-staging-suspended-rc5.env`
   - `C:\Users\XXX\.vdb-vault\partner-staging-suspended-rc5.manifest.json`
4. Re-run `node scripts/staging/provision-suspended-partner-fixture.mjs` to rotate password idempotently.

## Open limitations

- Preference A not exercised on staging (no verified MFA on staging admin/owner).
- Portal â€œown support ticket createâ€ happy-path not separately asserted; internal-note non-leak and cross-partner isolation were.
- Script is local WIP; not committed in this gate (per git boundaries).

## Inventory snapshot (read-only, pre-write)

- Existing staging fixtures: mobile RC3 role matrix vault + RC5 compliance fixtures flag enabled
- Synthetic partners before: ACTIVEÃ—3, PENDINGÃ—2, SUSPENDEDÃ—0
- Admin/owner AAL2: none verified
- `suspend_partner`: OWNER/ADMIN + AAL2 + reason + idempotency; sets `SUSPENDED`, `suspended_at`, `payout_eligible=false`; audits `admin.partner.suspended`
- Downstream guards: `list_partner_catalog`, `create_partner_lead`, `request_partner_payout` require `ACTIVE`
