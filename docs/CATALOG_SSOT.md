# Catalogus-SSOT

Supabase is de enige runtime source of truth voor productnamen, omschrijvingen,
prijzen, prijsperiodes, categorieën, publicatiestatus, aantallen, afbeeldingen en
partnerbeschikbaarheid. Website, mobiele app en partnerportaal mogen geen
hardcoded productinventaris als publieke fallback gebruiken.

## Publieke publicatieregel

Een product is alleen publiek als alle onderstaande voorwaarden tegelijk waar
zijn:

- `status = PUBLISHED`, `is_active = true` en `is_concept = false`;
- de categorie is actief;
- `publication_ready = true`;
- prijsstatus is `APPROVED` of `PUBLISHED`;
- juridische status is expliciet goedgekeurd voor B2B, B2C of beide;
- prijsmodus, bedrag, valuta en quantity-grenzen zijn valide;
- volledige Nederlandse én Engelse vertaling is aanwezig;
- een primaire `product_media`-rij met NL/EN-alttekst is aanwezig;
- het Storage-object staat in de private bucket `product-media`.

De functie `private.catalog_product_is_public(product_id)` bewaakt deze regel.
RLS, `list_public_catalog` en `list_partner_catalog` gebruiken dezelfde
fail-closed predicate. Een onvolledig product levert dus geen publieke rij op.

## Consumers

- Website: serverrepository `public-shop-catalog`; `/shop`,
  `/shop/software`, productdetails en marketingprijskaarten gebruiken dezelfde
  Supabase-producten.
- Mobiele app: RPC `list_public_catalog(p_locale)` en signed Storage-URL's.
- Partnerportaal: RPC `list_partner_catalog(p_locale)`, uitsluitend voor een
  actieve partner en uitsluitend als extra partnerinstellingen actief zijn.

Oude bestanden onder `src/config/commercial` en
`src/config/software-catalog` zijn historische/interne configuratie. Ze zijn
geen runtime catalogus, mogen niet als fallback worden geïmporteerd in een
publieke productroute en mogen geen prijs of publicatiestatus bepalen.

## Admin-publicatieflow

Nieuwe producten starten inactief als concept. Iedere inhoudelijke wijziging
zet het product terug naar `REVIEW`, deactiveert het en maakt een nieuwe
juridische/publicatiebeoordeling nodig. Een prijswijziging reset ook de
prijsgoedkeuring. Alleen de publish-action kan na de volledige checklist
`PUBLISHED + is_active` zetten. Verbergen, depubliceren en archiveren zetten
`is_active` terug op `false`.

Afbeeldingen worden door de admin-serveraction rechtstreeks naar Supabase
Storage geüpload. De database bewaart alleen pad en metadata. Publieke clients
krijgen een kortlevende signed URL en tonen een nette lokale fallback als het
object niet geladen kan worden.

## Quantity en prijsautoriteit

`min_quantity`, `max_quantity` en de NL/EN-eenheidslabels staan op het product.
Clients mogen een indicatief totaal tonen, maar de server haalt het product
opnieuw op en berekent `unit_price_cents × quantity`. Een clientprijs wordt
nooit vertrouwd.

Bestelregels bewaren een immutable `product_snapshot` met product-ID, SKU,
slug, naam, prijs, valuta, btw, periode, quantity, versie en afbeeldingspad.
Partnerleads bewaren eveneens quantity en een server-berekende product- en
prijssnapshot.

## Canonieke prijsstructuur

Publieke verkoop toont de **VDB-prijs**. `market_price` is een externe
benchmark, geen kortingsanker. Korting is een verkoopinstrument, maar een
doorgestreepte van-prijs en een publiek kortingspercentage zijn alleen
toegestaan als de VDB-prijshistorie dat ondersteunt (ACM: laagste eigen
verkoopprijs van de voorafgaande 30 dagen). De leverancierslijst blijft intern
voor inkoop en beschikbaarheid.

| Veld | Betekenis | Zichtbaarheid |
|---|---|---|
| `market_price_cents` | Actuele externe marktwaarde/benchmark | Publiek als gelabelde marktwaarde, nooit als % korting |
| `retail_price_cents` | Standaard VDB-verkoopprijs | Publiek |
| `sale_price_cents` + venster | Tijdelijke aanbieding | Publiek als actief |
| `lowest_price_30d_cents` | Laagste aangeboden VDB-prijs in de 30 dagen vóór de huidige prijs | Publiek als anker |
| `product_price_history` | Audit van aangeboden VDB-klantprijzen | Intern |
| `partner_price_cents` | Optionele speciale partnerprijs | Partner-RPC |
| `price_cents` | Opgeloste klantprijs (actie of retail) | Publiek, compat |
| `cost_cents` | Leveranciersinkoop | Alleen intern |
| `partner_commission_*` | Commissie per verkoop | Partner/intern |
| `minimum_sale_price_cents` | Harde commerciële vloer | Intern |
| `legal_discount_percentage` | Publiek; alleen vanaf `lowest_price_30d` | Publiek |
| `market_discount_pct` | Intern analytisch t.o.v. marktwaarde | Alleen OWNER/ADMIN |
| interne marge | `klantprijs − inkoop − commissie − btw` | Alleen OWNER/ADMIN |

Zonder geldige historie, als de marktwaarde €99,95 is en VDB €79,95 vraagt:

**Marktwaarde: €99,95**  
**VDB-prijs: €79,95**

zonder kortingsclaim. Pas als VDB het artikel in de voorgaande 30 dagen
daadwerkelijk voor €99,95 (of hoger als laagste) heeft aangeboden:

~~€99,95~~ **€79,95 — 20% korting**

Harde regels:

- `market_price` is nooit automatisch een discount anchor.
- Publieke kortingspercentages en doorgestreepte prijzen komen uitsluitend uit
  geldige VDB price history / `lowest_price_30d`.
- De klantprijs mag niet onder `minimum_sale_price_cents` komen zonder
  expliciete OWNER-goedkeuring (`products.override_price_floor`, AAL2).
  ADMIN mag prijzen wijzigen, maar niet onder de vloer. De database-trigger
  `trg_products_sync_canonical_prices` faalt fail-closed met `PRICE_BELOW_FLOOR`.

Publieke RPCs (`list_public_catalog`, en via diezelfde bron
`list_partner_catalog`) geven **nooit** `cost_cents`, interne marge of
`market_discount_pct` terug.

`20260820224500_catalog_market_pricing.sql` is een lokale proposal. Niet
remote toepassen zonder ownergoedkeuring.

## Jaarabonnement voor TV-streaming

De migration proposal bevat `tv-streaming-jaarabonnement` voor €100 per
licentie per jaar, met quantity 1–3 en transparante NL/EN-omschrijving. Het
product belooft alleen de dienst, content, apparaten en regio die vooraf
schriftelijk zijn bevestigd. Gedeelde accounts, ongeautoriseerde streams en
omzeiling van toegangsbeperkingen zijn expliciet uitgesloten.

Dit product is bewust `REVIEW`, niet actief en juridisch geblokkeerd. Het mag
pas worden gepubliceerd nadat leverancier/contentrechten aantoonbaar zijn
beoordeeld en de primaire Storage-afbeelding met NL/EN-alttekst is gekoppeld.

## Uitrolgrens

`20260820164821_catalog_supabase_ssot_v1.sql` is een lokale migration proposal.
Pas deze eerst toe op een lokale Supabase-stack en daarna, met ownergoedkeuring,
op staging. Productieapply, Storage-upload, betalingen en publicatie vallen niet
onder een automatische codewijziging. Hetzelfde geldt voor
`20260820224500_catalog_market_pricing.sql`.
