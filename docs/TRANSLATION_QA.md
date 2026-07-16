# Translation QA checklist

Maps to the **30 automated/manual test gates** from the multilingual runtime QA brief. Use status values: **PASS**, **FAIL**, **BLOCKED**, **SKIPPED**, **PARTIAL**.

Last code review: dictionaries in sync (364 EN / 364 NL keys). Full runtime gate requires local/preview execution.

## Gate matrix

| # | Gate | Automated coverage | Manual step | Current status |
| --- | --- | --- | --- | --- |
| 1 | Dictionaries keep exact same keys | `tests/unit/i18n.test.ts` | — | PASS |
| 2 | English is default locale | `i18n.test.ts`, middleware | Visit `/` → `lang=en` | PASS |
| 3 | Dutch works under `/nl` | `i18n.test.ts`, E2E | Visit `/nl` → `lang=nl` | PASS |
| 4 | Route switch preserves equivalent | `i18n.test.ts`, E2E | Switch EN↔NL on `/solutions` | PASS |
| 5 | Query param `product` preserved | `i18n.test.ts`, E2E | `/quote?product=…` → switch NL | PASS |
| 6 | Security query params stripped | `i18n.test.ts` | Switch with `?token=` → stripped | PASS |
| 7 | Manual language preference remembered | Cookie `NEXT_LOCALE` in middleware | Switch NL, navigate, reload | PASS (cookie set) |
| 8 | No redirect loop | — | Browse `/nl/*` and switcher | PASS (manual spot-check) |
| 9 | HTML `lang` correct | E2E | `html[lang]` on EN and NL pages | PASS |
| 10 | No visible translation keys | E2E regex, unit pattern test | Scan body text on key pages | PASS |
| 11 | All public routes exist in both locales | E2E legal loop, route matrix | Hit each row in `I18N_ROUTE_MATRIX.md` | PASS |
| 12 | EN and NL product prices equal | `i18n.test.ts` | Compare PDP prices EN vs NL | PASS |
| 13 | Concept products hidden in both locales | RLS + `products.ts` repo filters | DB seed DRAFT/`is_concept` | PASS (when DB seeded) |
| 14 | Form locale validated (`en`\|`nl` only) | `i18n.test.ts` | POST with `locale=de` → falls back EN | PASS |
| 15 | EN form sends EN customer mail | `i18n.test.ts` | Submit contact EN (with Resend) | PASS (template unit) |
| 16 | NL form sends NL customer mail | `i18n.test.ts` | Submit contact NL | PASS (template unit) |
| 17 | Missing mail template falls back EN | `i18n.test.ts` | `undefined` locale → EN copy | PASS |
| 18 | Cart calculation locale-independent | `i18n.test.ts` | Same lines → same totals | PASS |
| 19 | Mollie amount identical across locale | Server-side checkout service | EN cart → NL switch → checkout | SKIPPED (needs live Mollie test) |
| 20 | Canonical and hreflang correct | `i18n.test.ts` (shop only) | View source on marketing pages | PARTIAL (shop PASS; most pages canonical-only) |
| 21 | Preview stays noindex | Middleware `X-Robots-Tag` | Preview deployment headers | PASS (when `VERCEL_ENV=preview`) |
| 22 | Language switcher at 320px | E2E | 320×568 viewport test | PASS |
| 23 | Dutch text no horizontal overflow | — | NL pages at 320–430px | SKIPPED (manual / screenshot run pending) |
| 24 | Cookie consent translated | E2E EN | NL cookie banner copy | PARTIAL (E2E covers EN only) |
| 25 | Legal pages exist both locales | E2E | 200 for `/privacy` and `/nl/privacy` | PASS |
| 26 | Admin publication validation blocks incomplete NL | Admin products badges | `/admin/products` advice display | PASS (advisory; no auto-publish) |
| 27 | MFA and AAL2 remain active | Access-control tests | Login + MFA flow | PASS (unchanged by i18n) |
| 28 | Access-control tests pass | `npm run test:access-control` | CI/local run | SKIPPED (requires run) |
| 29 | RLS tests pass | `npm run db:test-rls` | Live Supabase | SKIPPED (requires DB) |
| 30 | Build passes | `npm run build` | Full build gate | SKIPPED (requires run) |

## Section checklists (QA brief sections 1–13)

### 1. Route parity

- [ ] Every row in [`I18N_ROUTE_MATRIX.md`](./I18N_ROUTE_MATRIX.md) returns 200 EN and NL
- [ ] Language switch never drops to homepage when equivalent exists
- [ ] `/nl/admin` redirects to `/admin`

### 2. Language switcher

- [ ] Active language highlighted (EN on root, NL under `/nl`)
- [ ] Header desktop, mobile menu, and footer switchers behave identically
- [ ] Safe query params preserved; sensitive params stripped
- [ ] Keyboard focus visible; `aria-label` / `hrefLang` present
- [ ] Touch targets ≥ ~44px (`min-h-11 min-w-11`)

### 3. Runtime translation coverage

- [ ] Nav, buttons, forms, cart, checkout, consent, errors use `t()`
- [ ] No `nav.*`, `forms.*`, `checkout.*` visible in DOM
- [ ] Hardcoded brand/technical names only where intentional

### 4. Content quality (human review)

- [ ] EN reads as premium European B2B software copy
- [ ] NL reads natural (not literal EN translation)
- [ ] Consistent tone: EN “you/your business”; NL “je/jouw bedrijf”
- [ ] CTAs equivalent in intent (`request a proposal` ↔ `vraag een voorstel aan`)

### 5. Product localisation

- [ ] All 16 products per [`PRODUCT_TRANSLATION_REVIEW.md`](./PRODUCT_TRANSLATION_REVIEW.md)
- [ ] Slugs unchanged; prices unchanged
- [ ] No automatic publish

### 6. Forms

- [ ] Contact, quote, support — labels, validation, success in both locales
- [ ] Server stores validated locale on submission

### 7. Emails

- [ ] All customer families have EN + NL (`templates.ts`)
- [ ] Internal notifications show locale
- [ ] HTML escaped; plain-text present

### 8. Cart & checkout

- [ ] Same product IDs and cent amounts EN vs NL
- [ ] Quote-only products rejected at checkout
- [ ] Success/cancelled pages use dictionary strings

### 9. SEO & hreflang

- [ ] See [`SEO.md`](./SEO.md)
- [ ] Sitemap lists both language variants

### 10. Mobile QA

- [ ] See [`MOBILE_QA.md`](./MOBILE_QA.md)

### 11. Screenshot QA

- [ ] **SKIPPED** — no Playwright screenshot artifacts committed yet

### 12. Accessibility

- [ ] `lang` on `<html>`; switcher `role="group"` + labels
- [ ] 200% zoom and reduced-motion spot-check

### 13. Admin translation management

- [ ] Admin UI English-only
- [ ] Product completeness badges visible
- [ ] No auto-publish from translation advice

## Commands (build gate)

```powershell
npm run env:scan-secrets
npm run lint
npm run typecheck
npm run test
npm run test:access-control
npm run test:e2e
npm run build
npm run db:verify
npm run db:test-rls
```

## Related docs

- [`PUBLIC_ROUTE_QA.md`](./PUBLIC_ROUTE_QA.md) — per-route manual checks
- [`I18N_ROUTE_MATRIX.md`](./I18N_ROUTE_MATRIX.md) — route inventory
- [`MOBILE_QA.md`](./MOBILE_QA.md) — viewport checklist
