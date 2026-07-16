# I18N route matrix

Public route parity between English (root) and Dutch (`/nl` prefix). Pathnames stay English in both locales; middleware rewrites `/nl/*` to the same App Router tree.

**Legend**

| Column | Meaning |
| --- | --- |
| English / Dutch status | UI chrome + page-specific content via dictionary/content maps |
| Switch preserves page | Language switcher keeps the bare pathname (and safe query params) |
| Status | `PASS` = fully localised for that locale; `PARTIAL` = route works but content or SEO incomplete |

**Admin:** English-only at `/admin/*`. Requests to `/nl/admin` (or `/nl/admin/*`) receive a **308 redirect** to the bare admin path (`src/middleware.ts`).

## Marketing & shop

| English route | Dutch route | English status | Dutch status | Switch preserves page | Status |
| --- | --- | --- | --- | --- | --- |
| `/` | `/nl` | PASS | PASS | Yes | PASS |
| `/solutions` | `/nl/solutions` | PASS | PASS | Yes | PASS |
| `/solutions/websites` | `/nl/solutions/websites` | PASS | PASS | Yes | PASS |
| `/solutions/webshops` | `/nl/solutions/webshops` | PASS | PASS | Yes | PASS |
| `/solutions/ai-automation` | `/nl/solutions/ai-automation` | PASS | PASS | Yes | PASS |
| `/solutions/whatsapp-ai` | `/nl/solutions/whatsapp-ai` | PASS | PASS | Yes | PASS |
| `/solutions/livechat` | `/nl/solutions/livechat` | PASS | PASS | Yes | PASS |
| `/solutions/reviewflows` | `/nl/solutions/reviewflows` | PASS | PASS | Yes | PASS |
| `/for-business` | `/nl/for-business` | PASS | PASS | Yes | PASS |
| `/shop` | `/nl/shop` | PASS | PASS | Yes | PASS |
| `/shop/[slug]` | `/nl/shop/[slug]` | PASS | PASS | Yes | PASS |
| `/cart` | `/nl/cart` | PASS | PASS | Yes | PASS |
| `/checkout` | `/nl/checkout` | PASS | PASS | Yes | PASS |
| `/checkout/success` | `/nl/checkout/success` | PASS | PASS | Yes | PASS |
| `/checkout/cancelled` | `/nl/checkout/cancelled` | PASS | PASS | Yes | PASS |
| `/cases` | `/nl/cases` | PASS | PASS | Yes | PASS |
| `/cases/conversie-website` | `/nl/cases/conversie-website` | PASS | PASS | Yes | PASS |
| `/cases/premium-webshop` | `/nl/cases/premium-webshop` | PASS | PASS | Yes | PASS |
| `/cases/whatsapp-automatisering` | `/nl/cases/whatsapp-automatisering` | PASS | PASS | Yes | PASS |
| `/cases/reviewflow-setup` | `/nl/cases/reviewflow-setup` | PASS | PASS | Yes | PASS |
| `/process` | `/nl/process` | PASS | PASS | Yes | PASS |
| `/about` | `/nl/about` | PASS | PASS | Yes | PASS |
| `/support` | `/nl/support` | PASS | PASS | Yes | PASS |
| `/contact` | `/nl/contact` | PASS | PASS | Yes | PASS |
| `/quote` | `/nl/quote` | PASS | PASS | Yes | PASS |

## Legal

Legal pages render under both locales. Shell text (`last updated`) uses the dictionary; **body copy is hardcoded English** in each page component — Dutch visitors see English legal prose.

| English route | Dutch route | English status | Dutch status | Switch preserves page | Status |
| --- | --- | --- | --- | --- | --- |
| `/privacy` | `/nl/privacy` | PASS | PARTIAL | Yes | PARTIAL |
| `/cookies` | `/nl/cookies` | PASS | PARTIAL | Yes | PARTIAL |
| `/terms` | `/nl/terms` | PASS | PARTIAL | Yes | PARTIAL |
| `/refund-policy` | `/nl/refund-policy` | PASS | PARTIAL | Yes | PARTIAL |

## Admin (English only)

| English route | Dutch route | English status | Dutch status | Switch preserves page | Status |
| --- | --- | --- | --- | --- | --- |
| `/admin` | `/nl/admin` → **308 → `/admin`** | PASS | N/A (redirect) | N/A | PASS |
| `/admin/login` | `/nl/admin/login` → **308 → `/admin/login`** | PASS | N/A | N/A | PASS |
| `/admin/*` (protected) | `/nl/admin/*` → **308 → `/admin/*`** | PASS | N/A | N/A | PASS |

## Product slugs (unchanged across locales)

All 16 seed slugs resolve under both `/shop/{slug}` and `/nl/shop/{slug}`:

`starter-website`, `business-website`, `premium-website`, `conversiegerichte-landingspagina`, `complete-webshop`, `website-redesign`, `whatsapp-ai-starter`, `whatsapp-ai-business`, `tawk-to-livechat-installatie`, `reviewflow-setup`, `afsprakenautomatisering`, `maandelijks-websitebeheer`, `technisch-onderhoud`, `conversie-audit`, `supporturen-bundel`, `maatwerk-digitalisering`

## Legacy redirects (308)

Old Dutch pathnames redirect to English equivalents, preserving `/nl` when present. See `legacyRedirects` in `src/i18n/config.ts` (e.g. `/oplossingen` → `/solutions`, `/offerte` → `/quote`).

## Verification

- Unit: `tests/unit/i18n.test.ts` — routing helpers, query filtering, alternates
- E2E: `tests/e2e/site.spec.ts` — homepage EN/NL, switcher route preservation, legal 200s, admin redirect to login
