# VDB Digital 2.0 — Staging, Operator, Legal & Security Readiness Report

**CHECKOUT ACTIVATION DECISION: NOT AUTHORIZED**  
**REMOTE/PRODUCTION MUTATIONS: STAGING ONLY** (Auth URL rebind after Preview rotate; Mollie Preview env; synthetic data)  
**COMMITS/PUSHES: NOT PERFORMED**  
**SIBLING STACKS: NOT MUTATED**

| Field | Value |
| --- | --- |
| Date | 2026-07-25 (Europe/Amsterdam) — final Mollie staging closure |
| Branch | `phase/shared-partner-backend` |
| Start/end HEAD | `a593e5d395fc7b90994c5cb2e8554cd241c48706` (unchanged; no agent commit) |
| Parent | `a70a9212a8d1cae774635715d47740d11ad84ace` (direct) |
| Start worktree (this Mollie phase) | **57** |
| End worktree | **60** (all **57** originals preserved; +`scripts/lib/staging-mollie-guards.ts`, +`scripts/staging-mollie-e2e.ts`, +`tests/unit/staging-mollie-guards.test.ts`) |

```
STAGING END-TO-END PASS — PRODUCTION AND CHECKOUT STILL NOT AUTHORIZED
```

### Mollie closure (this phase)

| Item | Result |
| --- | --- |
| Forensic webhook route | `POST /api/webhooks/mollie` (`src/app/api/webhooks/mollie/route.ts`) — classic Payments API; always `mollie.payments.get(id)` |
| Payment create | server-only harness `scripts/staging-mollie-e2e.ts` (no public payment-create API; checkout stays off) |
| Bare external POST (no bypass) | **401** app JSON `Unauthorized` → route reached → **`VERCEL_AUTOMATION_BYPASS_SECRET NIET NODIG`** |
| Protection | SSO null; no password protection; no bypass created/rotated |
| Preview redeploy (necessary: webhook token absent on prior Ready deploy) | `dpl_Bki5GX3JvqLRfkWVjFCMZD94AwJu` Preview Ready · project `prj_ox86yWKOv2cP7JHRNrG8qpmcvqf2` |
| `STAGING_APP_URL` (rotated) | `https://vdb-digital-staging-6yyuyx7iw-matthijs-projects-301cd812.vercel.app` |
| Auth Site URL + exact allowlist | updated on `qzek…` only to new Preview (3 exact paths; no localhost/prod/wildcard) |
| Repo `.vercel` | still `vdbdigital2-0` / `prj_ok9bUCPs1SxnoAxShdoWxERhDkVB` |
| Secrets (presence/shape only) | `MOLLIE_API_KEY` PRESENT **test**; webhook token PRESENT via legacy `MOLLIE_WEBHOOK_SECRET`; bypass ABSENT; `CHECKOUT_ENABLED` false/absent |
| Test payment | **1** synthetic EUR payment · provider **mode=test** · status **paid** |
| Real Mollie webhook | Preview reached; order → **PAID**; payment → **PAID**; delivery_released **true**; server-side Mollie GET used |
| Idempotency (duplicate POST) | HTTP **200** `received`; webhook_events cardinality unchanged; order stayed PAID |
| Unknown payment ID | **400** `payment_not_found`; no order mutation |
| Missing/manipulated token | **401** both; no payment lookup/mutation |
| Ledger | N/A for this web checkout path — `orders`/`payments`/`webhook_events` only; no partner ledger rows |
| Cleanup | run-ID scoped order/items/payments deleted; webhook_events retained (append-only); no production data |
| Checkout gate | exit **2** |
| SEO / API-RLS / invite (post-rotate) | **8/8**, **16/0**, **9/9** |
| `/` · `/checkout` | **200** · **307 → /shop** |
| Viewport 138 | prior result retained — no shared application UI code change (server-only harness + Preview env only) |

**Still true:** no production authorization; checkout/`PAY-002` remain disabled; no commit/push/merge/Production deploy.

---

## Prior final evidence remediation — 2026-07-24 (retained)

```
STAGING APP EVIDENCE INCOMPLETE — REMEDIATION REQUIRED; CHECKOUT REMAINS DISABLED
```

*(Superseded for Mollie only — see closure section above.)*

### Why not End-to-End PASS (historical)

Mollie staging testpayment/webhook was previously **skipped** (no safe payment-create harness with checkout off; `VERCEL_AUTOMATION_BYPASS_SECRET` absent; `mollie-harness.ts` is unit/doc only). Invite path proven via **app-owned token** (not mailbox delivery).

---

## Final staging evidence remediation — 2026-07-24

### Preflight

| Check | Result |
| --- | --- |
| HEAD / parent | `a593e5d…` child of `a70a9212…`; no agent commit |
| `staging:assert-target` | exit **0** |
| CLI link | `qzekuvmgfekzsowdecyk` |
| Preview deploy | `dpl_3USXUmTYr9tX47GJoDKwAS6Wyp6f` Ready *(superseded by Mollie redeploy above)* |
| Repo `.vercel` | still `vdbdigital2-0` |
| Auth Site URL + allowlist | unchanged / still exact match (no write) |
| Templates | still `{{ .ConfirmationURL }}` |

### Preview robots / indexing signals

| Signal | Result |
| --- | --- |
| `/robots.txt` | `User-Agent: *` + `Disallow: /` (**desired** Preview contract; not a SEO regression) |
| `X-Robots-Tag` | `noindex, nofollow` on `/` |
| Vercel Deployment Protection | SSO **null** (disabled earlier for evidence); `gitForkProtection=true`; **no** password protection on this plan path |
| Note | `Disallow: /` alone is not access control and not a guaranteed noindex; header provides the noindex signal |
| Staging SEO Playwright | **8/8** after env-aware robots assertion (`tests/e2e/seo-smoke.spec.ts`) |
| Production robots assertions | unchanged for non-preview baseURL |

### Browser role / RLS isolation

Synthetic run cleaned up after tests.

| Actor | Resource | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| customer A (API) | own project/quote/invoice | readable | readable | PASS |
| customer A (API) | customer B resources | denied/empty | denied | PASS |
| customer A (API) | self-insert `admin_roles` | fail | fail | PASS |
| customer A (browser) | `/portal` + deny `/admin` | portal; not admin | PASS | PASS |
| customer A (browser) | project B URL IDOR | no B title | PASS | PASS |
| customer A (browser) | own project | visible | PASS | PASS |
| partner A (API) | own/other partner_profiles | own only | PASS | PASS |
| partner A (browser) | `/admin` | blocked | PASS | PASS |
| staff admin_roles (browser) | not customer portal home | `/admin` or MFA | PASS | PASS |
| norole (browser) | `/portal` | redirected away | PASS | PASS |
| anon (API) | private storage object | denied | PASS | PASS |
| signed URL (API) | intended object TTL | 200 | PASS | PASS |

API matrix: **16/0**. Browser role suite: **6/6** (plus invite suite below).

### Invite E2E (app-owned token)

Code path: `createOrganizationWithInvite` / harness → `/uitnodiging/accepteren?token=` → `acceptInvitationAction` (not Supabase Auth `inviteUserByEmail` / not `generateLink`).

| Step | Result |
| --- | --- |
| Server-side unique invitation + PRIMARY role | PASS |
| Invite URL staging-only (no localhost/prod) | PASS |
| Browser accept → `/portal` | PASS |
| Reuse same invite | fails (alert) PASS |
| Logout via `/uitloggen` → `/inloggen` | PASS |
| External/prod Auth redirects | previously blocked; Auth allowlist unchanged |
| Email mailbox delivery | **NOT proven** (token held in temp fixture only) |
| Synthetic cleanup | PASS |

Playwright invite+role file: **9/9**.

### Mollie

| Precondition | Status |
| --- | --- |
| Key shape | `test_*` PRESENT |
| Live key | absent |
| `CHECKOUT_ENABLED` | unset/false |
| Payment create harness against staging | **PASS** — `scripts/staging-mollie-e2e.ts` + guards |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | ABSENT — **not required** (app route reachable) |
| Decision | **PASS** — real test payment + real webhook + idempotency proven |


### Slot gates

| Gate | Exit |
| --- | --- |
| Staging SEO | **0** (8/8) |
| Role/invite Playwright | **0** (9/9) |
| no-Tawk | **0** |
| Secret scan | **0** |
| checkout release gate | **2** (expected) |
| `/` | 200 |
| `/checkout` | **307 → /shop** |
| Windows exit `-1` background jobs | infrastructure interrupts only (not test failures) |

### Confirmations

- Production `nhsrd…`, Mobile, Partner untouched  
- Checkout / `PAY-002` disabled  
- No commit / push / Production deploy  
- Auth config not rewritten (already correct)

---

### Target re-proof

| Check | Result |
| --- | --- |
| CLI link | `qzekuvmgfekzsowdecyk` |
| `staging:assert-target` | exit **0** |
| Vercel staging project | `vdb-digital-staging` / `prj_ox86yWKOv2cP7JHRNrG8qpmcvqf2` |
| Deployment | `dpl_3USXUmTYr9tX47GJoDKwAS6Wyp6f` **Preview** Ready |
| `STAGING_APP_URL` | `https://vdb-digital-staging-r9qi6l84p-matthijs-projects-301cd812.vercel.app` |
| Repo `.vercel` | still `vdbdigital2-0` / `prj_ok9bUCPs1SxnoAxShdoWxERhDkVB` (**unchanged**) |
| Production denylist | `nhsrdnjfsxfikfbdmdfj` untouched |

### Auth route matrix (from code — no guessed paths)

| Flow | Calling code | Redirect param | App route | Staging URL | Route exists | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Password reset request | `requestPasswordResetAction` → `resetPasswordForEmail` | `redirectTo` | `/wachtwoord-herstellen` | `{APP}/wachtwoord-herstellen` | yes (`src/app/(auth)/wachtwoord-herstellen`) | Uses `resolveAppUrl()` |
| Magic link OTP | `requestMagicLinkAction` → `signInWithOtp` | `emailRedirectTo` | `/auth/callback?next=/portal` | `{APP}/auth/callback?next=/portal` | yes (`src/app/auth/callback/route.ts`) | `exchangeCodeForSession` |
| Auth callback (no code) | callback route | n/a | `/auth/callback` | `{APP}/auth/callback` | yes | redirects to `/inloggen` |
| Invite accept | `createOrganizationWithInvite` | **app URL only** (not Supabase Auth redirect) | `/uitnodiging/accepteren?token=` | `{APP}/uitnodiging/accepteren?token=…` | yes | token in `organization_invitations`; no Auth allowlist required |
| Email confirm page | informational UI | Site URL fallback for Supabase mailer | `/e-mail-bevestigen` | informational | yes | templates use `{{ .ConfirmationURL }}` (not SiteURL path concat) |
| Login / logout | `loginAction` / `logoutAction` | relative | `/inloggen` | same host | yes | no Supabase redirectTo |
| Account request | `requestAccountAction` | none | lead insert | n/a | n/a | no Auth redirect |

Base URL resolver: `resolveAppUrl()` (`src/lib/url/app-url.ts`) — Preview uses non-localhost `NEXT_PUBLIC_APP_URL` or `https://${VERCEL_URL}`.

### Staging Auth config actually applied (`qzek…` only)

Via Management API (`site_url` + `uri_allow_list`, snake_case). Email templates **not** changed (already `{{ .ConfirmationURL }}`).

| Setting | Value |
| --- | --- |
| Site URL | `https://vdb-digital-staging-r9qi6l84p-matthijs-projects-301cd812.vercel.app` |
| Allowlist (exact) | `{APP}/auth/callback` |
| | `{APP}/auth/callback?next=/portal` |
| | `{APP}/wachtwoord-herstellen` |
| Localhost | removed |
| Prod host / prod ref | absent |
| Globstar / `*.vercel.app` wildcard | absent |

**Note:** When this Preview URL rotates, re-apply Site URL + allowlist to the new host (stable host still optional).

### Synthetic Auth / Storage evidence (API harness; cleanup done)

Process-bound staging service_role via Management API (not from browser; not logged). Local `.env.local` still points at prod host for day-to-day — **not** used for staging writes.

| Check | Result |
| --- | --- |
| Create customer/partner/admin users | PASS → deleted after run |
| Login + logout (password) | PASS |
| `generateLink` recovery → staging host | PASS |
| Open redirect `evil.example` | blocked PASS |
| Production redirect `vdbdigital.nl` | blocked PASS |
| Magic link → staging `/auth/callback?next=/portal` | PASS |
| Invalid `/auth/callback?code=invalid` | 307 → `/inloggen` on staging host PASS |
| Storage buckets | **6**, `public=0` PASS |
| Upload PDF `customer-documents` + anon deny + signed URL 30s | PASS |
| Products anon select | rows=0 (hosted contract) |
| Harness summary | **46 pass / 0 fail** |

### Web / gates (this phase)

| Gate | Exit / result |
| --- | --- |
| Staging web smoke (routes, CSP RO, XFO DENY, no prod ref, checkout 307) | PASS |
| `/_next/image` + `/brand/icon-192.png` | PASS |
| Staging Playwright SEO | **7/8** — robots Preview body is `Disallow: /` (expected fail vs prod-shaped assertions) |
| `catalog:verify-no-tawk` | exit **0** |
| Secret scan | exit **0** |
| `checkout:release-gate` | exit **2** NOT READY (expected) |
| Mollie live/test webhook against staging | **SKIPPED** — only unit harness (`mollie-harness.ts`); no safe staging payment/webhook run; `P05_MOLLIE_TEST_VERIFIED` unset; test-shaped key present locally |

### Residuals blocking END-TO-END PASS

1. Full **browser** portal/admin/partner RLS isolation with org-scoped quotes/invoices/documents (API user create only this run).  
2. End-to-end **invitation accept** with synthetic org + token (app flow; not Auth redirect).  
3. Staging SEO robots assertion (**7/8**) — Preview fail-closed `Disallow: /`.  
4. Mollie test payment + webhook idempotency against `STAGING_APP_URL`.  
5. Re-bind Auth Site URL/allowlist if Preview URL changes.

### Confirmations

- Production Supabase `nhsrd…` / production Vercel `vdbdigital2-0` / Mobile / Partner: **untouched**  
- Checkout / `PAY-002`: **still disabled**  
- No commit, push, PR, merge, tag, or Production deploy  

---

## Prior: Dedicated staging APP deployment — 2026-07-24

```
STAGING APP EVIDENCE INCOMPLETE — REMEDIATION REQUIRED; CHECKOUT REMAINS DISABLED
```

*(Auth allowlist was still pending in that section; now applied — see matrix above. Residual web/role/Mollie gaps remain.)*

### Identity & denylist

| Item | Result |
| --- | --- |
| Supabase staging | `qzekuvmgfekzsowdecyk` / **VDB Digital Staging** (CLI linked) |
| Production denylist | `nhsrdnjfsxfikfbdmdfj` untouched |
| Local `.vercel` | still `vdbdigital2-0` / `prj_ok9bUCPs1SxnoAxShdoWxERhDkVB` (**unchanged**) |
| Dedicated Vercel project | **vdb-digital-staging** / `prj_ox86yWKOv2cP7JHRNrG8qpmcvqf2` |

---

## Prior: Dedicated staging DB apply — 2026-07-24 (DATABASE PASS)

| Input | Value |
| --- | --- |
| `STAGING_SUPABASE_PROJECT_REF` | `qzekuvmgfekzsowdecyk` |
| `STAGING_SUPABASE_URL` | `https://qzekuvmgfekzsowdecyk.supabase.co` |
| Production denylist | `nhsrdnjfsxfikfbdmdfj` (untouched) |

Migrations through grant-hardening applied; contracts 0 failures after hosted-grant remediation.

```
STAGING DATABASE PASS — APP/OPERATOR EVIDENCE REQUIRED; CHECKOUT REMAINS DISABLED
```

*(Superseded as leading status by APP EVIDENCE INCOMPLETE after this deployment phase.)*

### Prior identity block (same day)

Earlier resume stopped because CLI/MCP could not see `qzek…`. After interactive `supabase login` with staging owner account, identity was proven and apply resumed.

---

## Target classification matrix

| Target | Classification | Writes this run |
| --- | --- | --- |
| Local `vdbdigital2` (54321/54322) | local | attempted (reset retry — see DB section) |
| Dedicated Supabase staging | **VDB Digital Staging** `qzekuvmgfekzsowdecyk` | migrations + grant hardening applied |
| Vercel preview/staging | not proven dedicated | none |
| Mollie | local `.env.local` key **test-shaped** | no live calls; no payment created |
| Production Supabase `nhsrdnjfsxfikfbdmdfj` | production denylist | **none** |
| Vercel production | production | **none** |
| Partner `544xx` / Mobile `545xx` | sibling | **none** (containers left running) |

### Staging identity evidence

| Check | Result |
| --- | --- |
| Operator staging ref/URL | `qzekuvmgfekzsowdecyk` / matching host |
| Name via CLI | **VDB Digital Staging** |
| `APP_ENV=staging` (process) | set for assert/apply |
| `npm run staging:assert-target` | exit **0** PASS |
| Linked CLI ref | `qzekuvmgfekzsowdecyk` |
| MCP | blocked for staging (reported separately) |
| Checkout flags | remain off |

### Pre-write checkpoint

| Item | Status |
| --- | --- |
| Staging classified & proven | **PASS** — CLI list name/ref; linked `qzek…` |
| First remote write | **PERFORMED** — `db push --linked` on staging only |
| Rollback / recovery | forward migration only (`20260724103105` applied) |
| Production/siblings untouched | **CONFIRMED** |

---

## Local baseline gates

| Command | Exit | Notes |
| --- | --- | --- |
| `npm ci` | 0 | lockfile consistent |
| `npm audit --audit-level=high` | 0 | 0 vulnerabilities |
| `npm ls next sharp` | — | next@16.2.11 → sharp@0.35.3 |
| `npm run typecheck` | 0 | after CSP/legal edits |
| `npm run lint` | 0 | |
| `npm run env:scan-secrets` | 0 | |
| `npm run test:access-control` | 0 | |
| `npm run test:security` | 0 | includes CSP Report-Only assertion |
| `npm run checkout:release-gate` | 2 | **EXPECTED NOT READY** |
| `npx supabase db reset --local --yes` | 0 (retry) | First attempt failed (`error running container`); debug retry **PASS**; migrations + seed applied |
| Partner/quotes/invoices/documents/RLS verify | 0 | All PASS after successful reset |
| `npm run build` | 0 | Turbopack |
| CSP/rate-limit unit slice | 0 | phase2-security + rate-limit |
| SEO-smoke / viewport / full unit | 0 | unit **468** PASS; e2e seo-smoke **8/8**; viewport prior **138/138** |

---

## Database / migrations

Canonical migrations include invoice grant hardening + verify alignment (`20260723140000`, `20260723150000`).

This run: first `db reset --local` failed with container init race; **retry with `--debug` exit 0**. Post-reset verifies:

- `db:verify-partner-backend` PASS  
- `db:verify-invoices-financial` PASS  
- `db:verify-quotes-acceptance` PASS  
- `db:verify-documents-storage` PASS  
- `db:test-rls` PASS  

Remote staging apply: **blocked** pending dedicated project.

---

## Image-opt

Prior dependency-run proven locally: sharp encode + `/_next/image` 200.  
Staging image-opt: **BLOCKED — no staging host**.

---

## Mollie testflow

| Item | Status |
| --- | --- |
| Credential shape | test-shaped locally |
| Staging webhook URL | missing (no staging) |
| Test payment / webhook evidence | **NOT RUN** — no staging target |
| Checkout | remains OFF |
| Operator checklist | see runbook §6 |

---

## CSP

| Item | Status |
| --- | --- |
| Enforcing CSP | still includes `unsafe-inline` (required today) |
| Report-Only | **added** — stricter candidate without `unsafe-inline` |
| Nonce enforcement | **DEFERRED WITH EVIDENCE** (dynamic/cache/LCP risk) |
| Collector endpoint | not present |

---

## Rate-limit / multi-instance

| Item | Status |
| --- | --- |
| Durable backends | Upstash missing locally; Supabase RPC intended durable path |
| contact/quote | fail-closed buckets + degraded in-memory if both backends fail |
| checkout/payment | hard fail-closed |
| Multi-instance PASS | **not claimed** — residual degraded-memory risk documented |
| Vercel WAF | still configuration-required per existing docs |

---

## Legal readiness

See `docs/VDB_DIGITAL_LEGAL_READINESS_REVIEW.md`.

| Status | Count |
| --- | ---: |
| FIXED AND VERIFIED | 3 |
| PASS — NO CHANGE | 9 |
| OPEN — LEGAL REVIEW REQUIRED | 7 |
| BLOCKED — BUSINESS INPUT REQUIRED | 3 |
| NOT APPLICABLE | 1 |

Safe quote-first copy fixes applied in `src/i18n/content/legal.ts` + `siteConfig.legal.lastUpdated`. **Not** lawyer-approved.

---

## Operator next (app / gate evidence)

1. Provide `STAGING_APP_URL` (Preview/staging host) when ready — then re-run operator web evidence.  
2. Optionally align Supabase MCP login with the staging owner account (CLI already sufficient).  
3. Keep checkout off; do not set `CHECKOUT_ENABLED=true` or close `PAY-002` from staging alone.  
4. Optional: Upstash + Mollie test checklist flags for checkout gate (still NOT READY).  
5. Commit of `20260724103105_staging_cloud_grant_hardening.sql` is **operator-owned** (not committed this run).

---

## Files added/changed this phase (non-exhaustive)

| Path | Reason |
| --- | --- |
| `docs/VDB_DIGITAL_STAGING_OPERATOR_READINESS_REPORT.md` | this report |
| `docs/VDB_DIGITAL_STAGING_RUNBOOK.md` | operator repeatability |
| `docs/VDB_DIGITAL_LEGAL_READINESS_REVIEW.md` | legal readiness |
| `scripts/assert-staging-target.ts` | fail-closed identity gate |
| `scripts/env-presence-shape.ts` | secrets-free presence/shape |
| `package.json` | scripts `staging:assert-target`, `env:presence-shape` |
| `src/middleware.ts` | CSP Report-Only |
| `tests/unit/phase2-security.test.ts` | CSP header split test |
| `src/i18n/content/legal.ts`, `src/config/site.ts` | safe legal copy alignment |

---

## Confirmations

- Checkout remains **DISABLED**; `PAY-002` remains **OPEN**  
- Production not mutated  
- Partner/Mobile not mutated by this agent  
- No commit / push / PR / tag  
- No live payment / refund / webhook  
- No secrets logged in this report  
