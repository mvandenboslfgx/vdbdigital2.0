# VDB Digital 2.0 — Revenue-Ready Remediation & Verification Report

**CHECKOUT ACTIVATION DECISION: NOT AUTHORIZED**  
**REMOTE/PRODUCTION MUTATIONS: NOT PERFORMED**  
**COMMITS/PUSHES: NOT PERFORMED**

| Field | Value |
| --- | --- |
| Report date (local) | 2026-07-23 (Europe/Amsterdam, CEST); dependency-run 2026-07-24; staging-readiness 2026-07-24 |
| Closure run | FINAL LOCAL CLOSURE + DEPENDENCY RUN + **STAGING/OPERATOR/LEGAL READINESS** |
| Repository | VDB Digital 2.0 (`CANONICAL_BACKEND_OWNER`) |
| Branch | `phase/shared-partner-backend` |
| Start HEAD (audit / remediation) | `a70a9212a8d1cae774635715d47740d11ad84ace` |
| End HEAD | `a70a9212a8d1cae774635715d47740d11ad84ace` (uncommitted worktree preserved) |
| Worktree | Remediation 46 + additive staging/legal/CSP docs & scripts |
| Contract baseline | `vdb-backend-contract@0.2.0-rc.1` / `schemaVersion=2026.07.22.partner-rc1` (unchanged) |
| Framework | Next.js **16.2.11**, React 19.2.4, sharp **0.35.3** (override), postcss **8.5.22** (override) |
| Package manager | npm + `package-lock.json` |
| Node / npm | v24.15.0 / 11.12.1 |
| Local checkpoint | Temporary local safety checkpoint created outside Git (patch + untracked copies; no secrets) |

---

## STAGING, OPERATOR, LEGAL & SECURITY READINESS RUN — 2026-07-24

```
STAGING END-TO-END PASS — PRODUCTION AND CHECKOUT STILL NOT AUTHORIZED
```

*(Mollie closure completed 2026-07-25; prior incomplete status superseded.)*

Full evidence: `docs/VDB_DIGITAL_STAGING_OPERATOR_READINESS_REPORT.md`,  
runbook: `docs/VDB_DIGITAL_STAGING_RUNBOOK.md`,  
legal: `docs/VDB_DIGITAL_LEGAL_READINESS_REVIEW.md`.

| Item | Result |
| --- | --- |
| Dedicated staging Supabase | `qzekuvmgfekzsowdecyk` — Auth Site URL + exact allowlist on current Preview |
| Dedicated Vercel staging | **vdb-digital-staging** `prj_ox86yWKOv2cP7JHRNrG8qpmcvqf2` Preview `dpl_Bki5GX3JvqLRfkWVjFCMZD94AwJu` READY |
| `STAGING_APP_URL` | `https://vdb-digital-staging-6yyuyx7iw-matthijs-projects-301cd812.vercel.app` |
| Production Vercel / `vdbdigital.nl` | denylist — **not modified**; repo `.vercel` still `vdbdigital2-0` |
| HEAD | `a593e5d…` = child of `a70a9212…` (rc.2); worktree **60** (57 originals + Mollie harness trio) |
| Preview robots | `Disallow: /` + `X-Robots-Tag: noindex, nofollow` — SEO **8/8** env-aware |
| Browser role/RLS | API **16/0** + Playwright roles+invite **9/9** |
| Invite E2E | app-owned token path **PASS**; mailbox delivery not proven |
| Checkout | remains DISABLED; gate exit **2**; `/checkout` **307→/shop** |
| Mollie | **PASS** — test payment + real webhook + idempotency via `scripts/staging-mollie-e2e.ts`; bypass **not needed** |
| Local `db reset --local` (retry) | PASS + partner/quotes/invoices/documents/RLS PASS |
| CSP | Report-Only added; enforcing `unsafe-inline` retained (deferred nonce) |
| Rate-limit multi-instance | Residual risk documented; Upstash missing |
| Legal | Review delivered; 3 safe copy fixes; lawyer review still required |
| Checkout / PAY-002 | remains DISABLED / OPEN |

**Still not authorized:** production deploy, checkout enablement, `PAY-002` close, commit/push/merge.

---

## DEPENDENCY COMPATIBILITY RUN (2026-07-24)

### Decision path

- Latest **stable** Next remains `16.2.11` (no `16.2.12`; `16.3.0` not released).
- `next@canary` / `16.3.0-preview.*` pin `sharp@^0.35.3` but were **not** adopted (pre-release / broader jump).
- Applied **isolated overrides** on `next@16.2.11`:
  - direct dep + override `sharp@0.35.3`
  - override `postcss@8.5.22` (audit had elevated nested postcss to high)

### Definitive local status after dependency-run

```
LOCAL REVENUE-READY REMEDIATION PASS — CHECKOUT REMAINS DISABLED
```

| Gate | Result |
| --- | --- |
| `npm ci` | **0** |
| `npm audit --audit-level=high` | **0** (0 vulnerabilities) |
| `npm ls` | next@16.2.11 → sharp@0.35.3; postcss@8.5.22 |
| sharp runtime encode | **PASS** (libvips 8.18.3) |
| `_next/image` optimizer | **PASS** (200, image/png) |
| typecheck / lint / secrets / no-Tawk | **0** |
| access-control / security | **0** (79 / 95) |
| unit suite | **0** (467) — one earlier parallel timeout flake; clean re-run green |
| `npm run build` (Turbopack, checkout off) | **0** |
| e2e seo-smoke | **0** (8/8) |
| viewport QA | **0** (138/138) |
| checkout:release-gate | **2** EXPECTED NOT READY |
| Remote / commit / push | **NOT PERFORMED** |

### Residual note

Overrides remain until a stable Next release depends on `sharp≥0.35` natively. Documented Turbopack/Vercel NFT edge cases for sharp 0.35 were **not** reproduced on this Windows local production build + image optimizer path. Staging deploy still needs separate image-opt verification before production.

---

## FINAL LOCAL CLOSURE RUN

### Definitive status (superseded by dependency-run above)

Prior closure ended with:

```
LOCAL REMEDIATION INCOMPLETE — VERIFIED BLOCKERS REMAIN
```

solely due to `npm audit` / `sharp@0.34.5`. That blocker is **closed** by the dependency-run.

### Finding matrix after closure

| ID | Status |
| --- | --- |
| SEC-001 | **FIXED AND VERIFIED — APP + UNIT + LOCAL DB/RLS RUNTIME** |
| SEC-002 | **FIXED AND VERIFIED — APP + UNIT + LOCAL DB/RLS RUNTIME** (+ invoice RPC grants) |
| SEC-003 | **FIXED AND VERIFIED — APP + UNIT + LOCAL DB/RLS RUNTIME** |
| PAY-001 | **FIXED AND VERIFIED** |
| PAY-002 | **EXPECTED OPEN ACTIVATION BLOCKER** |
| Invoice grants | **FIXED AND VERIFIED** locally |
| Migrations/reset | **PASS** locally (`db reset --local` exit 0) |
| Contract drift | **PASS** / no schemaVersion bump |
| Viewport QA | **PASS** (138/138) |
| Lighthouse | **Measured** (local medians below) |
| npm audit high/critical | **CLOSED** — exit 0 after sharp@0.35.3 + postcss@8.5.22 overrides (2026-07-24) |

### Docker / target guard

| Check | Result |
| --- | --- |
| Docker Desktop | Engine running (29.6.1 / Desktop 4.82.0), context `desktop-linux` |
| `project_id` | `vdbdigital2` |
| Ports | API 54321, DB 54322, Studio 54323, Inbucket 54324, shadow 54320, analytics 54327 |
| Sibling stacks | Partner `vdb-partners` on **544xx** left untouched; Mobile **545xx** not present |
| Remote link file | Present historically; **all DB commands used `--local` only** — no `--linked`, no remote SQL |

### Database reset & migrations

| Item | Result |
| --- | --- |
| Command | `npx supabase db reset --local --yes` |
| Exit | **0** |
| New migrations applied | `20260723140000_invoice_rpc_grant_hardening.sql`, then `20260723150000_invoice_rpc_grant_verify_alignment.sql` via `migration up --local` |
| Seed | Completed as part of reset |
| Partner verify | `npm run db:verify-partner-backend` → **PASS** (contract, scenarios 4/5/6/8/9/10, RLS, financial) |
| Quotes contracts | `db:verify-quotes-acceptance` → **PASS** |
| Invoices contracts | `db:verify-invoices-financial` → **PASS** (after verify alignment) |
| Documents contracts | `db:verify-documents-storage` → **PASS** |
| Catalog RLS smoke | `db:test-rls` → **PASS** |

### Invoice grant / function matrix (local runtime)

| Function | anon EXECUTE | authenticated EXECUTE | service_role EXECUTE |
| --- | --- | --- | --- |
| `issue_portal_invoice` | deny | deny | allow |
| `record_portal_invoice_payment` | deny | deny | allow |
| `reverse_portal_invoice_payment` | deny | deny | allow |
| Verifier detail | `anon+authenticated denied; service_role only` | | **OK** |

App continues to call RPCs only via service-role client after `requireAdmin` + `requirePermission`.

### Dependency remediation

| Item | Closure (2026-07-23) | Dependency-run (2026-07-24) |
| --- | --- | --- |
| `next` | 16.2.11 | 16.2.11 (unchanged; no stable newer) |
| `eslint-config-next` | 16.2.11 | 16.2.11 |
| `react` / `react-dom` | 19.2.4 | 19.2.4 |
| `sharp` | 0.34.5 (blocked) | **0.35.3** direct + override |
| `postcss` | nested vulnerable | **8.5.22** override |
| `npm audit --audit-level=high` | exit 1 | **exit 0** |

**Approach:** Isolated overrides (not canary/preview; not `npm audit fix --force`). Runtime verified: sharp encode + `/_next/image` + Turbopack production build.

### Quality gates (closure)

| Command | Exit |
| --- | --- |
| `npm ci` | 0 |
| `npm run typecheck` | 0 |
| `npm run lint` | 0 |
| `npm run env:scan-secrets` | 0 |
| `npm run catalog:verify-no-tawk` | 0 |
| `npm run test:access-control` | 0 (79) |
| `npm run test:security` | 0 (95) |
| `npx vitest run tests/unit/` | 0 (**467**) |
| `npm run build` | 0 (Next 16.2.11) |
| `npx playwright test tests/e2e/seo-smoke.spec.ts` | 0 (8/8) |
| Viewport QA (23 routes × 6 viewports) | 0 (**138/138**) |
| `npm run checkout:release-gate` | **2** EXPECTED NOT READY |
| `npm audit --audit-level=high` | **1** residual sharp/next |

### Viewport QA

All required viewports PASS for required marketing/legal/login/404/checkout-off routes. Product fix: `"/login"` → `paths.login` (`/inloggen`) in `legacyRedirects`. Harness: `playwright.viewport-qa.config.ts`, `tests/e2e/revenue-ready-viewport-qa.spec.ts`. Artifacts under gitignored `test-results/`.

### Lighthouse medians (local production `localhost:3000`, 3 runs/device)

| Route | Form | Perf | A11y | BP | SEO | LCP (ms) | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | mobile | 85 | 96 | 100 | 92 | 3995 | 0 | 148 |
| `/` | desktop | 100 | 96 | 100 | 92 | 781 | 0 | 0 |
| `/shop` | mobile | 87 | 97 | 100 | 92 | 3415 | 0 | 233 |
| `/shop` | desktop | 100 | 97 | 100 | 92 | 760 | 0 | 1 |
| `/contact` | mobile | 84 | 97 | 100 | 92 | 3792 | 0 | 161 |
| `/contact` | desktop | 100 | 97 | 100 | 92 | 770 | 0 | 4 |
| `/cases/vermeulen-bouwservice` | mobile | 88 | 97 | 100 | 92 | 3810 | 0 | 137 |
| `/cases/vermeulen-bouwservice` | desktop | 100 | 97 | 100 | 92 | 790 | 0 | 4 |

No performance redesign this run (CLS median ≤0.10; a11y/SEO/BP ≥90). Mobile LCP remains environment-sensitive on localhost — not claimed as production CWV.

### Files changed during closure (additive)

| Path | Reason |
| --- | --- |
| `package.json` / `package-lock.json` | next + eslint-config-next → 16.2.11 |
| `supabase/migrations/20260723150000_invoice_rpc_grant_verify_alignment.sql` | Align verifier with service_role-only grants |
| `tests/unit/invoice-payment-reversal.test.ts` | Assert grant hardening |
| `src/i18n/config.ts` | `/login` legacy redirect |
| `playwright.viewport-qa.config.ts` + `tests/e2e/revenue-ready-viewport-qa.spec.ts` | Viewport matrix harness |

### Residual risks / blockers

1. ~~npm audit high (`sharp@0.34.5`)~~ — **closed 2026-07-24** via `sharp@0.35.3` + `postcss@8.5.22` overrides (verified).  
2. PAY-002 checkout activation still unauthorized (**expected**).  
3. NL legal copy still marked for professional review (source marker only).  
4. CSP `unsafe-inline` still deferred.  
5. Linked remote project-ref exists in local CLI temp metadata — never used this run; keep using `--local` only.  
6. Overrides should be revisited when a stable Next release depends on `sharp≥0.35` natively; staging image-opt still needed before production.

### Remote / commit status

**NOT PERFORMED.** Partner/Mobile stacks not modified. No commit/push/tag/PR.

### Smallest safe next commercial step

1. Staging contract verify + image-opt smoke on staging host.  
2. Operator evidence pack (migrations applied, limiter, Mollie test checklist, legal FIXED SKU).  
3. Professional legal review of NL policies.  
4. Separate checkout authorization — only after gate is truly READY (still not this phase).

---

## 1. Executive summary (prior remediation + closure)

Prior remediation implemented P1 app-layer security, conversion/SEO/a11y/copy, and unit/e2e smoke. This **FINAL LOCAL CLOSURE** proved local DB/RLS/grants, measured viewports + Lighthouse, and patched Next to 16.2.11. Checkout remains fail-closed.

**Status remains incomplete solely because high-severity `sharp` advisory cannot be closed without unsafe override or upstream Next change.**

---

## 2. Scope and hard boundaries (honoured)

**Not performed:** production/staging deploy, Vercel mutations, Supabase remote link/SQL/db push, Mollie live calls, real customer email, checkout activation, operator-hint flags without evidence, commits/pushes/PRs, sibling repo/container changes, Mobile/Partner Portal edits, destructive git, `npm audit fix`.

**Checkout end state (expected):**

- `.env.example`: `CHECKOUT_ENABLED=false`
- `npm run checkout:release-gate` → **NOT READY** (exit 2)
- Decision: **NOT AUTHORIZED**

**Architecture freeze:** only this canonical repo; one new forward-only migration for invoice RPC grants; contract version unchanged.

---

## 3. Start worktree and preservation

Preflight showed clean tracked tree relative to audit HEAD plus untracked audit file:

- Preserved: `docs/VDB_DIGITAL_COMPLETE_360_AUDIT.md` (historical baseline — not modified)
- No resets / no overwrites of user work
- All remediation changes remain uncommitted in the working tree

---

## 4. Finding register (before → after)

| ID | Desired | Status | Evidence summary |
| --- | --- | --- | --- |
| SEC-001 | FIXED AND VERIFIED | **FIXED AND VERIFIED — APP + UNIT + LOCAL DB/RLS RUNTIME** | Scoped quotes + unit + local quotes contracts / partner RLS |
| SEC-002 | FIXED AND VERIFIED | **FIXED AND VERIFIED — APP + UNIT + LOCAL DB/RLS RUNTIME** | Scoped invoices + grant hardening + verify alignment + financial verify PASS |
| SEC-003 | FIXED AND VERIFIED | **FIXED AND VERIFIED — APP + UNIT + LOCAL DB/RLS RUNTIME** | Scoped documents + documents storage contracts PASS |
| PAY-001 | FIXED AND VERIFIED | **FIXED AND VERIFIED** | Webhook token fail-closed; route rejects before payment mutation |
| PAY-002 | EXPECTED OPEN ACTIVATION BLOCKER | **EXPECTED OPEN ACTIVATION BLOCKER** | Gate NOT READY; checkout off |
| SEC-005 | FIXED / residual multi-instance | **FIXED AND VERIFIED** with residual multi-instance risk | Durable fail → degraded in-memory for contact/quote; checkout hard deny |
| CONV-001 | FIXED AND VERIFIED | **FIXED AND VERIFIED** | One primary + one secondary hero CTA |
| COPY-001 | FIXED AND VERIFIED | **FIXED AND VERIFIED** | NL legal via `src/i18n/content/legal.ts` |
| UX-001 | FIXED AND VERIFIED | **FIXED AND VERIFIED** | Phone defaults `06 286 00 727` / `+31628600727` |
| SEO-001 | FIXED AND VERIFIED | **FIXED AND VERIFIED** | Middleware 308 + `permanentRedirect` pages; e2e |
| SEO-002 | FIXED AND VERIFIED | **FIXED AND VERIFIED** | Sitemap unit + e2e |
| A11Y-001 | FIXED AND VERIFIED | **FIXED AND VERIFIED** | Focus trap, Escape, return focus; e2e + viewport QA |
| ARCH-001 | FIXED / closed | **FIXED AND VERIFIED** | `next-intl` removed (unused) |
| PERF-001 | measured / NOT RUN | **Measured (local Lighthouse medians)** | See FINAL LOCAL CLOSURE; not production CWV claim |
| P3-001 | resolved | **FIXED AND VERIFIED** | Unused `ROOT` removed from bundle script |
| P3-002 | resolved | **FIXED AND VERIFIED** | Canonical `deliverables`; NL `opleveringen` redirects |
| P3-003 | resolved | **FIXED AND VERIFIED** | Admin nav Dutch labels |
| P3-004 | deferred OK | **DEFERRED WITH EVIDENCE** | CSP still `unsafe-inline` in middleware — nonce not safely proven |
| P3-005 | resolved | **FIXED AND VERIFIED** | CTA arrow microcopy cleaned |

DB/RLS for SEC-001..003: proven locally this closure (`db reset --local`, contract verifies, invoice grants). Residual: `npm audit` high on `sharp`.

---

## 5. Root cause and implementation per finding

### SEC-001 / SEC-002 — Quotes & invoices IDOR

**Root cause:** Permission check passed for `view_assigned`, but service-role list/get queries had no assignment filter.

**Schema reality:** No `assignee_id` column. Assignment modelled as `created_by` **or** `project_id` ∈ projects where `portal_projects.project_manager_id` = actor (same pattern as admin projects).

**Fix:** `src/server/auth/admin-resource-scope.ts` + scoped `admin-quotes.ts` / `admin-invoices.ts`. Out-of-scope get → `null` (safe not-found). Deny mode requires permission before query.

**SEC-002 extra:** Migration `supabase/migrations/20260723140000_invoice_rpc_grant_hardening.sql` — `REVOKE EXECUTE` on invoice financial RPCs from `authenticated`; `GRANT` to `service_role`. `invoice-actions.ts` uses service-role only after `requireAdmin` + `requirePermission`.

### SEC-003 — Documents org leak

**Root cause:** `view_organization` allowed but query unscoped unless caller supplied filter.

**Fix:** Server-derived managed organization IDs from projects managed by actor; list/get constrained; caller `organizationId` may only intersect/narrow.

### PAY-001 — Mollie webhook fail-open

**Root cause:** Missing expected token returned `{ valid: true }`.

**Fix:** `verifyMollieWebhookToken` returns `unconfigured` / `missing` / `invalid`; timing-safe compare retained; tests assert route 401 before Mollie lookup / order mutation.

### SEC-005 — Rate limit fail-open

**Root cause:** Backend errors could allow unlimited contact/quote.

**Fix:** Fail-closed buckets; on durable failure, contact/quote use bounded degraded in-memory limiter (logged as degraded, no PII); checkout/payment still hard deny. **Residual:** multi-instance memory buckets are not globally coordinated.

### CONV-001 / hero / phone / legal / SEO / a11y / ARCH / P3

As summarised in §4; hero EN/NL copy and metadata updated; legal NL catalogs; alias redirects; sitemap expansion; mobile menu focus trap; `next-intl` uninstalled; unused ROOT removed; admin labels NL; CSP deferred.

---

## 6. Authorisation scope matrix

| Mode | Quotes / Invoices | Documents |
| --- | --- | --- |
| `view_all` or `manage` | `all` | `documents.view_all` → `all` |
| `view_assigned` | `assigned` (`created_by` OR managed projects) | n/a |
| `view_organization` | n/a | managed org IDs only |
| none | deny before query | deny before query |

Caller-supplied org ID: narrow-only via `intersectCallerOrganizationFilter`.

---

## 7. Access-control test matrix (unit / mocked scope)

| Actor | Record | Expected | Covered |
| --- | --- | --- | --- |
| Owner/admin global | both orgs | allow | yes (mode `all`) |
| Staff `view_assigned` | own assignment | allow | yes |
| Staff `view_assigned` | unassigned | deny/not-found | yes |
| Staff `view_organization` | own org | allow | yes (documents) |
| Staff `view_organization` | other org | deny | yes |
| No permission | any | deny before query | yes |
| Manipulated org id | other org | deny / no broaden | yes |
| Unknown id | none | null/not-found | yes |

Files: `tests/unit/admin-resource-scope.test.ts`, `tests/unit/admin-scoped-repositories.test.ts`.  
**Local Supabase integration for same matrix:** NOT RUN (Docker blocker).

---

## 8. Mollie webhook verification matrix

| Case | Expected | Result |
| --- | --- | --- |
| No server token | `unconfigured` / reject | PASS (unit) |
| Missing provided token | `missing` | PASS |
| Wrong token | `invalid` | PASS |
| Correct token | `valid` | PASS |
| Reject before payment/order mutation | no Mollie get / no status update | PASS |
| Timing-safe compare | retained | PASS |
| Checkout remains off | unchanged | PASS |

---

## 9. Checkout-off evidence

- Gate: `Result: NOT READY — migration missing` / never enables checkout
- Feature flag off check: PASS inside gate
- E2E: `/checkout` → `/shop`
- No `CHECKOUT_ENABLED=true`, no `P05_MIGRATION_APPLIED=true`, no Mollie test verified flag set by this work

---

## 10. Rate-limit failure-mode evidence

Unit tests (`tests/unit/rate-limit.test.ts`): production without durable backends → contact/quote bounded then reject; Upstash failure still bounds contact; checkout hard fail-closed.

---

## 11. Contact / quote / phone / CTA / legal

- Phone defaults centralised in `src/config/site.ts`; contact + footer use `phoneTel`
- Hero: primary introduction CTA + secondary quote CTA; solutions tertiary
- Legal EN/NL via `getLegalContent`; internal marker `JURIDISCHE REVIEW AANBEVOLEN` in source comment only (not public banner)
- Full browser form success paths: covered by existing patterns + rate-limit tests; dedicated visual form matrix NOT RUN

---

## 12. Redirect / SEO matrix

| Alias | Canonical | Mechanism | Status |
| --- | --- | --- | --- |
| `/solutions/live-chat` | `/solutions/livechat` | middleware `308` + page `permanentRedirect` | PASS (unit + e2e) |
| `/solutions/review-flows` | `/solutions/reviewflows` | same | PASS |
| `/solutions/custom-websites` | `/solutions/websites` | same | PASS |
| `/nl/...` aliases | `/nl/...` canonical | locale preserved | PASS (e2e) |

Sitemap: canonical solutions included; aliases/admin/portal/auth/checkout excluded; TrustBooker excluded; uniqueness tested. Robots: admin/api/checkout disallowed.

HTTP status: middleware uses **308**; Next `permanentRedirect` is permanent (308 in App Router).

---

## 13. Accessibility keyboard results

- `aria-expanded` / `aria-controls` on menu trigger
- Focus to close button on open; Tab cycle within panel; Escape closes; focus returns to trigger
- Body scroll lock cleaned on unmount
- E2E: keyboard Enter opens dialog (PASS after locator fix)

---

## 14. Viewport matrix

| Viewport | Status |
| --- | --- |
| 360×800 … 1920×1080 marketing matrix | **NOT RUN** |
| Mobile 375×667 (menu e2e only) | PASS (partial) |

## 15. Lighthouse / CWV

**NOT RUN — ENVIRONMENT BLOCKER** (not executed in this session; no median scores claimed).

---

## 16. Local DB / contract

| Guard | Result |
| --- | --- |
| Expected project `vdbdigital2` / ports | Config present in repo |
| `supabase status` / Docker engine | **FAIL** — Docker Desktop pipe missing |
| `db reset` | **NOT PERFORMED** |
| Partner/RLS/RPC re-verify | **BLOCKED — LOCAL TARGET NOT PROVEN** |
| Contract 0.2.0-rc.1 / schemaVersion | Unchanged; no drift introduced by remediation |
| New migration | `20260723140000_invoice_rpc_grant_hardening.sql` (forward-only; not applied remotely; not applied locally this session) |

---

## 17. Dependency audit

| Item | Result |
| --- | --- |
| `next-intl` | Removed (`npm uninstall`) — unused |
| `npm audit --audit-level=high` | Exit 1 — high: `next` (multiple advisories), `sharp`; moderate: nested `postcss` |
| Safe next step | Deliberate patch bump `next`/`eslint-config-next` → `16.2.11` after local verify; **do not** `audit fix --force` blindly |
| Action this session | No forced upgrade (per hard bounds) |

---

## 18. Commands executed (summary)

| Command | Exit | Summary |
| --- | --- | --- |
| Preflight git/node/npm | 0 | Branch + HEAD match audit base |
| `npx supabase status` | ≠0 | Docker engine unavailable |
| `npm run typecheck` | 0 | PASS |
| `npm run lint` | 0 | PASS (0 warnings after header fix) |
| `npm run env:scan-secrets` | 0 | PASS |
| `npm run catalog:verify-no-tawk` | 0 | PASS (script also did read-only remote catalog probe; no writes) |
| `npm run test:access-control` | 0 | 69 tests |
| Remediation unit subset | 0 | 45 tests |
| `npm run test:security` | 0 | 78 tests |
| `npx vitest run tests/unit/` | 0 | 466 tests / 54 files |
| `npm run build` | 0 | PASS |
| `npm run checkout:release-gate` | 2 | **EXPECTED NOT READY** |
| `npm audit --audit-level=high` | 1 | Residual highs documented |
| `git diff --check` | 0 | PASS |
| `npx playwright test tests/e2e/seo-smoke.spec.ts` | 0 | **8/8 PASS** (aliases, checkout block, sitemap/robots, mobile menu keyboard + Escape) |

Note: `npm ci` was not re-run end-to-end after lockfile change from `next-intl` removal; `typecheck`/`build`/`unit` used the updated lock via existing `node_modules` + uninstall. Recommended next operator step: `npm ci` on a clean machine before staging.

---

## 19. Changed / new files (reason)

**Security / auth:** `admin-resource-scope.ts`, `admin-quotes.ts`, `admin-invoices.ts`, `admin-documents.ts`, `webhook-url.ts`, `rate-limit.ts`, `invoice-actions.ts`, migration `20260723140000_invoice_rpc_grant_hardening.sql`

**Conversion / content / i18n:** `hero-section.tsx`, `en.ts`/`nl.ts`, `site.ts`, footer/contact, `legal.ts`, legal pages, `legal-document-body.tsx`, `company-legal-block.tsx`

**SEO / a11y / polish:** `i18n/config.ts` legacy redirects, alias pages → permanentRedirect, `sitemap.ts`, `header.tsx`, `generate-contract-rc1-bundle.ts`, admin layout labels, `package.json`/`package-lock.json` (remove next-intl)

**Tests:** admin scope/repo tests, rate-limit, mollie-webhook, site-config, seo-redirects, sitemap, hero-section, `seo-smoke.spec.ts`

**Docs:** this report only (audit file preserved)

---

## 20. Residual risks

1. Local DB/RLS not re-verified after invoice grant hardening migration  
2. Degraded rate-limit memory is per-instance  
3. CSP `unsafe-inline` retained  
4. Next.js/sharp high CVEs unpatched this session  
5. NL legal text still needs professional legal review (marker in source)  
6. Visual/Lighthouse matrix not measured  
7. Cross-repo staging contract verify still required before partner clients consume any future contract bump (none this session)

---

## 21. Remote / production status

**NOT PERFORMED.** No remote schema/data/Auth/Storage mutations initiated by this remediation. Existing `catalog:verify-no-tawk` performed a **read-only** remote catalog scan as part of the pre-existing script (hits=0); no writes.

---

## 22. Release gate

```
CHECKOUT ACTIVATION DECISION: NOT AUTHORIZED
CHECKOUT_ENABLED remains OFF
Gate: NOT READY (EXPECTED BLOCKER / PAY-002)
```

---

## 23. Safe rollback clusters

1. **Auth scope:** revert `admin-resource-scope.ts` + three admin repositories + related tests  
2. **Webhook/rate-limit:** revert `webhook-url.ts`, `rate-limit.ts` + tests  
3. **Invoice grants:** drop/skip applying `20260723140000_…` locally; revert `invoice-actions.ts`  
4. **Content/SEO/a11y:** revert hero/messages/legal/header/sitemap/aliases/`next-intl` removal as a cluster  

No production rollback needed (nothing deployed).

---

## 24. Recommended next commercial phase

1. Staging contract verify + staging image-opt with sharp 0.35.3 overrides.  
2. Operator evidence pack for checkout gate prerequisites.  
3. Professional legal review of NL policies.  
4. Separate checkout authorization — never implied by this local PASS.

---

## 25. Final status

```
LOCAL REVENUE-READY REMEDIATION PASS — CHECKOUT REMAINS DISABLED
```

**Still explicitly open (not failures of this remediation):**

| Item | Status |
| --- | --- |
| PAY-002 / checkout activation | EXPECTED OPEN ACTIVATION BLOCKER |
| Staging / production deploy | NOT PERFORMED |
| Commit / push / PR | NOT PERFORMED |
| Juridische review NL legal | Recommended, not claimed complete |

Do **not** claim production-ready, 100% safe, or checkout-ready.
