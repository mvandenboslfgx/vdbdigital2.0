# Catalogus release-status — 20 augustus 2026

## Verdict

`IMPLEMENTATIE GEREED — STAGING/PRODUCTIE GEBLOKKEERD OP OWNER-GATES`

De code is uitsluitend in lokale werk-kopieën gewijzigd. Er is geen remote
Supabase-migration toegepast, geen Storage-object geüpload, geen betaling
gestart en geen deployment of Git-push uitgevoerd.

## Live inventaris

| Scope | Live | Status |
|---|---:|---|
| Lokale migration proposal na eerste apply | 0 | Alle bestaande rijen krijgen `is_active = false`; niets wordt automatisch gepubliceerd. |
| Huidige staging | CLI-link `qzekuvmgfekzsowdecyk` | Alleen read-only geïdentificeerd; geen migration, upload of write. Ontbreekt in het gekoppelde MCP-projectoverzicht. |
| Huidige productie | `nhsrdnjfsxfikfbdmdfj` (`vdb nieuw`) | Enige project in het gekoppelde MCP-overzicht. Geen catalogusmigratie of write in deze opdracht. |

Daarom kan geen bestaand product eerlijk als live worden gerapporteerd. Na
staging-apply moet `list_public_catalog('nl')` en `list_public_catalog('en')`
de definitieve, exacte inventaris leveren.

## Geblokkeerde producten

| Product | Voorstel | Status | Reden |
|---|---|---|---|
| TV Streaming Jaarabonnement | €100/licentie/jaar; 1–3 licenties | `REVIEW`, inactive | Leverancier- en contentrechten nog niet aangetoond; juridische status is `LEGAL_REVIEW_REQUIRED`; primaire Storage-media is nog niet geüpload; `publication_ready` is false. |
| Alle reeds bestaande databaseproducten | Bestaande data | Inactive na proposal-apply | Moeten per product door de nieuwe NL/EN-, prijs-, legal-, categorie- en mediacheck en daarna expliciet opnieuw worden gepubliceerd. |
| Historische statische software/commercial-items | Niet langer runtime catalogus | Niet live via publieke catalogus | Geen gevalideerde Supabase-productrij; statische bestanden zijn geen publicatiebron. |

## Gerealiseerd

- gedeelde Supabase-publicatiepredicate en RLS voor producten, categorieën,
  vertalingen, media en Storage;
- publieke en partner-RPC's die exact dezelfde goedgekeurde catalogus projecteren;
- productkaarten met afbeeldingen, categorie, prijs per eenheid/periode en CTA;
- quantity 1..N op website, mobiele app en partnerleads;
- server-side quantity/prijscontrole en immutable order-/leadsnapshots;
- admin upload naar Supabase Storage, complete publish-checklist en fail-closed
  herbeoordeling na wijzigingen;
- NL/EN-productcopy en responsive web/native kaartlayout;
- lokale fallbackafbeelding plus een gegenereerde seed-afbeelding voor de latere
  staging-upload.

## Verificatie

- Website typecheck: geslaagd.
- Website lint: geslaagd.
- Definitieve catalogusgerichte webtests: 89/89 geslaagd.
- Volledige webtests: 482/484 in de eerste parallelle run. De twee uitvallers
  kwamen door de Windows-sandbox (`os.userInfo()` en Git safe-directory) en
  zijn daarna geïsoleerd buiten die beperking met 13/13 geslaagd.
- Websiteproductiebundel: geslaagd met Next/Webpack. De lokale `node_modules`-
  koppeling wordt door Turbopack buiten de projectroot geweigerd.
- Productie-browser-smoke: `/shop` desktop/mobiel, `/shop/software` mobiel en
  `/nl/shop` mobiel alle 200; geen console-/paginafouten, oude 0/12-placeholder,
  erroroverlay of horizontale overflow.
- Bestaande website-E2E-suite, bijgewerkt voor de Supabasecatalogus: 24/24 geslaagd.
- Mobiele typecheck/lint: geslaagd.
- Mobiele suite: 416/416 geslaagd; Jest hield daarna een bestaande open handle
  vast en is na de uitslag gestopt. Nieuwe catalogusrepositorytests: 2/2 geslaagd.
- Lokale Android Expo-export: geslaagd (3315 modules); tijdelijk exportartefact
  daarna verwijderd.
- Partner typecheck/lint: geslaagd; lint heeft alleen 8 bestaande testwarnings.
- Definitieve partnersuite: 97/97 geslaagd.
- Partnerproductiebundel: geslaagd.
- SQL/RLS-runtimecontrole: nog niet uitgevoerd, omdat Docker Desktop/lokale
  Supabase niet actief is.

## Vereiste owner-stappen

1. Migration reviewen en op een lokale Supabase-reset toepassen.
2. RLS-matrix als anon, customer, active partner en admin uitvoeren.
3. Bevestigde staging-projectref gebruiken en de migration daar expliciet goedkeuren.
4. De gegenereerde afbeelding met het guarded uploadscript naar staging uploaden.
5. Bewijs van leverancier/contentrechten vastleggen; legal en publication-ready
   pas daarna goedkeuren.
6. Product via admin publiceren en de NL/EN-inventaris, website, app en
   partnerportaal opnieuw smoke-testen.
7. Productie pas daarna als aparte ownerbeslissing behandelen; Mollie/live
   betalingen blijven buiten scope.
