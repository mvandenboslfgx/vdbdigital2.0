# Commercial Master Completion

Status: **commercial website complete — legal review and price approval still required**

## Confirmed decisions implemented

- Brand: **VDB Digital Software**
- Tagline EN: Software built around your business.
- Tagline NL: Software gebouwd rond jouw bedrijf.
- Primary CTA: Schedule an introduction / Plan een kennismaking
- English-first routing; Dutch under `/nl`
- Website packages with draft starting prices (excl + incl VAT)
- Webshop Launch from-price
- Care packages (Essential / Business / Growth / Digital Partner)
- Founding Client Offer architecture (disabled; discount not approved for public)
- Bundles with draft from-prices or proposal-only
- Full solution page set (11+ solutions + aliases)
- Multi-step quote flow with Business / Consumer
- Booking provider config with safe URL validation and fallbacks
- Product visuals set
- Admin offers/cases review UIs (config-driven)
- Shop filters, packages and bundles sections

## Draft prices (require Matthijs approval before PUBLISHED)

See `docs/PRICING_DECISION_MATRIX.md`.

## Legal blockers

- B2C checkout blocked until `legalStatus` is `APPROVED_FOR_B2C` or `APPROVED_FOR_BOTH`
- See `docs/B2B_B2C_COMMERCE_RULES.md` and `docs/LEGAL_REVIEW_CHECKLIST.md`

## Publication blockers

- Catalog items are `priceStatus: DRAFT` and `publicationReady: false`
- Seed products remain concept/DRAFT in DB
- Vermeulen case remains non-public
- Founding offer: `FOUNDING_CLIENT_ENABLED` default off; `discountApproved: false`

## Missing before production

- KvK, VAT number, public address, phone, WhatsApp
- Booking provider URL
- Legal review of consumer flows
- Explicit price approval to move DRAFT → APPROVED → PUBLISHED
- Vermeulen content + permissions
- Supabase credentials for local `db:verify` / `db:test-rls`
