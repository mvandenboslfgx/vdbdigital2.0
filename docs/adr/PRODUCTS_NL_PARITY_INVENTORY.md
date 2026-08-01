# products-nl.ts → product_translations parity inventory

Status: informational inventory, not a migration plan. **Do not delete
`src/i18n/content/products-nl.ts`.** It remains the safety-net fallback used by
`localizeProduct()` (`src/i18n/localize-product.ts`) whenever a product has no
`published` (or admin-preview `approved`) `product_translations` row yet.

## Why this doc exists

Phase 4 introduced `product_translations` as the intended long-term SSOT for
localized storefront copy, gated by the `status` workflow column added in
`supabase/migrations/20260801140000_product_translation_status.sql`. The
static `productsNl` overlay in `src/i18n/content/products-nl.ts` predates that
table and is still the *only* source of NL copy for every seed product,
because no `product_translations` rows have been reviewed/published yet (the
optional seed helper `scripts/backfill-product-translations-from-nl.ts` only
ever writes `status = 'needs_review'` — never `published` — by design).

This inventory answers three questions:

1. Which slugs exist in `productsNl` vs. the product seed data?
2. Which `productsNl` fields have a 1:1 home in `product_translations`, and
   which do not (and therefore can **never** fully move to the DB without a
   schema change)?
3. What is the current publication state, so a human reviewer knows exactly
   what "parity" would require?

## 1. Slug coverage

| Source | Count |
| --- | --- |
| `src/config/products.seed.ts` product slugs | 15 |
| `src/i18n/content/products-nl.ts` (`productsNl`) keys | 15 |
| Slugs present in both | 15 / 15 |

Slugs (all 15 present in both files):

`starter-website`, `business-website`, `premium-website`,
`conversiegerichte-landingspagina`, `complete-webshop`, `website-redesign`,
`whatsapp-ai-starter`, `whatsapp-ai-business`, `reviewflow-setup`,
`afsprakenautomatisering`, `maandelijks-websitebeheer`,
`technisch-onderhoud`, `conversie-audit`, `supporturen-bundel`,
`maatwerk-digitalisering`.

> Note: `docs/PRODUCT_TRANSLATION_REVIEW.md` (pre-existing) states "16 seed
> products" — the current seed/overlay files both contain 15. This appears to
> be stale copy in that older doc, not a real product missing from
> `productsNl`. Flagged here for a human to confirm; not changed as part of
> this workstream (that file is a historical review snapshot, left as-is).

## 2. Field-level mapping: `productsNl` → `product_translations`

| `productsNl` field (`ProductCopy`) | `product_translations` column | Can move to DB SSOT? |
| --- | --- | --- |
| `name` | `name` | Yes |
| `shortDescription` | `short_description` | Yes |
| `fullDescription` | `full_description` | Yes |
| `deliveryTime` | `delivery_time` | Yes |
| `includedItems` | `included_items` | Yes |
| `excludedItems` | `excluded_items` | Yes |
| `targetAudience` | `target_audience` | Yes |
| `workflow` | `workflow` | Yes |
| `seoTitle` | `seo_title` | Yes |
| `seoDescription` | `seo_description` | Yes |
| `categoryName` | — (no column) | **No** — category naming is a `categories` table join per locale, not a per-product-translation field. Out of scope for `product_translations`. |
| `extensions` | — (no column) | **No** — not modeled in `product_translations` at all. Requires a schema addition (`extensions JSONB`) before this can leave `products-nl.ts`. |
| `requiredInput` | — (no column) | **No** — same as `extensions`; would need a new column. |
| `faqs` (`{question, answer, sortOrder}[]`) | — (no column) | **No** — FAQs are structured objects, not plain strings; would need either a new JSONB column or a dedicated `product_translation_faqs` table. |

`product_translations` also has columns with **no** `productsNl` source at
all: `benefits`, `cta_label`, `quote_cta_label`, `warnings`. These are only
ever populated via the admin editor (`src/components/admin/product-editor-form.tsx`)
today — `productsNl` never had per-locale copy for them, so
`mergeProductForLocale()` correctly falls back to the EN product row for any
of those fields a translation row leaves blank (see
`src/lib/commerce/product-locale-merge.ts`).

**Conclusion:** even with 100% of `productsNl` copy transcribed into
`product_translations` and published, the `categoryName` / `extensions` /
`requiredInput` / `faqs` fields would **still** only ever come from
`products-nl.ts` (or the EN row) — `mergeProductForLocale()` never touches
them (by design; see its doc comment). Full retirement of
`products-nl.ts` requires a follow-up schema decision for those four fields,
not just content review. Until then, `products-nl.ts` supplies those fields
for every NL request regardless of `product_translations` status, via
`localizeProduct()`'s static-overlay fallback path.

## 3. Current publication state (parity gap)

| Locale | `product_translations` rows with `status = 'published'` | Storefront NL copy currently sourced from |
| --- | --- | --- |
| `nl` | 0 (none published in this workstream; migration is additive-only and **not applied** to staging/production per task constraints) | `products-nl.ts` static overlay (100% of traffic) |
| `en` | n/a (`en` locale always reads the canonical `products` row directly — see `mergeProductForLocale`) | `products` row (canonical) |

So today, DB↔static parity is **0%** in the sense that no `product_translations`
row is live — `products-nl.ts` is still doing 100% of the work for NL
storefront copy. This is expected and safe: `localizeProduct()` only prefers
a DB row when it is `published` (or `approved` in gated admin preview), so
nothing changes for visitors until a human explicitly promotes rows.

### Path to parity (for a future workstream, not executed here)

1. Run `scripts/backfill-product-translations-from-nl.ts --execute` against a
   **local** Supabase instance to seed all 15 slugs as
   `product_translations(locale='nl', status='needs_review')`.
2. Human review each row in `/admin/products/:id` (Meertaligheid section),
   promote to `approved`, then `published` — gated by
   `canTransitionTranslationStatus()` (`src/lib/commerce/product-locale-merge.ts`):
   requires the `products.publish` capability, a prior `approved` status, and
   no missing required fields (`name`, `shortDescription`, `fullDescription`,
   `seoTitle`, `seoDescription`, `includedItems`).
3. Decide on schema additions (or accept static fallback indefinitely) for
   `categoryName` / `extensions` / `requiredInput` / `faqs` before treating
   `products-nl.ts` as fully retireable.
4. Only after every slug has a `published` NL row covering every
   DB-representable field should `products-nl.ts` be considered for removal —
   and even then, `categoryName`/`extensions`/`requiredInput`/`faqs` need a
   decision first (see §2).

## Storefront call sites verified against the publish gate

All of the following resolve NL/EN copy exclusively through
`localizeProduct()` / `mergeProductForLocale()` (i.e. they will only ever show
DB copy once it is `published`, and otherwise safely fall back to
`products-nl.ts` or the EN row — never a `draft`/`machine_translated`/
`needs_review` row):

- Shop list — `src/server/repositories/public-shop-catalog.ts` (`listPublicShopProducts`)
- Shop PDP — `src/server/repositories/public-shop-catalog.ts` (`getPublicShopProductBySlug`)
- Homepage "popular products" section — `src/components/sections/popular-products-section.tsx`
  (fixed in this workstream to batch-fetch `product_translations` instead of
  only ever using the static overlay — see git history)

The homepage/marketing "packages" and "care packages" sections
(`packages-section.tsx`, `care-packages-section.tsx`) are **not** part of the
`product_translations` SSOT — they render fixed-price package tiers from
`src/config/commercial/website-packages.ts` / `care-packages.ts` with copy
from the static `en`/`nl` dictionaries in `src/i18n/content/commercial.ts`.
There is no draft/machine-translation risk there because that content has no
workflow states; out of scope for this inventory.
