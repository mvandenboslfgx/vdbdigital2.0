# LEGAL REVIEW CHECKLIST

> **LEGAL REVIEW REQUIRED BEFORE B2C PRODUCTION**

This is an operational checklist — not legal advice.

## Before any B2C checkout goes live

- [ ] Consumer prices shown including VAT and mandatory costs
- [ ] Withdrawal right information reviewed
- [ ] Explicit consent when work starts during withdrawal period
- [ ] No pre-checked consents
- [ ] Terms version + privacy version stored with orders
- [ ] Consent timestamp + locale stored
- [ ] Product legal classification set per product
- [ ] `legalStatus` = APPROVED_FOR_B2C or APPROVED_FOR_BOTH
- [ ] `priceStatus` = APPROVED or PUBLISHED
- [ ] Refund / cancellation copy reviewed
- [ ] Company identity (KvK, VAT, address) complete on public pages where required

## B2B custom projects

- [ ] 70/30 schedule only applied where contractually agreed
- [ ] Not auto-applied to consumers
- [ ] Payment term configurable per proposal

## Blockers currently in code

- `canPublishForB2c()` returns false for all catalog items
- Founding discounts not approved for public display
- Concept seed products unpublished via RLS/`is_concept`
