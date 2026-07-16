# Commercial Thickness Sprint

Status: **foundation implemented — pricing and legal review still required**

## Implemented

- **Brand:** Official name **VDB Digital Software** in site config, meta, navigation and primary CTAs.
- **Primary CTA:** Schedule an introduction / Plan een kennismaking — header, hero, mobile nav, final CTA, case pages.
- **Commercial config** (`src/config/commercial/`): website packages, bundles, founding-client offer, cases, booking, B2B payment schedule constants, site readiness warnings.
- **Homepage:** Problems, solutions grid, packages, founding section, 8-step process, case preview, updated hero with product visual.
- **Founding Client Offer:** Dismissible bar + homepage section; disabled by default; server-side slot tracking via `site_settings`.
- **Case architecture:** Vermeulen Bouwservice (DRAFT, not public); platform internal case; three labelled demonstrations.
- **Product visuals:** Reusable visual components under `src/components/visuals/`.
- **Admin settings:** Readiness warnings (KvK, VAT, booking URL, legal review, etc.).
- **Tests:** `tests/unit/commercial-sprint.test.ts`; updated E2E hero assertions.
- **Middleware:** Dutch browser language may redirect to `/nl` on first visit; manual cookie wins.

## Not published (by design)

- Definitive product prices
- Founding-client discount amounts
- Vermeulen Bouwservice case (awaiting content and permissions)
- Concept seed products in production shop (DRAFT / concept in database)

## Still requires business decisions

- Final pricing per product and package
- Founding-client benefits and discount approval
- Booking provider URL (Cal.com / Calendly / Google Calendar)
- Company data: KvK, VAT, public address, phone, WhatsApp
- Vermeulen case content, screenshots, permissions

## Still requires legal review

See `docs/B2B_B2C_COMMERCE_RULES.md` — **LEGAL REVIEW REQUIRED BEFORE PRODUCTION**

## Build gate

Run before preview deployment:

```bash
npm run env:scan-secrets
npm run env:validate:database
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

- `docs/PRICING_DECISION_MATRIX.md`
- `docs/FOUNDING_CLIENT_OFFER.md`
- `docs/BUNDLE_ARCHITECTURE.md`
- `docs/B2B_B2C_COMMERCE_RULES.md`
- `docs/VERMEULEN_CASE_CONTENT_CHECKLIST.md`
- `docs/CASE_APPROVAL_WORKFLOW.md`
- `docs/PRODUCT_VISUAL_SYSTEM.md`
