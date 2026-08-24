import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(".", "supabase/migrations/20260820224500_catalog_market_pricing.sql"),
  "utf8",
);

describe("catalog market pricing migration", () => {
  it("adds canonical public and internal price columns", () => {
    expect(migration).toContain("market_price_cents");
    expect(migration).toContain("retail_price_cents");
    expect(migration).toContain("sale_price_cents");
    expect(migration).toContain("partner_price_cents");
    expect(migration).toContain("minimum_sale_price_cents");
    expect(migration).toContain("below_floor_owner_approved");
    expect(migration).toContain("lowest_price_30d_cents");
    expect(migration).toContain("product_price_history");
  });

  it("keeps supplier cost internal and fail-closed under the sale floor", () => {
    expect(migration).toContain("PRICE_BELOW_FLOOR");
    expect(migration).toMatch(/ar\.role::text = 'OWNER'/);
    expect(migration).toContain("trg_products_sync_canonical_prices");
    expect(migration).toContain("'Internal supplier cost / inkoop. Never expose on public catalog RPCs.'");
  });

  it("never uses market_price as a public discount anchor", () => {
    expect(migration).toContain("NEVER a public discount anchor");
    expect(migration).toContain("legal_discount_percentage integer");
    expect(migration).not.toMatch(
      /catalog_discount_percentage\(\s*coalesce\(p\.market_price_cents/,
    );
    expect(migration).toContain("p.lowest_price_30d_cents");
    expect(migration).toContain("NEW.compare_at_cents := NEW.lowest_price_30d_cents");
  });

  it("exposes public market/sale fields without cost or margin on catalog RPCs", () => {
    expect(migration).toContain("DROP FUNCTION IF EXISTS public.list_public_catalog()");
    expect(migration).toContain("DROP FUNCTION IF EXISTS public.list_partner_catalog()");
    expect(migration).toContain("sale_active boolean");

    const publicReturns = migration.slice(
      migration.indexOf("CREATE FUNCTION public.list_public_catalog"),
      migration.indexOf("CREATE FUNCTION public.list_partner_catalog"),
    );
    expect(publicReturns).toContain("market_price_cents integer");
    expect(publicReturns).toContain("lowest_price_30d_cents integer");
    expect(publicReturns).toContain("legal_discount_percentage integer");
    expect(publicReturns).not.toMatch(/cost_cents/);
    expect(publicReturns).not.toMatch(/margin/i);
    expect(publicReturns).not.toContain("minimum_sale_price_cents");
  });

  it("does not drop catalog tables or delete product rows", () => {
    expect(migration).not.toMatch(/DROP TABLE\s+IF EXISTS\s+public\.products/i);
    expect(migration).not.toMatch(/TRUNCATE\s+TABLE\s+public\.products/i);
    expect(migration).not.toMatch(/DELETE\s+FROM\s+public\.products/i);
  });
});
