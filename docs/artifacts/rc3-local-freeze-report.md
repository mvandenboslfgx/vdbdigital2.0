# OWNER CONTRACT RC.3 — Local freeze report

**Date:** 2026-07-27  
**Worktree:** `C:\Users\XXX\vdbdigital-rc3-freeze`  
**Branch:** `freeze/shared-backend-rc3-local`  
**Base:** `shared-backend-rc2-local-freeze` (`2c8bd3aa51c2046b984ac5dbeaa44ccb14301b12`)

## Verdict

```text
OWNER CONTRACT RC3 LOCAL FREEZE PASS — STAGING APPLY NOT AUTHORIZED
```

## A. Git

| Item | Value |
| --- | --- |
| Before HEAD | `2c8bd3aa51c2046b984ac5dbeaa44ccb14301b12` |
| After HEAD | resolve with `git rev-parse shared-backend-rc3-local-freeze^{}` |
| Tag | `shared-backend-rc3-local-freeze` (local annotated) |
| Push | **not pushed** |

## B. Contract

| Item | Value |
| --- | --- |
| Version | `vdb-backend-contract@0.2.0-rc.3` |
| schemaVersion | `2026.07.25.messaging-support-appointments-rc3` |
| Bundle SHA256 | `62bb1c31240f5eb7e16968a6a03d425e52f2c2ef8b09c38c6cbd549ed331973f` |
| Migration manifest SHA256 | `a82762cbaf851b51c8ee4192b316a821392943b983f8f057a26c7f3ff41ce216` |

## C. Migrations

| Item | Value |
| --- | --- |
| Count (clean reset) | **46** |
| Tip | `20260725120300` |
| Clean `supabase db reset` | **PASS** (exit 0) |
| Staging path | Additive 4 files after RC2 tip `20260724190000` — **no destructive reset** |

## D. Tests (local)

| Command | Exit | Result |
| --- | --- | --- |
| `npm ci` | 0 | PASS |
| `npm run lint` | 0 | **0 errors, 0 warnings** |
| `npm run typecheck` | 0 | PASS |
| messaging unit + invoice/security units | 0 | 26/26 |
| `db:verify-messaging-support-appointments` | 0 | PASS |
| `test:messaging-support-appointments-rls` | 0 | **32/32** |
| `db:verify-partner-backend` | 0 | PASS (flag toggle for fixtures) |
| `db:verify-customer-portal` | logic PASS | process UV crash caveat `-1073740791` after RESULT PASS |
| `db:verify-invoices-financial` | 0 | PASS |
| `db:verify-quotes-acceptance` | 0 | PASS |
| `db:verify-documents-storage` | 0 | PASS |
| `db:verify-catalog-admin` | logic PASS | same UV caveat after PASS |
| `checkout:release-gate` | **2** | Expected fail-closed (`CHECKOUT_ENABLED` remains OFF; gate never enables checkout) |

## E. Lint fix

**Cause:** dirty primary had 16 errors under `docs/artifacts/live-readiness/**/_*.js` (`no-require-imports`) — generated live-readiness operator scratch/evidence, not app source.

**Solution:** targeted `globalIgnores(["docs/artifacts/live-readiness/**"])` in `eslint.config.mjs` + unused-var cleanup in two RC2 helper scripts so freeze lint is **0 warnings**.

**Not done:** broad `docs/` ignore; source/app ignore; severity downgrade; `|| true`.

## F. Stagingdiff

See `docs/artifacts/rc3-staging-diff.md` and `docs/artifacts/rc3-apply-manifest.md`.

## G. Handoff

See `docs/artifacts/rc3-client-handoff.md`.

## H. Remote status

- staging not applied
- production not applied
- Git not pushed
- Mobile not modified
- Partner not modified
- no APK/build

## I. Status

```text
OWNER CONTRACT RC3 LOCAL FREEZE PASS — STAGING APPLY NOT AUTHORIZED
```
