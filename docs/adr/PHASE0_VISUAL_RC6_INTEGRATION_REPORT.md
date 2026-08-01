# Phase 0 — Visual/i18n + RC6 integration report

**Branch:** `integration/visual-rc6-i18n-foundation`  
**Worktree:** `C:/Users/XXX/vdbdigital-visual-rc6-i18n`  
**HEAD after Phase 0:** `b8706ac…` (see git log)  
**Audit WT:** untouched / clean @ `0fe80ca` on `audit/i18n-international-readiness`  
**Push/deploy:** none

## Merge bases

- `merge-base(0fe80ca, 76694a3)` = `a593e5d395fc7b90994c5cb2e8554cd241c48706`

## Included commits

| Source | SHA | How |
|--------|-----|-----|
| Visual base | `0fe80caa…` | branch start |
| ADR-001 | `31170f82…` | local commit |
| origin RC6 tip | `76694a32…` | merge → `8453f5b6…` |
| local NODE_ENV test fix | `0c789755…` | cherry-pick → `7ef9373d…` |
| IDV admin review (rc.7) | `fceb4a41…` | cherry-pick → `b8706ac…` |

## Not included

| Source | SHA | Reason |
|--------|-----|--------|
| feat-promo banner | `ad842d6` | deferred — map keys only when feature lands |
| OWNER assign script | `45f583f` | deferred — staging ops, not i18n foundation |

## Conflict resolutions

1. **`package.json`** — keep visual messaging verify scripts **and** RC6 `staging:mollie-e2e`.
2. **`docs/backend-contract.md`** — keep RC5/RC6 header from RC6 + detailed RC2/RC3 history from visual.
3. **`scripts/verify-partner-backend.ts`** — keep RC4 `approve_partner_commission` / AAL2 payout prerequisite from RC6.

## Migrations

- Additive only; no edits to already-applied migration files.
- No duplicate timestamp prefixes.
- Newest: `20260801120000_staff_attest_partner_admin_review_rc7.sql`.
- **Not applied** to staging/production in this phase.

## Integrity checks

| Check | Result |
|-------|--------|
| `src/i18n` tree vs `0fe80ca` | identical |
| `src/middleware.ts` vs `0fe80ca` | identical |
| `npm install` | OK (514 pkgs) |
| `tsc --noEmit` | PASS |
| Core unit tests (i18n, mollie, invoice checkout, security, seo, sitemap, support) | **93/93 PASS** |
| `next build` | PASS |
| Lint | FAIL (pre-existing visual `import-software-catalog-xlsx.cjs` require-imports; RC6 unused var warning) |
| Contract bundle checksum tests (rc5/rc6/rc7) | FAIL — pre-existing line-ending / seal inconsistency + rc5 test expects stale `highestVersion` vs its own manifest on `76694a3` |

## Residual risks

- Contract seal tests unreliable under Windows `core.autocrlf=true`; re-seal on LF CI before trusting digests.
- feat-promo not merged (intentional).
- Custom i18n runtime still present until Phase 1.
- Migrations not applied remotely (intentional).

## Verdict

**Phase 0 = PASS** for Owner-complete local tip (visual/i18n + RC6 security/Mollie/support + rc.7 admin attestation). Proceed to Phase 1 (next-intl).
