# Catalog SSOT — VDB Digital

**Status:** TARGET documented · CURRENT = dual/triple source (not yet unified)  
**Repo:** `vdbdigital2.0`  
**Updated:** 2026-08-20  
**HEAD at write:** `c00ecf3`

---

## Hard rule (target)

Supabase is the **only** commercial source of truth for:

- products
- categories
- prices
- VAT / billing
- visibility
- media
- translations (NL/EN)
- fulfillment type + provider refs
- partner commission rules on SKUs

Clients (website, portals, future mobile app) must **not** maintain a second commercial catalog.

---

## Current reality (do not pretend otherwise)

| Source | Owns | Public surface |
|--------|------|----------------|
| `src/config/commercial/pricing.ts` (+ packages/care/bundles) | Marketing package **money** | `/shop` package/care/bundle cards |
| Supabase `products` + `product_translations` + `product_media` | CMS shop SKUs | Gated DB grid on `/shop` |
| `src/config/software-catalog/` | License inventory (fail-closed) | `/shop/software` |

Commercial SSOT slugs are **blocked** from the DB product grid (`public-shop-gates.ts`) so the same SKU cannot show two prices. That freezes dual-source; it does **not** unify it.

There is **no** product status named `ACTIVE`. Public ≈:

`status = PUBLISHED` ∧ `is_concept = false` ∧ legal approved ∧ price APPROVED|PUBLISHED ∧ `publication_ready` ∧ copy + primary image.

---

## Publish gate (fail-closed)

Admin create defaults:

- `status=DRAFT`
- `is_concept=true`
- `price_status=DRAFT`
- `legal_status=NOT_REVIEWED`
- `publication_ready=false`

Public browse uses `isPublicShopProduct()` — not “anything in the table”.

Internal review counts (e.g. “12 candidates in review”) belong in **Admin**, never as a primary customer headline.

---

## Migration plan (code phases)

1. **Mirror** commercial packages into Supabase rows (same cents, DRAFT until owner legal/price approval).
2. **Shop UI** reads packages from DB when `publication_ready`; else fall back to TS with explicit “draft display” ban in production.
3. **Delete** hardcoded euro amounts from TS once DB rows are the only producer of public prices.
4. **Software licenses** remain fail-closed until per-SKU supplier verification; then promote into `products` with fulfillment DIGITAL_LICENSE.
5. **Seed** (`products.seed.ts`) must not diverge from commercial slugs in local fallback.

---

## Checkout honesty

CTA labels:

- sellable (`quoteOnly: false`) → **Bestellen** / **Abonneren**
- custom / no definitive price → **Configureer aanvraag**

Until `CHECKOUT_ENABLED` + SKU eligibility, Bestellen still opens the quote/order intake (`intent=order`) — not a live Mollie charge. Do not enable live Mollie without owner approval.

---

## Related docs

- `docs/PRICING_DECISION_MATRIX.md`
- `docs/B2B_B2C_COMMERCE_RULES.md`
- `docs/CATALOG_ADMIN_MIGRATION.md`
- `docs/MOBILE_RC7_COMMERCE_HANDOFF.md`
- `scripts/lib/catalog-alignment.ts`
