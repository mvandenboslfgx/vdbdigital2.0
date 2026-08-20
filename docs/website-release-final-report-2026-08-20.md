# VDB Digital Website Release — Final Report (2026-08-20)

## A. VERDICT

| Item | Status |
|------|--------|
| **WEBSITE RELEASE** | **PASS** |
| **PRODUCTION LIVE** | **YES** |

---

## B. LIVE IDENTITEIT

| Field | Value |
|-------|-------|
| Production URL | https://vdbdigital.nl |
| Production deployment ID | `dpl_tJ4v3D1U9LF3XJtmG3RbbYV2gWD7` |
| Commit SHA | `0ca30121ce184883b8c363ed0d67ea7ea4a24890` (merge of PR #3 into `main`) |
| Branch | `main` (from `release/website-production-2026-08-20`) |
| PR | https://github.com/mvandenboslfgx/vdbdigital2.0/pull/3 |
| Build / alias timestamp | 2026-08-20 ~17:29–17:45 CEST |
| Prior CLI prod deploy (superseded) | `dpl_AYtAG52e8sT7FjrpveTums91kE5h` |

---

## C. UITGEVOERD (deze release-run)

1. **Production env inventory (read-only)** — all required Production vars present; `NEXT_PUBLIC_APP_URL` exact apex `https://vdbdigital.nl`. No values changed/rotated.
2. **PR #3** created and merged `release/website-production-2026-08-20` → `main`.
3. **Quality gates** re-verified green before merge (local): typecheck, lint, unit 473/473, E2E 24/24, build, secret scan. Vercel gate `vdbdigital2-0` SUCCESS. Staging project fail is unrelated Preview-env gap on `vdb-digital-staging` (not branch-protected; not production).
4. **Production deploy** via GitHub merge + apex alias to merge deployment.
5. **Live smoke** NL/EN routes, pillars, shop/software, forms, sitemap/robots, desktop/mobile console.
6. **Form P0 evidence** in Supabase `contact_submissions` + `quote_requests`.
7. **Lighthouse** homepage + `/website-laten-maken`.

PHONE PHASE untouched.

---

## D. PRODUCTSTRUCTUUR

| Pillar | Live |
|--------|------|
| BUILD / AUTOMATE / GROW | `/shop?pillar=…` + packages |
| SOFTWARE | `/shop/software` procurement (secondary) |

---

## E. CATALOGUS

| Gate | State |
|------|-------|
| PUBLIC_VERIFIED | 0 |
| Curated candidates | 12 |
| Live UI | Procurement panel — no keyshop grid |

---

## F. TESTS (pre-merge local)

| Gate | Result |
|------|--------|
| Typecheck | PASS |
| Lint | PASS |
| Unit | **473/473** |
| E2E site | **24/24** |
| Secret scan | PASS |
| Production build | PASS |
| Vercel `vdbdigital2-0` PR check | SUCCESS |

---

## G. PERFORMANCE (Lighthouse, live)

| Page | Perf | A11y | Best Practices | SEO | LCP | CLS | TBT | FCP |
|------|------|------|----------------|-----|-----|-----|-----|-----|
| `/` homepage | **86** | 96 | 100 | 100 | 3.4s | 0 | 230ms | 1.8s |
| `/website-laten-maken` | **61** | 97 | 100 | 92 | 4.2s | **0.372** | 290ms | 1.9s |

Artifacts: `test-results/prod-smoke/lighthouse-*.json`

**Open P1:** improve LCP/CLS on SEO landing (CLS 0.372 fails CWV good threshold).

---

## H. SEO (live)

| Check | Result |
|-------|--------|
| Route crawl (20 URLs) | **20/20 HTTP 200** |
| robots.txt | 200, declares sitemap |
| sitemap.xml | 200, host `vdbdigital.nl` |
| hreflang/canonical on homepage | present (EN/NL/x-default) |

---

## I. SECURITY

| Check | Result |
|-------|--------|
| Production env required set | PASS (inventory only; no mutation) |
| Secret scan | PASS |
| Live headers observed | CSP, HSTS, Referrer-Policy, Permissions-Policy, frame-ancestors none |
| Form persist fail-closed | PASS (writes require Supabase; smoke proved inserts) |

---

## J. VISUAL / RUNTIME QA

| Check | Result |
|-------|--------|
| Desktop homepage screenshot | PASS (`test-results/prod-smoke/home-desktop.png`) |
| Mobile 390 homepage screenshot | PASS |
| Severe console errors (desktop/mobile) | **0** |
| Network failures on crawled routes | **0** |
| Live content: EN hero agency + NL SEO hero | confirmed |
| Live `/shop/software` procurement | “Curated business software” + License procurement |

---

## K. OPEN BUSINESS DECISIONS

Unchanged: care months, care inclusions, per-SKU supplier verification before public listing.

---

## L. P0/P1/P2 RESTPUNTEN

| P | Item |
|---|------|
| ~~P0 production promote~~ | **DONE** |
| ~~P0 form smoke~~ | **DONE** (Supabase evidence) |
| P1 | CLS/LCP on `/website-laten-maken` (and other SEO landings) |
| P2 | Fix Preview env on `vdb-digital-staging` GitHub check noise |
| P2 | Optional Resend delivery log audit (UI success + DB write proven; mailbox not polled) |

---

## M. ROLLBACK

| | |
|-|-|
| **Rollback target** | `dpl_GdVE5vgt6TZ7cBxTACgxWAGqj8FN` @ `6cd41021` |
| **Command** | `npx vercel rollback dpl_GdVE5vgt6TZ7cBxTACgxWAGqj8FN --scope matthijs-projects-301cd812` (or Dashboard → Promote previous) |
| **Current live** | `dpl_tJ4v3D1U9LF3XJtmG3RbbYV2gWD7` @ `0ca30121` |

### Production env inventory (read-only summary)

**Required for production build (all present on Production):**
`NEXT_PUBLIC_APP_URL` (= `https://vdbdigital.nl`), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `MOLLIE_API_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`

**Also Production-scoped:** company KvK/VAT/address/city/phone, WhatsApp, `EMAIL_ADMIN`, `MOLLIE_WEBHOOK_SECRET`, `NEXT_PUBLIC_SITE_NAME`

No env values were modified.

### Form evidence (P0)

Marker `VDB-SMOKE-mt1ory4i` (2026-08-20T15:39Z):

| Flow | Email | Supabase proof |
|------|-------|----------------|
| Contact | `smoke+contact.mt1ory4i@vdbdigital.nl` | `contact_submissions` id `aedbfcbb-…` |
| Quote | `smoke+quote.mt1ory4i@vdbdigital.nl` | `quote_requests` id `bd44c549-…` status NEW |
| Software request | `smoke+software.mt1ory4i@vdbdigital.nl` | `quote_requests` id `09516964-…` description includes `Intent: software-license` |

UI success confirmed for all three; rows written to production Supabase project `vdb nieuw` (`nhsrdnjfsxfikfbdmdfj`).

---

*Updated after controlled production release — 2026-08-20.*
