# VDB Digital 2.0 — Staging Operator Runbook

**Status:** STAGING END-TO-END PASS — PRODUCTION AND CHECKOUT STILL NOT AUTHORIZED  
**Date:** 2026-07-25  
**HEAD:** `a593e5d395fc7b90994c5cb2e8554cd241c48706` (parent `a70a9212…`)  
**Supabase staging:** `qzekuvmgfekzsowdecyk` — Site URL + exact allowlist bound to current Preview  
**Vercel staging:** `vdb-digital-staging` / Preview `dpl_Bki5GX3JvqLRfkWVjFCMZD94AwJu`  
**`STAGING_APP_URL`:** `https://vdb-digital-staging-6yyuyx7iw-matthijs-projects-301cd812.vercel.app`

### Preview indexing notes

- `robots.txt` → `Disallow: /` is the **intended** Preview contract (do not “fix” to production Allow for a green SEO score).
- Also verify `X-Robots-Tag: noindex, nofollow` (middleware) and Deployment Protection status.
- Env-aware SEO: `tests/e2e/seo-smoke.spec.ts` (staging **8/8**).

### Role / invite evidence

- Browser + API suite: `tests/e2e/staging-role-invite.spec.ts` against `STAGING_APP_URL`.
- Invite is **app-owned** (`/uitnodiging/accepteren?token=`), not Supabase Auth invite email.
- Cleanup synthetic users/orgs after each run.

### Mollie staging webhook (proven)

- Process-bound `test_*` key only (`ALLOW_STAGING_MOLLIE_E2E=true`)
- Harness: `npm run staging:mollie-e2e` → `scripts/staging-mollie-e2e.ts`
- Guards: `scripts/lib/staging-mollie-guards.ts` (refuse live key, prod ref, checkout on)
- Webhook: `POST /api/webhooks/mollie?token=…` — **no Vercel bypass required** on this staging project (app 401 reached without bypass)
- Hosted test UI: iDEAL → issuer → `final_state=paid` → Continue; wait for **real** Mollie delivery before duplicate POST
- Never live keys / never `CHECKOUT_ENABLED=true`

### Deploy isolation reminder

Never `vercel link` the canonical repo to staging if it would overwrite the production `.vercel` link (`vdbdigital2-0`). Use an isolated temp copy + Preview only (never `--prod`).  

**Canonical repo:** VDB Digital 2.0 (`CANONICAL_BACKEND_OWNER`)  
**Branch:** `phase/shared-partner-backend`  
**Contract:** `vdb-backend-contract@0.2.0-rc.1` / `schemaVersion=2026.07.22.partner-rc1`

**Hard rules**

- Never write to production denylist ref `nhsrdnjfsxfikfbdmdfj` (`vdb nieuw`).
- Never start/stop/reset Partner (`544xx`) or Mobile (`545xx`) stacks from this runbook.
- Never enable checkout / `PAY-002`.
- Never print secrets, tokens, or service-role keys.
- Prefer forward fixes only — no remote `db reset` on staging/production.
- Do not create a paid cloud project from Cursor; owner provisions staging.

---

## 1. Prerequisites

| Item | Required |
| --- | --- |
| Docker Desktop running | yes (for local baseline) |
| Local `project_id` | `vdbdigital2` |
| Local ports | API 54321, DB 54322, Studio 54323, Inbucket 54324, shadow 54320, analytics 54327 |
| Node / npm | Node 24.x / npm 11.x (as used in remediation) |
| Dedicated Supabase project | **VDB Digital Staging** — ref `qzekuvmgfekzsowdecyk` (must appear in CLI `projects list` with that name) |
| Staging secrets | Separate publishable + secret; never copy production |
| Mollie | `test_` key only |
| `CHECKOUT_ENABLED` | `false` |
| `APP_ENV` | `staging` on staging clients |

---

## 2. Secrets-free presence checks

```bash
npm run env:presence-shape
npm run staging:assert-target
```

Expected before any remote write:

- `staging:assert-target` → exit **0**
- Linked CLI ref ≠ `nhsrdnjfsxfikfbdmdfj`
- `STAGING_SUPABASE_PROJECT_REF` set to dedicated staging ref
- `APP_ENV=staging`
- `MOLLIE_API_KEY` → `test-shaped` (or missing → stop Mollie tests)
- `CHECKOUT_ENABLED` → `false`

If `staging:assert-target` exits **2**: **STOP**. No remote write.

---

## 3. Local baseline (always before staging apply)

```bash
npm ci
npm audit --audit-level=high
npm run typecheck
npm run lint
npm run build
npm run env:scan-secrets
npm run catalog:verify-no-tawk
npm run test:access-control
npm run test:security
npx vitest run tests/unit/
npx playwright test tests/e2e/seo-smoke.spec.ts
npx playwright test --config=playwright.viewport-qa.config.ts
npm run checkout:release-gate   # expect exit 2 / NOT READY
```

Local DB (from repo root only):

```bash
npx supabase status
# Confirm API http://127.0.0.1:54321 and DB 54322; siblings on 544xx/545xx untouched
npx supabase db reset --local --yes
npm run db:verify-partner-backend
npm run db:verify-quotes-acceptance
npm run db:verify-invoices-financial
npm run db:verify-documents-storage
npm run db:test-rls
```

Image smoke (after `npm run build && npm run start`):

```text
GET /_next/image?url=%2Fbrand%2Ficon-192.png&w=128&q=75  → 200
```

---

## 4. Staging identity gate (pre-write checkpoint)

Document in evidence before first write:

1. Staging project display name contains `Staging`
2. Project ref (prefix only in docs) ≠ `nhsrdnjfsxfikfbdmdfj`
3. Staging URL host matches that ref
4. Credentials are staging-only
5. Checkout flags off
6. First write command (e.g. `supabase db push --linked` **only after** `supabase link` to staging)
7. Rollback/recovery = forward migration fix only
8. Production and siblings not targeted

```bash
npm run staging:assert-target
# Must PASS before link/apply
```

---

## 5. Dry-run then apply (staging only)

Check CLI help for your installed version (`npx supabase --help`, `db push --help`). Typical safe sequence:

```bash
# Link ONLY after identity PASS — never to nhsrdnjfsxfikfbdmdfj
npx supabase link --project-ref <STAGING_REF>

# Read-only history / drift (use supported flags for CLI 2.109+)
npx supabase migration list --linked

# Prefer dry-run if available for your CLI; otherwise review list vs local files
# Then apply forward migrations only — NO remote db reset
npx supabase db push --linked
```

Immediately after apply:

```bash
# Point verifiers at staging via staging env (never print keys)
npm run db:verify-partner-backend
npm run db:verify-quotes-acceptance
npm run db:verify-invoices-financial
npm run db:verify-documents-storage
```

Restore local CLI context so the repo is not left linked to an unintended remote:

```bash
# Prefer re-link local workflow / clear linked target per operator practice
# Confirm: npm run staging:assert-target still fails closed if staging env unset
```

---

## 6. Mollie testmodus (checkout remains OFF)

```bash
ALLOW_STAGING_MOLLIE_E2E=true STAGING_APP_URL=<preview-https> npm run staging:mollie-e2e
```

- Accept only `test_` shaped API key (live → hard stop)
- Webhook URL = `{STAGING_APP_URL}/api/webhooks/mollie?token=…` (no Vercel bypass on this project)
- Do **not** set `CHECKOUT_ENABLED=true`
- Max one payment per run-ID; never log payment URL / full payment ID / tokens
- After hosted test `final_state=paid`, wait for **real** Mollie webhook before duplicate POST

Stop conditions: live-shaped key, unknown shape, production webhook host, missing token, checkout enabled.

---

## 7. Incident / stop conditions

Stop immediately if:

- Target ref equals production denylist
- Unexpected remote-only migrations / checksum conflicts
- Destructure SQL proposed
- Sibling ports/stacks would be mutated
- Secrets would be logged
- Checkout flag would be enabled

Recovery: forward-only migration after local proof; never remote reset of production.

---

## 8. Operator provisioning checklist

| Step | Owner | Status 2026-07-25 |
| --- | --- | --- |
| Create Supabase project **VDB Digital Staging** (eu-west-1) | Owner | **DONE** (`qzekuvmgfekzsowdecyk`) |
| Record `STAGING_SUPABASE_PROJECT_REF` ≠ prod | Operator | **DONE** |
| Separate publishable + secret keys | Operator | **DONE** (Preview inline env) |
| Staging Auth redirect allowlist | Operator | **DONE** (exact Preview paths) |
| Vercel Preview/staging env with checkout off | Operator | **DONE** |
| Optional Upstash for Preview | Operator | Optional |
| Vercel WAF public-mutations rule | Operator | Recommended |
| Confirm Mollie test key + staging webhook | Operator | **DONE** (E2E PASS; checkout still off) |
| Cloud grant hardening migration | Agent/operator | **DONE** on staging (`20260724103105`) |
