# B2B / B2C Commerce Rules

> **LEGAL REVIEW REQUIRED BEFORE PRODUCTION**
>
> This document describes technical architecture and operational intent only. It is **not** legal advice. All consumer-facing copy, withdrawal rights, and payment terms must be reviewed by qualified counsel before production checkout goes live.

## Separation goals

VDB Digital Software serves both companies and consumers. Checkout and product configuration must support:

- Distinct customer types (business vs consumer)
- B2B payment schedules (70% before start / 30% after completion for custom B2B projects — configurable, not auto-applied to B2C)
- B2C VAT-inclusive display where required
- Explicit legal consent (never pre-checked)
- Withdrawal-period consent when execution starts early (B2C)
- Blocking B2C sale when required consumer information is missing

## Product legal types

Configured in `src/config/commercial/pricing.ts`:

- standard_service
- custom_service
- digital_content
- subscription
- maintenance
- support_bundle
- consultancy
- immediate_service
- mixed_product

B2C checkout publication is gated by `canPublishForB2c()` — requires approved price + legal status.

## Checkout fields (target architecture)

- Customer type (business / consumer)
- Company name (business)
- VAT number (business, where relevant)
- Billing address
- Legal consent version + timestamp
- Terms version
- Withdrawal consent (B2C, where relevant)
- Request to start during withdrawal period (B2C, where relevant)

## Implementation status

| Area | Status |
|---|---|
| B2B payment schedule constants | Implemented (`b2bCustomPaymentSchedule`) |
| Product legal type enum | Implemented |
| Full checkout field separation | Partial — requires legal review before production |
| Consumer withdrawal UI copy | **Not legally finalised** |
| Auto-block B2C without legal metadata | Planned — enforce in admin before publish |

## Do not

- Pre-check consent checkboxes
- Apply B2B payment terms to consumers automatically
- Publish definitive legal text without review
- Claim guaranteed outcomes in commercial copy

## Reference pages

Use existing operational legal pages as concept basis. Mark internally which sections still require professional legal review.
