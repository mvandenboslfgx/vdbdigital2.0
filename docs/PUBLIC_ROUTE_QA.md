# Public route QA (EN / NL)

Manual checklist for every public route. Pair with [`I18N_ROUTE_MATRIX.md`](./I18N_ROUTE_MATRIX.md).

**How to test**

1. Open the English URL → confirm `html[lang="en"]`, copy in English, no raw keys.
2. Open the Dutch URL → confirm `html[lang="nl"]`, UI in Dutch.
3. Use the language switcher → confirm equivalent path (and safe query params).
4. Check title tag and visible H1 match locale.

Status key: ✅ expected | ⚠️ known gap

## Home & marketing

| Route (EN → NL) | EN UI | NL UI | Switch | Notes |
| --- | --- | --- | --- | --- |
| `/` → `/nl` | ✅ | ✅ | ✅ | Hero, sections via dictionary |
| `/solutions` → `/nl/solutions` | ✅ | ✅ | ✅ | Copy from `solutions.ts` |
| `/solutions/websites` → `/nl/solutions/websites` | ✅ | ✅ | ✅ | |
| `/solutions/webshops` → `/nl/solutions/webshops` | ✅ | ✅ | ✅ | |
| `/solutions/ai-automation` → `/nl/solutions/ai-automation` | ✅ | ✅ | ✅ | |
| `/solutions/whatsapp-ai` → `/nl/solutions/whatsapp-ai` | ✅ | ✅ | ✅ | |
| `/solutions/livechat` → `/nl/solutions/livechat` | ✅ | ✅ | ✅ | |
| `/solutions/reviewflows` → `/nl/solutions/reviewflows` | ✅ | ✅ | ✅ | |
| `/for-business` → `/nl/for-business` | ✅ | ✅ | ✅ | |
| `/process` → `/nl/process` | ✅ | ✅ | ✅ | |
| `/about` → `/nl/about` | ✅ | ✅ | ✅ | |
| `/cases` → `/nl/cases` | ✅ | ✅ | ✅ | |
| `/cases/conversie-website` → `/nl/cases/…` | ✅ | ✅ | ✅ | Same slug both locales |
| `/cases/premium-webshop` → `/nl/cases/…` | ✅ | ✅ | ✅ | |
| `/cases/whatsapp-automatisering` → `/nl/cases/…` | ✅ | ✅ | ✅ | |
| `/cases/reviewflow-setup` → `/nl/cases/…` | ✅ | ✅ | ✅ | |

## Shop & checkout

| Route (EN → NL) | EN UI | NL UI | Switch | Notes |
| --- | --- | --- | --- | --- |
| `/shop` → `/nl/shop` | ✅ | ✅ | ✅ | Shop metadata uses full hreflang |
| `/shop/starter-website` → `/nl/shop/starter-website` | ✅ | ✅ | ✅ | NL overlay; slug unchanged |
| `/shop/business-website` → `/nl/shop/…` | ✅ | ✅ | ✅ | |
| `/shop/premium-website` → `/nl/shop/…` | ✅ | ✅ | ✅ | |
| `/shop/conversiegerichte-landingspagina` → `/nl/shop/…` | ✅ | ✅ | ✅ | |
| `/shop/complete-webshop` → `/nl/shop/…` | ✅ | ✅ | ✅ | |
| `/shop/website-redesign` → `/nl/shop/…` | ✅ | ✅ | ✅ | |
| `/shop/whatsapp-ai-starter` → `/nl/shop/…` | ✅ | ✅ | ✅ | |
| `/shop/whatsapp-ai-business` → `/nl/shop/…` | ✅ | ✅ | ✅ | |
| `/shop/tawk-to-livechat-installatie` → `/nl/shop/…` | ✅ | ✅ | ✅ | |
| `/shop/reviewflow-setup` → `/nl/shop/…` | ✅ | ✅ | ✅ | |
| `/shop/afsprakenautomatisering` → `/nl/shop/…` | ✅ | ✅ | ✅ | |
| `/shop/maandelijks-websitebeheer` → `/nl/shop/…` | ✅ | ✅ | ✅ | |
| `/shop/technisch-onderhoud` → `/nl/shop/…` | ✅ | ✅ | ✅ | |
| `/shop/conversie-audit` → `/nl/shop/…` | ✅ | ✅ | ✅ | |
| `/shop/supporturen-bundel` → `/nl/shop/…` | ✅ | ✅ | ✅ | |
| `/shop/maatwerk-digitalisering` → `/nl/shop/…` | ✅ | ✅ | ✅ | |
| `/cart` → `/nl/cart` | ✅ | ✅ | ✅ | Prices locale-independent |
| `/checkout` → `/nl/checkout` | ✅ | ✅ | ✅ | |
| `/checkout/success` → `/nl/checkout/success` | ✅ | ✅ | ✅ | `robots: noindex` |
| `/checkout/cancelled` → `/nl/checkout/cancelled` | ✅ | ✅ | ✅ | `robots: noindex` |

## Forms

| Route (EN → NL) | EN UI | NL UI | Switch | Notes |
| --- | --- | --- | --- | --- |
| `/contact` → `/nl/contact` | ✅ | ✅ | ✅ | Form + confirmation mail locale |
| `/quote` → `/nl/quote` | ✅ | ✅ | ✅ | `?product=` preserved on switch |
| `/support` → `/nl/support` | ✅ | ✅ | ✅ | |

## Legal

| Route (EN → NL) | EN UI | NL UI | Switch | Notes |
| --- | --- | --- | --- | --- |
| `/privacy` → `/nl/privacy` | ✅ | ⚠️ | ✅ | NL route OK; **body still English** |
| `/cookies` → `/nl/cookies` | ✅ | ⚠️ | ✅ | Same |
| `/terms` → `/nl/terms` | ✅ | ⚠️ | ✅ | Same |
| `/refund-policy` → `/nl/refund-policy` | ✅ | ⚠️ | ✅ | Same |

## Global chrome (every public page)

- [ ] Header nav labels match locale
- [ ] Footer links and legal links use `LocaleLink`
- [ ] Language switcher in header (desktop + mobile) and footer
- [ ] Cookie banner strings match locale
- [ ] WhatsApp fallback link visible
- [ ] Skip link translated (`common.skipToContent`)

## Legacy redirects

Verify **308** to modern paths:

- [ ] `/oplossingen` → `/solutions` (and `/nl/oplossingen` → `/nl/solutions`)
- [ ] `/offerte` → `/quote`
- [ ] `/winkelwagen` → `/cart`
- [ ] `/algemene-voorwaarden` → `/terms`

## Admin (out of scope for NL content)

- [ ] `/admin` redirects unauthenticated users to `/admin/login`
- [ ] `/nl/admin` → **308** → `/admin`
- [ ] Admin UI remains English

## Automated smoke tests

```powershell
npm run test:e2e
```

Covers: EN/NL homepage, switcher route preservation, product query preservation, shop, forms (EN), legal 200s, 320px switcher, admin login redirect.
