# Catalog SSOT (Single Source of Truth)

> **Hard rule:** No commercial catalog data may be hardcoded in the mobile application.
> Products, categories, prices, availability, translations, images, purchase configuration
> and commercial visibility must come from the shared VDB backend/catalog SSOT.

## Architecture

```text
Supabase products / categories / translations / storage
                    │
            Catalog read APIs / RPCs
                    │
     ┌──────────────┼──────────────┐
     ▼              ▼              ▼
  Website        Mobile         Admin CMS
  Partner portal
```

## Publication

Only `ACTIVE` (or equivalent published status) products are visible to customers/partners/public.
Draft/review products stay admin-only.

## Pricing

Server is financially authoritative. Checkout must re-fetch price at order time.
`order_items` store snapshots (name, sku, unit price, vat) at purchase.

## Current debt

- Web still has dual catalog: DB shop products vs `src/config/commercial/pricing.ts`.
- Mobile has no customer shop UI yet; admin product directory uses RPCs.
- Seed fallback (`products.seed.ts`) must remain local-dev only.

## Target

1. Admin CMS writes products → DB.
2. Website + app + partner read the same ACTIVE catalog.
3. Collapse commercial pricing into DB or generate from DB.
4. Remove hardcoded mobile/web commercial prices from runtime paths.
