# RELEASE FREEZE — VDB Digital (pre-ads)

**Frozen at:** 2026-09-28 (Europe/Amsterdam)  
**Policy:** Until ads launch, only allow fixes for production 5xx, broken lead submission, broken checkout/payment, broken auth, broken portal, security issues, or critical mobile usability. Everything else → post-launch backlog.

**Do not:** add features, redesign, refactor auth, deploy dirty-tree work, change infrastructure, or change DB schema unless a critical production incident requires it.

---

## Production runtime (source of truth)

| Item | Value |
|------|--------|
| Cloudflare Worker | `vdbdigital-live-new` |
| Production version | `c3f1e964-a10f-4f97-949f-3863ac6506d3` |
| Promote message | `PROMOTE-FIX-quote-software-intent-Continue-server-prefills-v2` |
| Rollback version | `0662a1f8-14a2-46b4-9821-82ae1345d248` (last known-good before v2; proven via emergency rollback after failed incomplete hotfix) |
| Alternate prior good | `c610b5d6-6121-4e78-8582-5391ea81172e` (auth cleanup lineage, pre–secret-change) |
| Domains | `vdbdigital.nl` / `www` stay on `vdbdigital-live-new` |

---

## Git / worktree

| Item | Value |
|------|--------|
| Local branch HEAD | `4131fa2b1b425967352cb5d41b6e2d5c337005df` — `fix(security): guard referral GET against prefetch mutations` |
| GitHub `origin/main` HEAD | `25e00207528bf1e440a11bce2bf7453423880fd4` — same subject line; parallel history (not identical hash) |
| Worktree isolation | **PASS** — unrelated dirty A/B/F marketing/commerce/portal WIP remains uncommitted and is **not** part of this freeze commit/tag |
| Note | Live Worker `c3f1e964` was uploaded via the established CF safe flow with the software-quote Continue hotfix; dirty WIP was not intentionally promoted as a feature bundle |

---

## Database migration state

| Item | Value |
|------|--------|
| Project | `nhsrdnjfsxfikfbdmdfj` (production) |
| Evidence | `docs/evidence/production-migration-list.txt`, `docs/evidence/production-post-apply-verify.json` (2026-09-26, **22/22 PASS**) |
| Remote tip (applied) | `20260926020000` — `commerce_purchase_fulfillment_v1` |
| Local↔remote (list snapshot) | Aligned through `20260926020000` (stubs + catalog/marketing/partner/commerce apply set present remotely) |
| Freeze rule | **No schema changes** unless critical production incident |

---

## Cloudflare bindings / secrets (NAMES only)

**Worker:** `vdbdigital-live-new` · `keep_vars: true`

### Plain vars (names)

`ALLOWED_ORIGINS`, `APP_ENV`, `BOOKING_ENABLED`, `BOOKING_ONLINE_URL`, `BOOKING_PROVIDER`, `BOOKING_PROVIDER_URL`, `CHECKOUT_ENABLED`, `CLOUDFLARE_ENV`, `EMAIL_ADMIN`, `EMAIL_FROM`, `GOOGLE_AUTH_ENABLED`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_COMPANY_ADDRESS`, `NEXT_PUBLIC_COMPANY_CITY`, `NEXT_PUBLIC_COMPANY_KVK`, `NEXT_PUBLIC_COMPANY_PHONE`, `NEXT_PUBLIC_COMPANY_PHONE_TEL`, `NEXT_PUBLIC_COMPANY_POSTAL_CODE`, `NEXT_PUBLIC_COMPANY_VAT`, `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_PRIVACY_EMAIL`, `NEXT_PUBLIC_SITE_NAME`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPPORT_EMAIL`, `UPSTASH_REDIS_REST_URL`

### Secrets (names only)

`GOOGLE_PLACES_API_KEY`, `MOLLIE_API_KEY`, `MOLLIE_WEBHOOK_TOKEN`, `PUBLIC_FORM_RPC_SECRET`, `RESEND_API_KEY`, `SUPABASE_SECRET_KEY`, `UPSTASH_REDIS_REST_TOKEN`

### Asset binding

`ASSETS`

Evidence: `docs/evidence/cf-predeploy-check.json` (binding parity PASS; no secret values recorded here).

---

## Gate evidence (pre-ads)

| Gate | Result | Evidence |
|------|--------|----------|
| Auth / session | **PASS** | Prior pre-ads auth smoke + production-proven SSR/proxy architecture freeze |
| Portal | **15/15 PASS** | Prior portal contract smoke (pre-ads) |
| Software-intent quote | **14/14 PASS** | `test-results/pre-ads-software-quote/report.json` (EN+NL Continue, submit, intent stored, no dup) |
| Authenticated commercial E2E | **31/31 PASS** | `test-results/pre-ads-auth-portal/report.json` — order `RC-AUTH-1790540648823` |
| Mollie TEST | **PASS** | Auth commercial E2E + prior webhook chain (LIVE key not enabled) |
| Webhook | **PASS** | Auth E2E `webhook.open_ok` / paid reconciliation |
| Webhook replay | **PASS** | Auth E2E replay: payment once, jobs stable, project once |
| Fulfillment | **PASS** | Auth E2E + portal Projecten (`Onepage Website — PreAds Smoke BV`) |
| Email | **PASS** | Auth E2E `email.confirmation_flag` sent=true; no secrets in report |
| Cross-customer deny | **PASS** | Auth E2E foreign org / anon deny checks |
| Server price authority | **PASS** | Auth E2E `sec.client_cannot_set_price` |
| PRE-ADS GO | **YES** | Locked at Worker `c3f1e964` |

---

## Incident-only allowlist (until ads launch)

Allowed:

1. Production 5xx
2. Broken lead submission (contact / quote)
3. Broken checkout / payment
4. Broken auth
5. Broken portal
6. Security issue
7. Critical mobile usability

All other work → **post-launch backlog**.

---

## Rollback procedure (reminder)

```bash
CF_CANDIDATE_VERSION_ID=0662a1f8-14a2-46b4-9821-82ae1345d248 \
CF_PROMOTE_MESSAGE="ROLLBACK-pre-ads-freeze-restore" \
npm run cf:promote
```

Then smoke `/`, `/quote`, `/contact`, `/inloggen`, `/portal`.

---

## Freeze verdict

| Field | Value |
|-------|--------|
| RELEASE FREEZE | **PASS** |
| PRODUCTION VERSION | `c3f1e964-a10f-4f97-949f-3863ac6506d3` |
| ROLLBACK | `0662a1f8-14a2-46b4-9821-82ae1345d248` |
| GITHUB HEAD | `origin/main` = `25e00207528bf1e440a11bce2bf7453423880fd4` (local parallel `4131fa2…`) |
| WORKTREE ISOLATED | **PASS** |
| MONDAY ADS | **GO** |
