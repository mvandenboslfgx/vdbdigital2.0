# VDB Digital Website Release — Final Report (2026-08-20)

## A. VERDICT

| Item | Status |
|------|--------|
| **WEBSITE RELEASE** | **PASS** (code + local gates) |
| **PRODUCTION LIVE** | **NO** (promotion blocked — see §M) |

Release branch is integration-complete, all automated quality gates pass locally, and a Vercel preview deployment built successfully from GitHub. Production `https://vdbdigital.nl` still serves the prior production deployment until an owner promotes/merges with production env validation.

---

## B. LIVE IDENTITEIT

| Field | Value |
|-------|-------|
| Production URL | https://vdbdigital.nl |
| Production deployment | `dpl_GdVE5vgt6TZ7cBxTACgxWAGqj8FN` |
| Production commit | `6cd41021aea5f54f4e56621721f5956e87842dd6` (`release/public-website-visual-recovery`) |
| Release branch | `release/website-production-2026-08-20` |
| Release HEAD | `791907cd0c515057d95a817fa2fef8fa1b825ae0` |
| Preview deployment (release branch) | `dpl_2wqgwz2jSVFjYBf9PXNUeKMn7ujL` — **READY** |
| Preview URL | https://vdbdigital2-0-gz2lbth45-matthijs-projects-301cd812.vercel.app (Vercel SSO on fetch) |
| Base commit | `f3347abb27a969a926e889102b63f189726c1d7e` (`origin/main`) |
| Build timestamp (local gate) | 2026-08-20 ~01:16 UTC+2 |

---

## C. UITGEVOERD

### Integration (preflight)
- Safe branch `release/website-production-2026-08-20` from `origin/main`
- Cherry-picks: catalog P0/P1, SEO infra, NL landing pages, homepage SEO/hreflang/sitemap
- Conflict resolution in `src/i18n/config.ts` (kept `shopSoftware`, no duplicate `/packages`)
- Secrets excluded from commits; `.gitignore` hardened

### Commercial / product
- BUILD / AUTOMATE / GROW / SOFTWARE pillar navigation (`PillarNav`, homepage `SolutionsGridSection`)
- Shop repositioned: packages & pricing primary; software secondary at `/shop/software`
- Fail-closed software catalog: procurement UI when 0 verified SKUs
- Quote flow: `?intent=software-license` wired to existing quote/admin infrastructure
- Bundle/care honesty: `includedCareMonths: null`, `careInclusionDefined: false`
- SSOT adapter layer (`catalog-ssot.ts`) without duplicating pricing configs

### Homepage
- Section order: Hero → Solutions (4 pillars) → Packages → Cases → Process → Problems → CTA
- NL SEO hero/meta (professional webdesign positioning) without fabricated stats

### Quality / release hygiene
- E2E aligned to current nav, heroes, procurement shop, admin redirect (`/inloggen`)
- ESLint ignore for operator `.cjs` scripts and local evidence dirs
- Visual screenshot suite extended with `/shop/software`
- Preflight + this final report

### Explicitly NOT touched
- PHONE PHASE, Android v6 binary, Samsung S25 evidence, AAL2/device tests, app release identity

---

## D. PRODUCTSTRUCTUUR

| Pillar | Public emphasis |
|--------|-----------------|
| **BUILD** | Websites, webshops, custom software, portals, dashboards |
| **AUTOMATE** | WhatsApp AI, AI automation, appointment automation, review flows |
| **GROW** | Conversion optimisation, maintenance, support, Essential/Business/Growth Care, Digital Partner |
| **SOFTWARE** | Curated business software, license procurement, request-only for unverified SKUs — **secondary** |

Navigation: `Packages & pricing` → `/shop` (BUILD default); footer link to `/shop/software`.

---

## E. CATALOGUS

| Gate | Count / state |
|------|----------------|
| **PUBLIC_VERIFIED** | **0** (fail-closed — nothing browsable) |
| **Curated candidates in review** | 12 |
| **BLOCKED / archived (red)** | preserved in inventory, never public |
| **LEGACY_REQUEST_ONLY** | Windows 10 etc. — not in normal browse |
| **Public UI** | Procurement panel + quote CTA; no empty keyshop grid |

Harde regels actief: geen Unknown/unspecified, geen verzonnen prijzen/supplier data, geen Product schema voor incomplete SKU's.

---

## F. TESTS

| Gate | Result |
|------|--------|
| Typecheck | **PASS** |
| ESLint | **PASS** (after `scripts/**/*.cjs` + local evidence ignores) |
| Unit tests (Vitest) | **473 / 473 PASS** (55 files) |
| E2E (`site.spec.ts`) | **24 / 24 PASS** |
| E2E screenshots | **49 / 49 PASS** |
| Secret scan | **PASS** |
| Production build (`npm run build`) | **PASS** |
| Catalog policy tests | Included in unit suite — **PASS** |

---

## G. PERFORMANCE

- Local production build completes successfully (~73+ routes incl. SEO landings).
- Core Web Vitals lab measurement **not run** this session (no Lighthouse CI in pipeline).
- Images use `next/image` on key visuals; no third-party chat widgets (Tawk removed — E2E verified).
- **P2:** run Lighthouse on preview/production after promotion.

---

## H. SEO

- Locale alternates + hreflang via `buildLocaleAlternates`
- NL SEO landing routes: `/website-laten-maken`, `/webdesign`, `/kennisbank`, local variants
- Sitemap unit tests pass; TrustBooker excluded from index
- Homepage NL meta title/description optimized (no keyword stuffing)
- `/shop/software` indexable with honest procurement copy; no invalid Product JSON-LD for unverified SKUs

---

## I. SECURITY

| Check | Status |
|-------|--------|
| Secret scan (tracked + .env.local gitignore) | PASS |
| Tawk.to not loaded | E2E PASS |
| Admin unauthenticated → login | E2E PASS (`/inloggen`) |
| Public shop fail-closed gates | Unit + integration PASS |
| Production env guard in `next.config` | Blocks misconfigured deploy (observed on CLI staging attempt) |
| CSP / headers | Existing middleware — not re-audited line-by-line this session |

**Open:** Full CSP penetration review P2; rate-limit smoke on forms in production after deploy.

---

## J. VISUAL QA

Screenshots captured under `test-results/screenshots/`:

- Viewports: 360, 390, 768, 1440
- Pages: home (EN/NL), solutions, shop, **shop/software**, quote, contact, cases, demo-whatsapp, mobile menu

Manual pixel review recommended on preview URL after SSO access.

---

## K. OPEN BUSINESS DECISIONS

| Topic | Marker |
|-------|--------|
| Essential/Business Care included months in bundles | `needs_business_decision` |
| Care inclusions (hosting, SLA, cancellation) | `care-inclusions.ts` — all TBD |
| Per-SKU supplier/region/activation before public listing | verification gate |
| Re-listing Parallels, RoboForm, PDF Expert, Nitro, Acronis | policy TBD |
| NL homepage SEO hero vs EN agency hero parity | intentional NL organic focus — confirm with founder |

---

## L. P0 / P1 / P2 RESTPUNTEN

| Priority | Item |
|----------|------|
| **P0** | **Production promotion** — merge/promote release branch with prod env vars |
| P1 | Full NL/EN copy parity sweep on all SEO landings (human review) |
| P1 | Lighthouse CWV on promoted URL |
| P2 | Route crawl automation script (currently covered by E2E + sitemap tests) |
| P2 | Form submission end-to-end against live Resend/Supabase in staging |

---

## M. ROLLBACK

| | |
|-|-|
| **Last known good production** | `dpl_GdVE5vgt6TZ7cBxTACgxWAGqj8FN` @ `6cd41021` |
| **Rollback route** | Vercel → Promote previous production deployment or revert domain alias |
| **Release branch** | `release/website-production-2026-08-20` @ `791907c` (safe to iterate without touching prod) |

### Production promotion blocker (action required)

1. In Vercel **vdbdigital2-0** project: confirm Production env includes `NEXT_PUBLIC_APP_URL=https://vdbdigital.nl` and required Supabase/Mollie/Resend keys.
2. **Promote** preview `dpl_2wqgwz2jSVFjYBf9PXNUeKMn7ujL` (or latest on release branch) **or** merge `release/website-production-2026-08-20` → `main` with CI green.
3. Post-deploy smoke: NL+EN homepage, `/shop/software` procurement, forms, sitemap.xml, robots.txt.

---

*Generated autonomously — 2026-08-20. PHONE PHASE untouched.*
