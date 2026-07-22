# VDB Digital Software — Forensic End-to-End Project Audit

**Date:** 2026-07-21 / 2026-07-22 (CEST)  
**Mode:** AUDIT-ONLY — no fixes, no commit, no push, no deploy, no production mutations  
**Repository:** `C:\Users\XXX\vdbdigital2.0`  
**Canonical origin:** `https://vdbdigital.nl`  
**Supabase project:** vdb nieuw / `nhsrdnjfsxfikfbdmdfj` / eu-west-1  

---

## 1. Executive verdict

```text
VDB DIGITAL FORENSIC AUDIT FAIL
PRODUCTION GO/NO-GO: NO-GO
PRODUCTION DATABASE APPLY: NOT AUTHORIZED
```

**Why FAIL:** Four **P1** authorization/payment-hardening findings (staff scope IDOR, invoice DEFINER grants, Mollie webhook fail-open). Full vitest not green (1 timeout). Documentation contradicts freeze HEAD/hash. Live deployment not proven equal to freeze commit.

**What is strong:** Local migration set exact; companion marker no-op; `audit:supabase-full` PASS (0/0); build/typecheck/lint/secret-scan PASS; checkout fail-closed; backup `20260721-222511` checksums OK; remote pre-apply baseline still 5 migration versions + locale companion row.

---

## 2. Audit scope

Full project: public site (NL/EN), auth, portals, catalog, quotes/invoices, payments, Supabase, migrations, Storage, email docs, Vercel/env presence, security, SEO headers, backup, production-apply readiness. Accessibility/performance/mobile deep runs marked UNPROVEN where not executed.

## 3. Safety boundaries (observed)

No `migration repair --linked`, no `db push --linked`, no remote SQL/Storage/Auth mutations, no live email/payment/form POST, no checkout/P05 enablement, no deploy, no commit/push/tag, no `npm audit fix`. Remote HTTP = GET/HEAD only. Local `db reset` only against `supabase_db_vdbdigital2` on `127.0.0.1:54322`.

## 4. Current Git identity

| Field | Value |
|-------|--------|
| Branch | `main` |
| HEAD | `1544d445d1d05c700b59360bdd4015afb0727bb8` |
| Tag (exact) | `production-database-apply-ready` |
| Parent docs commit | `ef2e917` (auth email pack) |
| Pre-freeze / `origin/main` | `b01d518584652205cf384e20dcb80f44f738a1d0` (`auth-no-access-loop-production-pass`) |
| Ahead of origin | **2 commits** (not pushed) |
| Remote | `https://github.com/mvandenboslfgx/vdbdigital2.0.git` |

**Deviation from brief’s “known pre-freeze HEAD”:** expected — freeze completed; current HEAD is freeze commit.

## 5. Worktree status

At snapshot start: clean except accidental `$null` (removed during audit). After audit: **untracked** `docs/audits/*` and gitignored `docs/evidence/forensic-audit-2026-07-21/*`. No staged code changes. **No commit created.**

## 6. Tooling and environment

Node 24.15.0 · npm 11.12.1 · Supabase CLI 2.109.1 · Docker 29.6.1 · Git 2.54.0 · Playwright 1.61.1  

Env presence (values not disclosed): `.env.local` EXISTS; `CHECKOUT_ENABLED` ABSENT (effective false); `P05_MIGRATION_APPLIED` ABSENT; Mollie/Resend/Supabase keys PRESENT locally.

## 7. Reproducible installation

`npm ci` → **PASS** exit 0. Lockfile unchanged. Two moderate transitive advisories reported (see §13).

## 8. Build status

`npm run build` with checkout off → **PASS** exit 0. Warning: middleware→proxy deprecation. Routes compile (123 pages class inventory). `/robots.txt` and `/sitemap.xml` static.

## 9. Lint / typecheck

`tsc --noEmit` **PASS**. `eslint .` **PASS**. Static counts (src/scripts/tests/migrations): `@ts-ignore` 0, `@ts-expect-error` 0, `eslint-disable` 1, `TODO/FIXME/HACK` 2, `dangerouslySetInnerHTML` 2.

## 10. Test matrix

See `VDB_DIGITAL_TEST_AND_EVIDENCE_MATRIX-2026-07-21.md`.

- Vitest: **433 pass / 1 fail** (timeout `commercial-price.test.ts`) → suite **FAIL**
- `test:access-control` 66/66 PASS · `test:security` 75/75 PASS
- E2E: **FAIL** — `localhost:3000` already used
- Checkout release gate: **NOT READY** (expected; never enables checkout)

## 11. Architecture

- Next.js 16 App Router; locale via middleware rewrite (`en` default, `/nl` prefix); admin English-only.
- **123** `page.tsx`, **73** server actions, **49** `"use client"`, **3** route handlers.
- Auth **not** in middleware — enforced in admin/portal layouts + MFA.
- Only marketing has `error.tsx` / `loading.tsx` (gap P2-009).
- No web manifest (P3-001).

## 12. Security

Threat model covered anonymous / customer / staff / admin / attacker. Strongest issues are **P1-001..004** (findings register). Positives: checkout fail-closed; safe redirect allowlist; magic link does not create users; payment amount re-fetch from Mollie; portal org scoping in customer actions; secret-scan clean; CSP+HSTS+XFO on live.

## 13. Secret and supply chain

- `npm run env:scan-secrets` **PASS**
- `npm audit`: 2× moderate `postcss` via `next` — theoretical; **do not** `npm audit fix --force` (would break Next)
- No hardcoded production secrets found in tracked tree

## 14–17. Auth, RLS, database, migrations

- Auth design: callback + `resolvePostLoginPath` + `/geen-toegang` terminal for **authenticated** no-access; anonymous `/geen-toegang` redirects to login (by design).
- Local `db reset`: **27** migrations applied in order; companion marker applied as no-op SELECT.
- Exact **5** repairs + **17** features + **5** markers; no duplicate versions.
- Mapping remote functional IDs documented; remote **must not** revert `20260720132521` — still present remotely.
- RLS: public catalog categories `USING (true)` intentional; portal tables RLS on; invoice DEFINER grants are P1-003.
- Storage local: six buckets, all `public=false`.

## 18. Storage (remote baseline)

Backup inventory + remote migration list: **storage_buckets=0** pre-apply — matches known baseline. Any remote bucket count ≠0 before apply would be blocker; not observed in backup evidence.

## 19. Catalog / admin

Local catalog migrations apply clean. `catalog:verify-no-tawk` **PASS**. Remote baseline products=15 / categories=10 / tawk=0 (backup inventory). Live homepage: no Tawk script.

## 20. Payments

`CHECKOUT_ENABLED` fail-closed **PROVEN**. `P05_MIGRATION_APPLIED` unset. Mollie test key presence only. Webhook idempotency + amount checks present; token optional = **P1-004**. Local payment verify RPCs exist in Docker after reset; scripts using `.env` hit remote and report RPC missing (expected pre-apply + P2-006).

## 21. Quotes / invoices / documents

Contract verifiers (docker): quotes, invoices, documents **PASS**. App-layer staff listing filters: **FAIL** P1-001/002. Financial immutability triggers present locally.

## 22. Portal / projects / support

Auth portal + project management + documents contracts **PASS**. Customer actions org-scoped (SUPPORTED). Staff IDOR is separate P1.

## 23. Environment / deployment

Checkout false / P05 unset **PROVEN**. Vercel production env values not dumped (read-only presence not fully inventoried via Vercel API this run → partial UNPROVEN). Git: freeze not on `origin/main` → deployment ≠ freeze HEAD **UNPROVEN/FAIL match**.

## 24. Email / Resend

`docs/PRODUCTION_AUTH_EMAIL_TEMPLATE_PACK.md` committed separately. Live Dashboard template installation **UNPROVEN** this audit (no Dashboard read). No email sent.

## 25. Live site read-only

Apex 200; www→apex 308; security headers present (HSTS, CSP, nosniff, DENY, Referrer-Policy, Permissions-Policy). Admin/portal redirect to login when anonymous. 404 works. Deployment SHA not verified against Vercel.

## 26. SEO / i18n

robots + sitemap live. Sitemap incomplete vs solutions set (P2-008). Duplicate solution path variants (P3-003). No claim that unpaid features are live beyond marketing copy review depth (spot only).

## 27–29. Accessibility / performance / mobile

**UNPROVEN** systematically this audit (P2-012). Not scored as PASS.

## 30. Privacy

Legal routes present; technical consistency spot-checked. Legal adequacy **not** certified. Tokens not observed in homepage HTML. Logs not exhaustively mined.

## 31. Backup / DR

`backups/production-apply/20260721-222511/`: 13 files; checksums **11/11 OK**; gitignored; INVENTORY shows restore_verified=true. **Migration repair ≠ schema rollback** still true. RPO/RTO: apply-day backup age ~hours at freeze; new backup required before any future apply if remote mutates.

## 32. Documentation audit

| Doc | Issue |
|-----|-------|
| Manifest | Status claims freeze/audit PASS but §5 still “NOT EXECUTED”; HEAD still “pre-freeze” `b01d518` |
| Readiness | Mixed “not yet” vs PASS language |
| FINAL plan | Old backup `210514`; rotation BLOCKED language stale vs later VERIFIED |
| Hash | Operators must use **`948073dd…`**, not `c4cc9d…` |
| Marker hash | Unchanged `9e56d53c…` — consistent |

## 33. Prior PASS claims vs re-proof

| Claim | Re-proof this audit |
|-------|---------------------|
| Local start / db reset | PROVEN PASS |
| Supabase isolation full | PROVEN PASS |
| Backup + checksums | PROVEN PASS |
| Restore | SUPPORTED (prior flag; not re-run) |
| History repair + 17 rehearsal | SUPPORTED (docs + local reset path); remote apply still NOT EXECUTED |
| Contract RPC TOTAL_FAILS=0 (rehearsal) | SUPPORTED historical; local docker contracts mostly PASS now |
| Remote unchanged pre-apply | PROVEN via `migration list --linked` (5 remote only) |
| Companion marker | PROVEN PASS |
| Manifest ready / freeze | Freeze commit+tag PROVEN; docs partially CONTRADICTED |
| Tawk zero | PROVEN PASS |
| Auth no-access loop | SUPPORTED (code + unit tests); live e2e UNPROVEN |
| Checkout fail-closed | PROVEN |

## 34–36. Findings by severity

See `VDB_DIGITAL_FINDINGS_REGISTER-2026-07-21.md` / `.json`.  
**P0:** 0 · **P1:** 4 · **P2:** 12 · **P3:** 7

## 37. Blockers (enablement / trust)

1. P1-001, P1-002, P1-003 (authorization)
2. P1-004 before any checkout/webhook reliance
3. Documentation HEAD/hash consistency before apply authorization messages
4. Deployment provenance vs intended Git SHA
5. Explicit production apply authorization still absent (process)

## 38. Recommended fix order

1. Staff assignment/org filters (quotes/invoices/documents)  
2. Invoice RPC execute grants + permission alignment  
3. Mollie webhook token fail-closed  
4. Prove/align production deployment SHA  
5. Refresh apply docs (HEAD, hash `948073dd…`, backup `222511`)  
6. Stabilize vitest timeout + free port for e2e  
7. Verifier scripts force local Docker target  
8. SEO/error-boundary/a11y/perf backlog  

## 39. Production GO/NO-GO

**NO-GO.** Audit FAIL due to P1s and incomplete required test green.  
An audit GO would still **not** be production DB apply authorization.

## 40. Proof of no remote mutations

- Remote `migration list` shows same five baseline versions + `20260720132521` only  
- No repair/push commands executed  
- HTTP production: GET/HEAD only  
- Local reset only on `supabase_db_vdbdigital2`  

### Mandatory confirmations

Geen remote migration repair uitgevoerd.  
Geen remote db push uitgevoerd.  
Geen remote migraties toegepast.  
Geen remote databasewijzigingen uitgevoerd.  
Geen remote Storage-mutaties uitgevoerd.  
Geen remote Auth-mutaties uitgevoerd.  
Geen productieformulieren verstuurd.  
Geen echte e-mails verstuurd.  
Geen OWNER-reset uitgevoerd.  
Geen MFA-wijzigingen uitgevoerd.  
Geen checkoutactivatie uitgevoerd.  
P05_MIGRATION_APPLIED niet ingesteld.  
Geen Mollie-livepayment uitgevoerd.  
Geen deployment uitgevoerd.  
Geen Git commit, push of tag uitgevoerd.  
Productieapply is nog niet geautoriseerd.

---

## Artefacts

| File |
|------|
| `docs/audits/VDB_DIGITAL_FORENSIC_END_TO_END_AUDIT-2026-07-21.md` |
| `docs/audits/VDB_DIGITAL_FINDINGS_REGISTER-2026-07-21.md` |
| `docs/audits/VDB_DIGITAL_FINDINGS_REGISTER-2026-07-21.json` |
| `docs/audits/VDB_DIGITAL_TEST_AND_EVIDENCE_MATRIX-2026-07-21.md` |
| `docs/audits/VDB_DIGITAL_PRODUCTION_READINESS_SCORECARD-2026-07-21.md` |
| `docs/evidence/forensic-audit-2026-07-21/` (logs; gitignored) |
