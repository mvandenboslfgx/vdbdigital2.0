# Fase 2 precheck — B1 identity-gate attestation

**Date:** 2026-08-01  
**Decision:** B1 — handmatige administratieve partnercontrole (geen externe IDV)

## Lineage (PASS)

| Repo | Branch | HEAD (= parent tip) | Dirty = Fase 1 only |
|------|--------|---------------------|---------------------|
| Owner | `fix/rc6-partners-idv-desccope-f1` | `0c789755…` | docs artifacts only |
| Partners | `fix/rc6-partners-idv-desccope-f1` | `d8cef733…` | F1 copy/docs/quarantine/tests |
| Mobile | `fix/rc6-mobile-idv-desccope-f1` | `7cb924cf…` | F1 i18n/docs/tests |

Dirty trees `vdb-partners-rc6-staging-recovery` / `vdb-app` not touched.  
Secrets in F1 diffs: false positives (provider names in “geen Veriff…” copy; empty `IDENTITY_PROVIDER_API_KEY=`).

## Pre-existing contract checksum drift (NOT caused by F1)

Proven: `git diff 0c789755 -- contracts supabase/migrations` = **0 lines**.  
Drift reproduces with F1 docs stashed.

### rc.6 (`vdb-backend-contract-0.2.0-rc.6`) — recorded ≠ actual file hash

| File | Recorded (checksums.json) | Actual (sha256 of file) |
|------|---------------------------|-------------------------|
| `error-codes.json` | `43aa97f8…873fd0` | `18229be9…9e10df` |
| `manifest.json` | `c00f1b7c…1f4c2` | `129e0d9f…ed5337f` |
| `migration-manifest.json` | `b5d1441e…95b8e5` | `5be07295…5ece0c4` |
| `rpcs.json` | `02c3786c…a22cf6` | `0663983f…699655d` |

Test impact: `partner-approval-aal2-rc6-contract.test.ts` checksum case FAIL.

### rc.5 (`vdb-backend-contract-0.2.0-rc.5`)

- Widespread checksum drift (almost all bundle files).
- Test also expects `highestVersion == 20260729140300` but manifest has `20260729140400` (test stale vs tip).

## Isolation strategy for Fase 2 (no silent repair of rc.5/rc.6)

1. **Leave** `contracts/releases/vdb-backend-contract-0.2.0-rc.5` and `…-rc.6` **byte-identical** (do not regenerate their checksums).
2. **Add** new release folder `vdb-backend-contract-0.2.0-rc.7` with:
   - additive RPC + notes for administrative partner review;
   - freshly computed `checksums.json` / `BUNDLE_SHA256.txt` for **rc.7 only**;
   - schemaVersion `2026.08.01.partner-admin-review-rc7`.
3. **Add** successor migration(s) after `20260729145145_…` — never rewrite historical migrations.
4. New unit tests pin **rc.7**; existing rc.5/rc.6 checksum failures remain labeled **pre-existing** and are not “fixed” by F2.
5. Consumer pins (Partners/Mobile) move to rc.7 only for F2 surfaces; document compatibility with rc.6 AAL2 approval.

If F2 later regenerates rc.6 checksums, that would silently absorb pre-existing drift — **forbidden**.
