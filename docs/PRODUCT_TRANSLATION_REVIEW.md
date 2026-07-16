# Product translation review

Review of all **16 seed products** (`src/config/products.seed.ts`) against Dutch overlays (`src/i18n/content/products-nl.ts`).

**Important**

- **Slugs are unchanged** across locales (same URL path under `/shop/` and `/nl/shop/`).
- **Prices, billing type, IDs, and sort order** are never localised (`localizeProduct` in `src/i18n/localize-product.ts`).
- Database seed stores products as **DRAFT + `is_concept=true`** — nothing is published to the public catalogue until manual review.
- Publication advice below reflects **copy completeness** for seed/fallback data, not live publication status.

## Summary

| Metric | Value |
| --- | --- |
| Products with EN copy | 16 / 16 |
| Products with NL overlay | 16 / 16 |
| NL overlay key parity with seed slugs | 16 / 16 |
| Automated price parity (unit test) | PASS |

## Per-product matrix

| Product (slug) | EN complete | NL complete | Meaning parity | Price unchanged | Publication advice |
| --- | --- | --- | --- | --- | --- |
| Starter Website (`starter-website`) | Yes | Yes | Pending human review | Yes | READY_FOR_CONTENT_REVIEW |
| Business Website (`business-website`) | Yes | Yes | Pending human review | Yes | READY_FOR_CONTENT_REVIEW |
| Premium Website (`premium-website`) | Yes | Yes | Pending human review | Yes | READY_FOR_CONTENT_REVIEW |
| Conversion-focused Landing Page (`conversiegerichte-landingspagina`) | Yes | Yes | Pending human review | Yes | READY_FOR_CONTENT_REVIEW |
| Complete Online Store (`complete-webshop`) | Yes | Yes | Pending human review | Yes | READY_FOR_CONTENT_REVIEW |
| Website Redesign (`website-redesign`) | Yes | Yes | Pending human review | Yes | READY_FOR_CONTENT_REVIEW |
| WhatsApp AI Starter (`whatsapp-ai-starter`) | Yes | Yes | Pending human review | Yes | READY_FOR_CONTENT_REVIEW |
| WhatsApp AI Business (`whatsapp-ai-business`) | Yes | Yes | Pending human review | Yes | READY_FOR_CONTENT_REVIEW |
| tawk.to Live Chat Setup (`tawk-to-livechat-installatie`) | Yes | Yes | Pending human review | Yes | READY_FOR_CONTENT_REVIEW |
| Review Flow Setup (`reviewflow-setup`) | Yes | Yes | Pending human review | Yes | READY_FOR_CONTENT_REVIEW |
| Appointment Automation (`afsprakenautomatisering`) | Yes | Yes | Pending human review | Yes | READY_FOR_CONTENT_REVIEW |
| Monthly Website Management (`maandelijks-websitebeheer`) | Yes | Yes | Pending human review | Yes | READY_FOR_CONTENT_REVIEW |
| Technical Maintenance (`technisch-onderhoud`) | Yes | Yes | Pending human review | Yes | READY_FOR_CONTENT_REVIEW |
| Conversion Audit (`conversie-audit`) | Yes | Yes | Pending human review | Yes | READY_FOR_CONTENT_REVIEW |
| Support Hours Bundle (`supporturen-bundel`) | Yes | Yes | Pending human review | Yes | READY_FOR_CONTENT_REVIEW |
| Custom Digitalisation (`maatwerk-digitalisering`) | Yes | Yes | Pending human review | Yes | READY_FOR_CONTENT_REVIEW |

## Fields localised (NL overlay)

When locale is `nl` and an overlay exists, these fields are replaced:

`name`, `shortDescription`, `fullDescription`, `categoryName`, `deliveryTime`, `includedItems`, `excludedItems`, `extensions`, `requiredInput`, `targetAudience`, `workflow`, `faqs`, `seoTitle`, `seoDescription`

## Fields never localised

`id`, `slug`, `status`, `priceCents`, `fromPriceCents`, `billingType`, `categorySlug`, `featured`, `sortOrder`, `is_concept`

## Publication advice values

| Advice | When used |
| --- | --- |
| `READY_FOR_CONTENT_REVIEW` | EN and NL copy structurally complete; awaiting human QA before any publish |
| `ENGLISH_REVIEW_REQUIRED` | Missing required EN copy fields |
| `DUTCH_REVIEW_REQUIRED` | Missing NL overlay or incomplete NL fields |
| `SCOPE_REVIEW_REQUIRED` | Product is DRAFT or `is_concept=true` in database |
| `DO_NOT_PUBLISH` | Reserved for blocking issues (not currently assigned) |

Live database products seeded via `npm run db:seed` report **`SCOPE_REVIEW_REQUIRED`** in admin until status and concept flags are cleared manually.

## Admin visibility

`/admin/products` shows EN/NL completeness badges and publication advice per product. **No automatic publish** from the admin UI (`src/app/admin/(protected)/products/page.tsx`).

## Verification

- `tests/unit/i18n.test.ts` — price/slug/id parity, NL name presence
- `assertProductTranslationComplete()` / `getProductPublicationAdvice()` in `src/i18n/localize-product.ts`
