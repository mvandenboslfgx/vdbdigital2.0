# Phase 7 — Frontend Audit

**Datum:** 2026-07-15  
**Scope:** Publieke website, shop, juridische pagina’s, admin UI  
**Doel:** Commercieel en visueel afmaken als premium Nederlands software- & digitaliseringsbedrijf

## Samenvatting

De site heeft een werkende App Router-structuur, shopflow, formulieren en securityfundament. Visueel en commercieel is hij **nog niet launch-ready**: merkgegevens bevatten letterlijke placeholders, juridische pagina’s markeren zichzelf als concept, cases zijn expliciet leeg, en de look leunt te sterk op generieke dark/indigo + Geist.

**Oordeel na audit:** implementatie van Phase 7-verbeteringen gestart op basis van onderstaande rankings.

---

## Routes geïnspecteerd

| Groep | Routes |
| --- | --- |
| Marketing | `/`, `/solutions(+6)`, `/cases`, `/cases/[slug]`, `/process`, `/about`, `/contact`, `/quote`, `/support` |
| Shop | `/shop`, `/shop/[slug]`, `/cart`, `/checkout`, `/checkout/success`, `/checkout/cancelled` |
| Legal | `/privacy`, `/cookies`, `/terms`, `/refund-policy` |
| Admin | `/admin`, `/admin/*`, MFA, login |
| Systeem | `not-found`, robots, sitemap |

---

## Bevindingen

### Kritiek

| ID | Probleem | Locatie |
| --- | --- | --- |
| K1 | Letterlijke company placeholders in UI (`[KVK-nummer invullen]`, adres, e-mail) | `src/config/site.ts`, footer, legal |
| K2 | Juridische pagina’s eindigen met “concepttekst — review vóór publicatie” | privacy, cookies, AV, refund |
| K3 | Conceptprijsdisclaimer op klantgerichte shop | shop list + PDP |

### Hoog

| ID | Probleem | Locatie |
| --- | --- | --- |
| H1 | Cases zijn placeholders, geen bewijs | cases pages + homepage section |
| H2 | Shop categoriefillers (`?categorie=`) worden niet gelezen | `shop/page.tsx` |
| H3 | WhatsApp/contactkanalen incompleet of placeholder | site.ts, contact, WhatsApp-button |
| H4 | Cookievoorkeuren: heropenen beloofd in footer, niet wired | cookies page vs `openPreferences` |
| H5 | 404 zonder marketing chrome | `not-found.tsx` |
| H6 | Admin stubs + geen mobiele navigatie | admin layout/pages |
| H7 | Generieke SaaS-look (Geist + indigo + mock dashboard) | globals, hero, layout |

### Middel

| ID | Probleem |
| --- | --- |
| M1 | Geen productafbeeldingen |
| M2 | Winkelwagen: geen qty-stepper, geen badge-count |
| M3 | Offerte `?product=` wordt genegeerd |
| M4 | Popular products: geen empty state |
| M5 | Sitemap mist case-slugs |
| M6 | Geen JSON-LD |
| M7 | Geen `loading.tsx` / `error.tsx` |
| M8 | Formulierinputs op lichte secties te “donker” |
| M9 | Engelse pillars (“Build / Automate / Grow”) |
| M10 | Hero: merk te zwak (eyebrow i.p.v. hero-brand) |

### Laag

| ID | Probleem |
| --- | --- |
| L1 | Social links in config, niet gerenderd |
| L2 | Offerte niet in primary nav |
| L3 | Support-succesbericht te kaal |
| L4 | Checkout: optioneel adres zonder uitleg (digital goods) |

---

## Visuele richting (doel)

- Donkere hero + softwaresecties; lichte contentsecties
- Tokens: grafiet, primary `#4E73FF`, secondary accent `#31C4E8`
- Expressieve typografie (geen Geist als enige merksignaal)
- Scherpe surfaces, ademruimte, subtiele motion
- Geen verzonnen reviews, klanten of keurmerken
- Cases eerlijk positioneren tot echte toestemming beschikbaar is

---

## Uitvoeringsvolgorde

1. Design tokens + typografie + motion
2. Site-config (placeholders weg, conditionele weergave)
3. Navigatie / footer / cookie reopen / cart badge
4. Homepage + marketingpagina’s herschrijven
5. Shopfilters, cart qty, offerte-prefill
6. Legal + cases + 404 chrome
7. Metadata / JSON-LD / sitemap
8. Admin polish (mobile nav + emptystates)
9. Loading/error boundaries

---

## Status

| Item | Status |
| --- | --- |
| Auditdocument | DONE |
| Implementatie Phase 7 | IN PROGRESS |
