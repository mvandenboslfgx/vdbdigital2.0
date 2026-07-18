# Catalog admin migration gate

## File

`supabase/migrations/20260716200000_catalog_admin.sql`

## Independence from P0.5

This migration is **orthogonal** to payment integrity migrations:

- `20260716000000_p0_payment_integrity.sql`
- `20260716010000_p05_rate_limit_hardening.sql`
- `20260716020000_p05_verify_payment_contracts.sql`

It does **not** depend on those RPCs or columns. Apply catalog admin only after its own backup + dry-run gate — not as part of the P0.5 checkout release gate.

## Do not apply yet

Until operators complete a catalog-specific dry-run:

1. Do **not** run this migration on production.
2. Keep `CHECKOUT_ENABLED=false`.
3. Keep `P05_MIGRATION_APPLIED` unset/false.
4. Admin catalog UI degrades gracefully when new columns/tables are missing.

## What it adds

- Product commercial fields (`price_mode`, legal/price approval, audience, version)
- Publication statuses `REVIEW` / `HIDDEN`
- `product_translations`, `product_media`, `product_addons`, `product_addon_links`
- Category NL fields + `is_active`

## Safety defaults

- `legal_status` defaults to `NOT_REVIEWED`
- `publication_ready` defaults to `false`
- `price_status` defaults to `DRAFT`
- No product is auto-published or legally approved

## Related hygiene files (also not applied yet)

- `20260716210000_catalog_admin_hardening.sql` — unique locale slug, MIME check
- `20260716220000_catalog_verify_admin_contracts.sql` — read-only verifier RPC
- `20260716230000_catalog_admin_storage.sql` — private `product-media` bucket
- `docs/CATALOG_ADMIN_MIGRATION_AUDIT.md`
- `docs/CATALOG_ADMIN_MIGRATION_EVIDENCE_TEMPLATE.md`
- `docs/CATALOG_ADMIN_STORAGE.md`
- `npm run db:verify-catalog-admin`
- `npm run catalog:verify-alignment`
