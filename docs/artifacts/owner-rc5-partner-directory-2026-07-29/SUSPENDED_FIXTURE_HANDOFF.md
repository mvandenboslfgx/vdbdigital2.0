# SUSPENDED Fixture Handoff â€” Partners / Mobile

**For:** `vdb-partners`, `vdb-app`
**From:** Owner `vdbdigital2.0` (RC5 staging)
**Status:** Fixture ready â€” Partners suspended matrix may resume
**Secrets:** **not in Git** â€” load from local vault only

## What exists

One shared synthetic **SUSPENDED** Partner on staging:

| Item | Value |
| --- | --- |
| Staging project | `qzekuvmgfekzsowdecyk` |
| Fixture kind | `SUSPENDED_PARTNER_RC5` |
| Fingerprint | `099764f54e18` |
| Partner ID masked | `3754b24dâ€¦` |
| Status | `SUSPENDED` |
| `payout_eligible` | `false` |
| Vault | `C:\Users\XXX\.vdb-vault\partner-staging-suspended-rc5.env` |

## How to load credentials (local only)

Read env keys from the vault file (never commit, never paste into chat/evidence):

- `VDB_STAGING_PROJECT_REF`
- `VDB_STAGING_SUPABASE_URL`
- `VDB_STAGING_SUSPENDED_PARTNER_EMAIL`
- `VDB_STAGING_SUSPENDED_PARTNER_PASSWORD`
- `VDB_STAGING_SUSPENDED_PARTNER_ID`
- `VDB_STAGING_SUSPENDED_USER_ID`
- `VDB_STAGING_SUSPENDED_FIXTURE_KIND`
- `VDB_STAGING_SUSPENDED_FINGERPRINT`

Confirm `VDB_STAGING_PROJECT_REF === qzekuvmgfekzsowdecyk` before any call. Refuse production `nhsrdnjfsxfikfbdmdfj`.

## What Partners / Mobile should do next

1. **Suspended login flow** â€” sign in with vault credentials; assert profile/session reports `SUSPENDED` immediately.
2. **Capability matrix** â€” expect fail-closed:
   - catalog list deny / empty per Owner `list_partner_catalog` (`FORBIDDEN` when not ACTIVE)
   - lead create deny
   - no sale / commission / payout actions
   - no admin/owner routes
   - no cross-partner data
   - no internal support notes
3. **Re-run full staging matrix** (ACTIVE + PENDING + SUSPENDED).
4. Issue the **definitive Partners verdict**.

Still out of scope for Partners in that round:

- no phone attach
- no APK/AAB
- no Partners commit (unless your gate says otherwise)
- no production promotion

## Do not touch

- Staging ACTIVE fixtures `part_a` / `part_b` (needed for ACTIVE catalog)
- Production project / production smoke partners
- Owner `suspend_partner` AAL2 rules
- Service-role keys in client apps

## Evidence

Full Owner evidence:
`docs/artifacts/owner-rc5-partner-directory-2026-07-29/SUSPENDED_PARTNER_STAGING_FIXTURE.md`
