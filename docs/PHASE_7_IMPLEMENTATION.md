# Phase 7 — Implementatiestatus

**Startdatum:** 2026-07-15  
**Audit:** zie [PHASE_7_FRONTEND_AUDIT.md](./PHASE_7_FRONTEND_AUDIT.md)

## Afgerond in deze ronde

- Design tokens (grafiet / primary `#4E73FF` / secondary cyan)
- Typografie: Sora (display) + Plus Jakarta Sans (body) + JetBrains Mono
- Hero met logo-as-brand, CTA’s Offerte/Shop, eerlijke illustratie
- Pillars in het Nederlands (Bouwen / Automatiseren / Groeien)
- Site-config: geen `[placeholder]` meer; bedrijfsgegevens via optionele env
- Footer: cookievoorkeuren, social alleen indien URL, locatie conditioneel
- Header: Offerte-CTA, cart badge, body-scroll lock mobiel
- Shop categoriefillers werkend
- Conceptprijs-banner verwijderd van klant-UI
- Winkelwagen qty +/- 
- Offerte `?product=` prefill
- Cases eerlijk geherpositioneerd (oplossingstypes)
- Legal: conceptfooters weg; complete NL-tekst + lastUpdated
- 404 met marketing chrome
- JSON-LD Organization; sitemap cases
- Marketing loading + error boundaries
- Admin mobiele navigatie
- Form inputs op lichte cards lichter gestyled
- Mobile-first afwerking — zie [MOBILE_FIRST.md](./MOBILE_FIRST.md)

## Nog / vervolg

- Echte KvK/adres/telefoon via Vercel env (`NEXT_PUBLIC_COMPANY_*`)
- Juridische review door advocaat (inhoud is operationeel, niet juridisch gecertificeerd)
- Productafbeeldingen toevoegen aan productmodel + UI
- Admin CRUD-schermen verder uitwerken (nu nog deels stub)
- Live preview acceptatie tests na deploy

## Env-aanvullingen (optioneel publiek)

```
NEXT_PUBLIC_CONTACT_EMAIL
NEXT_PUBLIC_SUPPORT_EMAIL
NEXT_PUBLIC_PRIVACY_EMAIL
NEXT_PUBLIC_COMPANY_KVK
NEXT_PUBLIC_COMPANY_VAT
NEXT_PUBLIC_COMPANY_ADDRESS
NEXT_PUBLIC_COMPANY_CITY
NEXT_PUBLIC_COMPANY_PHONE
NEXT_PUBLIC_SOCIAL_LINKEDIN
NEXT_PUBLIC_SOCIAL_INSTAGRAM
NEXT_PUBLIC_WHATSAPP_NUMBER
```
