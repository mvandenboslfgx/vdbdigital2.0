# VDB Digital Software — Beoordelingsdossier

**Datum:** 15 juli 2026  
**Project:** `vdbdigital2.0`  
**Domein:** https://vdbdigital.nl  
**Status:** Commercial website technisch compleet — prijsgoedkeuring en juridische review vereist  

Dit ene document is bedoeld om te laten beoordelen: wat er is gebouwd, welke keuzes zijn gemaakt, welke prijzen als concept staan, wat nog niet gepubliceerd mag worden, en wat jij (Matthijs) nog moet beslechten.

---

## 1. Kort oordeel

| Onderdeel | Oordeel |
|---|---|
| Technische basis (Next.js, security, Supabase, Mollie, i18n) | Sterk en behouden |
| Commerciële website (homepage, solutions, shop, quote) | Grotendeels compleet |
| Prijzen op de site | Concept / DRAFT — nog niet definitief publiceren |
| Founding Client Offer | Architectuur klaar, campagne UIT |
| Vermeulen Bouwservice-case | Alleen conceptstructuur, NIET publiek |
| B2C checkout / consumentenrecht | **Juridische review vereist vóór productie** |
| Production deployment | **Nog niet** — geen live Mollie productie |

**Eindstatus codebase:** COMMERCIAL WEBSITE COMPLETE — LEGAL REVIEW REQUIRED

---

## 2. Merk en positionering (bevestigd)

| | English | Nederlands |
|---|---|---|
| Merknam | **VDB Digital Software** | **VDB Digital Software** |
| Tagline | Software built around your business. | Software gebouwd rond jouw bedrijf. |
| Primaire CTA | Schedule an introduction | Plan een kennismaking |

**Wat VDB Digital Software is**
- software company
- custom web studio
- automation specialist
- digital partner met doorlopende support

**Waarden:** snel, persoonlijk, maatwerk in code, toegankelijk, betrouwbaar, schaalbaar, technisch sterk, commercieel praktisch.

**Kernonderscheid:** eerst luisteren naar wat de klant echt nodig heeft, daarna maatwerk bouwen — geen standaardtemplate kopiëren.

**Niet positioneren als:** goedkope templatebouwer, standaard WordPress-bureau, advertentiebureau, dropshipping, fictief groot team, “100% automatisch zonder toezicht”.

**Wel aanbieden:** technische SEO, SEO-vriendelijke bouw, contentstructuur, CTA/conversie, onderhoud, automatisering, reviewflows, WhatsApp, planning, support.  
**Nog niet:** volledig advertentiebeheer.

**Talen:** English-first op `/` · Nederlands op `/nl` · American English · NL met *je/jouw* · admin English-first.

---

## 3. Doelgroep

Bedrijven én consumenten met legitieme digitale projecten: starters, MKB, dienstverleners, bouw/installatie, webshops, personal brands, portfolio’s, grotere klanten.

Geen illegale of misleidende activiteiten. Geen teksten die kleine klanten afwijzen.

---

## 4. Wat technisch gebouwd is (samenvatting)

### 4.1 Platform (al eerder aanwezig, niet verzwakt)

- Next.js App Router, TypeScript strict
- Supabase + RLS + server-side authorization
- MFA / TOTP / AAL2, RBAC, object-level auth, audit logging
- Mollie (server-side prijzen, veilige webhook)
- Resend (transactionele e-mail)
- Vercel (Preview Protection / noindex op Preview)
- Secret scanning, CSRF/origin checks, veilige cookies/redirects

### 4.2 Commercieel opgeleverd in deze sprints

| Onderdeel | Wat er staat |
|---|---|
| Centrale pricing | `src/config/commercial/pricing.ts` — bedragen in **eurocenten**, btw server-side |
| Websitepakketten | Onepage, Launch, Growth, Custom |
| Webshop Launch | Apart product met from-prijs |
| Care-pakketten | Essential, Business, Growth, Digital Partner |
| Bundles | Website Launch System, Business Growth System, Webshop Launch System, Automation System, Digital Partner |
| Founding Client Offer | Max 10, server-side slots, geen nep-countdown, default UIT |
| Booking | Cal.com / Google / Calendly / externe URL — veilige validatie + fallback naar contact/quote/WhatsApp/e-mail |
| Homepage | Hero, problemen, solutions, pakketten met duale btw-prijs, founding, proces (8 stappen), cases, producten, FAQ, CTA |
| Solution pages | Custom websites, webshops, AI & automation, WhatsApp AI, live chat, review flows, appointment automation, website maintenance, technical support, conversion optimisation, custom software (+ aliases) |
| Shop | Zoeken, filters, packages/bundles, productkaarten, geen fake scarcity |
| Quote flow | Meerstaps: klanttype → contact → bedrijf → project → planning → consent (consent nooit vooraf aangevinkt) |
| Cases | Vermeulen DRAFT (niet publiek); interne platformcase; demonstraties met label Demonstration / Demonstratie |
| Visuals | Website preview/architecture, mobile, conversion, webshop checkout, WhatsApp AI, automation, review, appointment, maintenance, admin dashboard |
| Admin | Products + Settings readiness; Offers (founding review); Cases (catalogus + blockers) |
| Tests | Unit + access-control + E2E groen; screenshot QA-artifacts aanwezig |
| Documentatie | Prijsmatrix, legal checklist, quote/shop/bundle/founding/care/case docs |

---

## 5. Websitepakketten (scope + conceptprijzen)

### 5.1 Onepage Website
- 1 complete commerciële pagina, custom layout, responsive, CTA, 1 formulier
- Technische SEO-basis, performancebasis, 1 taal, legal links, launch support, 1 revisieronde
- **B2B:** vanaf €995 excl. btw  
- **B2C:** vanaf €1.203,95 incl. 21% btw  

### 5.2 Launch Website
- Max 3 pagina’s, maatwerkdesign, SEO, conversieflow, formulieren, 1 taal, 2 revisierondes
- **B2B:** vanaf €1.695 excl. btw  
- **B2C:** vanaf €2.050,95 incl. 21% btw  

### 5.3 Growth Website
- Max 7 pagina’s, sterkere structuur, meerdere CTA’s, on-page SEO-basis, 3 revisierondes
- **B2B:** vanaf €2.995 excl. btw  
- **B2C:** vanaf €3.623,95 incl. 21% btw  

### 5.4 Custom Website — **alleen via voorstel**
- Portals, dashboards, auth, automation, maatwerkdatabases/admin — na analyse
- **B2B:** vanaf €5.000 excl. btw  
- **B2C:** vanaf €6.050 incl. 21% btw  
- Geen automatische checkout voor complexe custom-projecten

**Niet standaard inbegrepen (tenzij afgesproken):** volledige branding, zware copywriting, meerdere talen, complexe integraties, webshop (tenzij webshop-pakket), AI-campagne, advertentiebeheer.

---

## 6. Webshop Launch (conceptprijs)

- Custom storefront, cart, checkout, Mollie, ordermails, product/categorieën, technische SEO, 1 taal, launch support
- **B2B:** vanaf €3.995 excl. btw  
- **B2C:** vanaf €4.833,95 incl. 21% btw  
- Complexere shops = proposal-only

---

## 7. Onderhoud / Care (conceptprijzen)

| Pakket | Excl. btw / maand | Incl. 21% btw | Uren kleine wijzigingen |
|---|---|---|---|
| Essential Care | €69 | €83,49 | 0 |
| Business Care | €129 | €156,09 | max 1 uur |
| Growth Care | €249 | €301,29 | max 3 uur |
| Digital Partner | vanaf €500 | vanaf €605 | proposal-only |

**Beleid:** ongebruikte uren max 1 maand meenemen; nooit onbeperkt opsparen; geen 24/7 SLA zonder apart contract; externe providerkosten apart.

---

## 8. Bundels (concept)

| Bundel | Indicatie | Opmerking |
|---|---|---|
| Website Launch System | vanaf €1.695 excl. btw | Launch website + SEO/form/hosting-setup + optioneel onderhoud |
| Business Growth System | vanaf €3.495 excl. btw | Growth + sterkere SEO + review/lead/follow-up + onderhoudsoptie |
| Webshop Launch System | vanaf €3.995 excl. btw | Webshop + Mollie + e-mails + structuur + onderhoudsoptie |
| Automation System | proposal-only | WhatsApp AI, planning, handover, monitoring — maatwerk |
| Digital Partner | proposal-only | website/webshop + automation + onderhoud + strategy |

Geen automatische bundelkorting zolang kortingsgoedkeuring ontbreekt.

---

## 9. Founding Client Offer (concept — niet publiek actief)

- Maximaal **10** founding clients
- Campagne standaard **UIT** (`FOUNDING_CLIENT_ENABLED=0`)
- Geen nep-countdown, geen agressieve schaarste, geen korting afhankelijk van positieve review
- Case/review alleen met aparte toestemming

| Pakket | Regulier excl. | Founding excl. (DRAFT) | Extra (concept) |
|---|---|---|---|
| Onepage | €995 | €895 | 1 maand Essential Care |
| Launch | €1.695 | €1.525 | 2 maanden Essential Care |
| Growth | €2.995 | €2.695 | 3 maanden Essential Care + eenvoudige reviewflow |
| Custom | vanaf €5.000 | Geen vaste % | discovery / analyse / credit in voorstel |

**Besluit nodig:** benefits en bedragen goedkeuren vóór inschakelen.

---

## 10. Betaling en B2B / B2C

### B2B maatwerk (configureerbaar, niet voor consumenten)
- 70% vóór start
- 30% na goedgekeurde oplevering
- Eindoverdracht na volledige betaling

### B2C — **LEGAL REVIEW REQUIRED BEFORE B2C PRODUCTION**
- Prijzen inclusief btw tonen
- Geen vooraf aangevinkte toestemming
- Bedenktijd / start binnen bedenktijd expliciet
- Versies voorwaarden/privacy + timestamp + locale opslaan
- Publicatie geblokkeerd in code via `canPublishForB2c()` tot legal status goedgekeurd is

Product juridische types (config): standard service, custom service, digital content, subscription, maintenance, support bundle, consultancy, immediate service, mixed product.

---

## 11. Cases

### Vermeulen Bouwservice
- Status: **DRAFT** — niet zichtbaar op publieke site
- Nog nodig: content EN/NL, URL, screenshots, logo-toestemming, case-toestemming, geen verzonnen metrics
- Checklist: `docs/VERMEULEN_CASE_CONTENT_CHECKLIST.md`

### Demonstraties (wel zichtbaar, duidelijk gelabeld)
- VDB Digital Software platform (intern)
- WhatsApp AI, webshop, review flow  
- Label: **Demonstration** / **Demonstratie** — geen nepklanten, geen nepomzet

---

## 12. Primaire routes om te beoordelen

**English**
- `/` homepage  
- `/solutions/*` (websites, webshops, ai-automation, whatsapp-ai, livechat, reviewflows, appointment-automation, website-maintenance, technical-support, conversion-optimisation, custom-software)  
- `/shop` · `/quote` · `/contact` · `/cases` · `/process` · `/about` · `/support`

**Dutch:** zelfde paden onder `/nl/...`

**Admin (English):** `/admin` · products · offers · cases · settings

---

## 13. Wat je ziet vs. wat nog concept is

| Zichtbaar / beschikbaar | Mag nog NIET als definitief behandeld worden |
|---|---|
| Pakketnamen en startprijzen op homepage/shop | Prijzen als goedgekeurde verkoopprijzen |
| Founding-architectuur (uit) | Founding-korting online zetten |
| Demo-cases | Vermeulen als echte klantcase |
| Quote/contact flows | B2C checkout live zonder legal review |
| Concept-seedproducten in lokale shop-fallback | Auto-publicatie in productie |

Seedproducten in de database staan als **DRAFT + is_concept** en blijven via RLS/publicatiefilters beschermd.

---

## 14. Build- en QA-stand (laatste bekende run)

| Check | Resultaat |
|---|---|
| Secret scan | PASS |
| Lint | PASS |
| Typecheck | PASS |
| Unit tests | PASS |
| Access-control tests | PASS |
| E2E | PASS |
| Build | PASS |
| Mobile/desktop screenshots | Artifacts in `test-results/screenshots/` |
| Database verify | PASS (met herstelde `.env.local`) |
| Live RLS tests | Uitvoeren alsnog aanbevolen na env-herstel |
| Preview deployment | Nog niet in deze afronding |
| Production deployment | **Niet gedaan / niet gevraagd** |

---

## 15. Wat Matthijs moet beoordelen / beslissen

### Prijzen (goedkeuren, aanpassen of afwijzen)
- [ ] Onepage €995 / €1.203,95  
- [ ] Launch €1.695 / €2.050,95  
- [ ] Growth €2.995 / €3.623,95  
- [ ] Custom vanaf €5.000 / €6.050  
- [ ] Webshop Launch vanaf €3.995 / €4.833,95  
- [ ] Care €69 / €129 / €249 / vanaf €500  
- [ ] Bundels €1.695 / €3.495 / €3.995 / proposal  
- [ ] Founding-bedragen €895 / €1.525 / €2.695  

### Juridisch
- [ ] B2C teksten, bedenktijd, consentflows  
- [ ] Voorwaarden / privacy / refund pages naar productie  
- [ ] Legal status per producttype  

### Bedrijfsgegevens / providers
- [ ] KvK, btw-nummer, publiek adres, telefoon  
- [ ] Booking URL (Cal.com / Calendly / Google)  
- [ ] tawk Widget ID (optioneel)  
- [ ] Bevestigen Resend/Mollie webhook in env  

### Content
- [ ] Vermeulen: content + toestemmingen + screenshots  
- [ ] Founding campagne: wel/niet aan, benefits finaal  

### Publicatie
- [ ] Welke catalog-items van DRAFT → APPROVED → PUBLISHED  
- [ ] Welke seedproducten echt in de shop mogen  

---

## 16. Expliciete risico’s voor de beoordelaar

1. **Conceptprijzen** staan al in de UI als “vanaf”-prijzen — nog zonder formele goedkeuringsstatus `PUBLISHED`.  
2. **B2C** is architectonisch voorbereid maar **niet** juridisch vrijgegeven.  
3. **Vermeulen** mag niet online alsof goedgekeurd.  
4. **Founding-korting** mag niet tonen tot campaign + bedragen goedgekeurd.  
5. Geen claims: gegarandeerde omzet, rankings, “hacker-proof”, “beste van de wereld”.

---

## 17. Gevraagde actie na beoordeling

Gelieve dit dossier te retourneren met per sectie 15:

- **GOEDGEKEURD**  
- **AANPASSEN:** …  
- **AFWIJZEN:** …  
- **LATER:** …

Daarna kan de codebase statuses bijwerken, founding (eventueel) inschakelen, Vermeulen publiceren (alleen na toestemming), en een **Preview**-deployment volgen — pas daarna production review.

---

## 18. Bestanden voor wie dieper wil kijken

| Onderwerp | Pad |
|---|---|
| Dit overzicht | `docs/BEOORDELINGSDOSSIER.md` |
| Prijsmatrix | `docs/PRICING_DECISION_MATRIX.md` |
| B2B/B2C regels | `docs/B2B_B2C_COMMERCE_RULES.md` |
| Legal checklist | `docs/LEGAL_REVIEW_CHECKLIST.md` |
| Pakketscope | `docs/WEBSITE_PACKAGE_SCOPE.md` |
| Care | `docs/CARE_PACKAGE_SCOPE.md` |
| Founding | `docs/FOUNDING_CLIENT_OFFER.md` |
| Bundels | `docs/BUNDLE_ARCHITECTURE.md` |
| Quote | `docs/QUOTE_FLOW.md` |
| Shop QA | `docs/SHOP_QA.md` |
| Vermeulen checklist | `docs/VERMEULEN_CASE_CONTENT_CHECKLIST.md` |
| Pricing-code | `src/config/commercial/pricing.ts` |

---

*Einde beoordelingsdossier — VDB Digital Software — 15 juli 2026*
