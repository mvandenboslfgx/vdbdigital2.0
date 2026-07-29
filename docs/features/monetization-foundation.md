# Monetization Foundation

> **Status: FEATURE-FLAGGED OFF — No external ads. No AdSense. No active placements.**

## Overview

A transparent, VDB-premium promotion system for three types of content blocks:
- **OWN_SERVICE** — cross-sell of own VDB Digital services
- **AFFILIATE** — disclosed affiliate link recommendations
- **SPONSORED** — disclosed sponsored content from named sponsors

No external ad networks. No AdSense slots. No ad JavaScript. No user tracking.

## Component: `RevenuePromotionCard`

Located at `src/components/promotion/revenue-promotion-card.tsx`.

### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `type` | `OWN_SERVICE \| AFFILIATE \| SPONSORED` | ✓ | Determines mandatory disclosure |
| `title` | `string` | ✓ | Card headline |
| `description` | `string` | ✓ | Card body |
| `ctaLabel` | `string` | ✓ | Button label |
| `destination` | `string` | ✓ | HTTPS destination URL |
| `disclosure` | `string` | — | Custom disclosure text (overrides default) |
| `sponsorName` | `string` | Required for SPONSORED | Sponsor name shown in badge + disclosure |
| `locale` | `string` | — | Locale for analytics |
| `placementId` | `string` | — | Policy placement identifier |
| `enabled` | `boolean` | — | Defaults to `false`-closed if omitted |
| `className` | `string` | — | Extra classes on root element |

### Fail-closed guards

The component renders nothing when:
- `enabled` is `false`
- `title`, `description`, or `ctaLabel` is empty
- `destination` is not a valid `https://` URL
- `type === "SPONSORED"` and `sponsorName` is missing

### Link safety

| Type | `rel` attribute |
|---|---|
| OWN_SERVICE | `noopener noreferrer` |
| AFFILIATE | `sponsored nofollow noopener noreferrer` |
| SPONSORED | `sponsored nofollow noopener noreferrer` |

All links open in a new tab (`target="_blank"`).

## Placement Policy

Defined centrally in `src/config/promotion-policy.ts`.

| Placement ID | Allowed types | Max/page | Allowed routes | Excluded routes |
|---|---|---|---|---|
| `app_download_banner` | OWN_SERVICE | 1 | any non-excluded | see exclusion list |
| `knowledge_article_inline` | OWN_SERVICE | 1 | `/support/**`, `/solutions/**` | global exclusions |
| `knowledge_article_end` | OWN_SERVICE, AFFILIATE | 1 | `/support/**`, `/solutions/**` | global exclusions |
| `case_study_end` | OWN_SERVICE, AFFILIATE | 1 | `/cases/**` | global exclusions |
| `service_cross_sell` | OWN_SERVICE | 1 | `/solutions/**` | global exclusions |

### Global exclusions (ALL placements)

Promotions are **never** rendered on:
- Authentication routes
- Checkout / payment flows
- Customer portal (`/portal/**`)
- Admin panel (`/admin/**`)
- API routes
- Legal / privacy / cookie pages
- Error pages

### Frequency limits

- Maximum **1** promotion block per normal page
- Maximum **2** in long knowledge base articles (combined `knowledge_article_inline` + `knowledge_article_end`), placed well apart
- Never above the main content
- Never between form fields
- Never in customer, partner, or admin portals

## Disclosure Requirements

| Type | Disclosure required | Badge |
|---|---|---|
| OWN_SERVICE | No | None |
| AFFILIATE | Yes | `Affiliate-link` / `Affiliate link` |
| SPONSORED | Yes | `Gesponsord` / `Sponsored` + sponsor name |

Disclosures must be honest and visible. No misleading button labels. No hidden redirects.

## Privacy

- No tracking parameters stored as PII
- No third-party ad JavaScript
- No user profiling
- Analytics events (when connected) contain only: `type`, `placementId`, `locale`, `destinationType` — no PII

## Feature Flag

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_PROMOTION_ENABLED` | `false` | Master switch for promotion blocks |

Individual placement calls should also check `enabled` prop at the call site.

## Analytics Events

Analytics integration is a **hook point** — not yet connected to a provider. Events will fire via the existing analytics layer when one is integrated, subject to consent.

Planned events:
- `promotion_impression` — `{ type, placementId, locale }`
- `promotion_click` — `{ type, placementId, locale, destinationType }`

## Own Service Examples

Eligible for `OWN_SERVICE` type:
- Website maintenance
- Managed hosting
- AI chatbot integration
- WhatsApp automation
- Review automation
- SEO
- Conversion optimisation
- Security monitoring

## Affiliate Guidelines

- Affiliate relationships must be pre-approved by VDB Digital management
- Disclosure must be visible and honest
- `rel="sponsored nofollow noopener noreferrer"` required
- No misleading copy
- No tracking parameters logged as PII
- Partners: only companies aligned with VDB Digital's values

## Sponsored Content Guidelines

- Sponsor must be named in the badge and disclosure
- Content must not be disguised as independent editorial advice
- Sponsor must be approved before placement
- Standard is OFF by default — requires explicit activation

## Activation Procedure

1. Identify placement (refer to `PLACEMENT_POLICIES` in `promotion-policy.ts`)
2. Confirm the route is in the allowlist and not excluded
3. Set `NEXT_PUBLIC_PROMOTION_ENABLED=true` in Preview
4. For AFFILIATE/SPONSORED: confirm disclosure text and sponsor approval
5. Render `<RevenuePromotionCard>` at the approved placement with `enabled={true}`
6. Test in Preview — verify disclosure is visible, rel attributes are correct
7. Deploy to Production

## Rollback

- Set `enabled={false}` on the card or remove the component from the page
- Or set `NEXT_PUBLIC_PROMOTION_ENABLED=false` and redeploy

## Files

| File | Purpose |
|---|---|
| `src/components/promotion/revenue-promotion-card.tsx` | Main component |
| `src/config/promotion-policy.ts` | Placement + route policy |
| `src/config/features.ts` | `isPromotionEnabled()` flag |
| `src/i18n/messages/en.ts` | English labels (`promotion.*`) |
| `src/i18n/messages/nl.ts` | Dutch labels (`promotion.*`) |
| `tests/unit/revenue-promotion-card.test.tsx` | Component tests |
| `tests/unit/promotion-policy.test.ts` | Route policy tests |
