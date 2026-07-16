# Pricing Decision Matrix

All catalog amounts live in `src/config/commercial/pricing.ts` (euro cents).  
**No item is PUBLISHED for production checkout yet.**

| Product | Product type | B2B/B2C | One-time / Recurring | Quote only | Excl. VAT | Incl. 21% VAT | Price review | Legal review | Status |
|---|---|---|---|---|---|---|---|---|---|
| Onepage Website | custom_service | Both | One-time | No | €995.00 | €1,203.95 | DRAFT | LEGAL_REVIEW_REQUIRED | DO_NOT_PUBLISH |
| Launch Website | custom_service | Both | One-time | No | €1,695.00 | €2,050.95 | DRAFT | LEGAL_REVIEW_REQUIRED | DO_NOT_PUBLISH |
| Growth Website | custom_service | Both | One-time | No | €2,995.00 | €3,623.95 | DRAFT | LEGAL_REVIEW_REQUIRED | DO_NOT_PUBLISH |
| Custom Website | custom_service | Both | One-time | **Yes** | From €5,000 | From €6,050 | DRAFT | LEGAL_REVIEW_REQUIRED | DO_NOT_PUBLISH |
| Webshop Launch | custom_service | Both | One-time | No | From €3,995 | From €4,833.95 | DRAFT | LEGAL_REVIEW_REQUIRED | DO_NOT_PUBLISH |
| Essential Care | maintenance | Both | Monthly | No | €69 / mo | €83.49 / mo | DRAFT | LEGAL_REVIEW_REQUIRED | DO_NOT_PUBLISH |
| Business Care | maintenance | Both | Monthly | No | €129 / mo | €156.09 / mo | DRAFT | LEGAL_REVIEW_REQUIRED | DO_NOT_PUBLISH |
| Growth Care | maintenance | B2B | Monthly | No | €249 / mo | €301.29 / mo | DRAFT | LEGAL_REVIEW_REQUIRED | DO_NOT_PUBLISH |
| Digital Partner (care) | support_bundle | B2B | Monthly | **Yes** | From €500 / mo | From €605 / mo | DRAFT | LEGAL_REVIEW_REQUIRED | DO_NOT_PUBLISH |
| Website Launch System | mixed | Both | One-time | No | From €1,695 | From €2,050.95 | DRAFT | LEGAL_REVIEW_REQUIRED | DO_NOT_PUBLISH |
| Business Growth System | mixed | B2B | One-time | No | From €3,495 | From €4,228.95 | DRAFT | LEGAL_REVIEW_REQUIRED | DO_NOT_PUBLISH |
| Webshop Launch System | mixed | Both | One-time | No | From €3,995 | From €4,833.95 | DRAFT | LEGAL_REVIEW_REQUIRED | DO_NOT_PUBLISH |
| Automation System | mixed | B2B | — | **Yes** | — | — | DRAFT | LEGAL_REVIEW_REQUIRED | DO_NOT_PUBLISH |
| Digital Partner System | support_bundle | B2B | — | **Yes** | — | — | DRAFT | LEGAL_REVIEW_REQUIRED | DO_NOT_PUBLISH |

## Founding drafts (not public until campaign approved)

| Package | Regular excl. | Founding excl. (DRAFT) |
|---|---|---|
| Onepage | €995 | €895 |
| Launch | €1,695 | €1,525 |
| Growth | €2,995 | €2,695 |
| Custom | From €5,000 | Proposal benefits only |

## Rules

- Server-side cents only
- EN/NL display amounts identical; labels differ
- `canPublishForB2c()` requires price + legal approval
