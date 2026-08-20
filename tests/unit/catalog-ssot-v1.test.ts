import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(".");
const migration = readFileSync(
  resolve(
    ROOT,
    "supabase/migrations/20260820164821_catalog_supabase_ssot_v1.sql",
  ),
  "utf8",
);

describe("catalog Supabase SSOT migration", () => {
  it("requires the complete public publication gate", () => {
    expect(migration).toMatch(/status::text = 'PUBLISHED'/);
    expect(migration).toMatch(/is_active = true/);
    expect(migration).toMatch(/publication_ready = true/);
    expect(migration).toMatch(/price_status::text IN \('APPROVED', 'PUBLISHED'\)/);
    expect(migration).toMatch(/APPROVED_FOR_B2B/);
    expect(migration).toMatch(/product_translations AS t/);
    expect(migration).toMatch(/product_media AS m/);
  });

  it("removes the cross-bucket storage policies and grants only published media reads", () => {
    expect(migration).toContain('DROP POLICY IF EXISTS "product_media_deny_anon_select"');
    expect(migration).toContain("CREATE POLICY product_media_public_object_select");
    expect(migration).not.toMatch(/CREATE POLICY[\s\S]{0,180}bucket_id <> 'product-media'/);
    expect(migration).toMatch(/bucket_id = 'product-media'/);
  });

  it("keeps the transparent TV subscription in review until rights and media are approved", () => {
    expect(migration).toContain("'TV Streaming Jaarabonnement'");
    expect(migration).toContain("10000, NULL, 'FIXED', 'YEARLY'");
    expect(migration).toContain("'REVIEW', false, false, false, 'APPROVED', 'LEGAL_REVIEW_REQUIRED'");
    expect(migration).toContain("geen gedeelde accounts, illegale streams");
  });

  it("stores order and partner price snapshots with quantity", () => {
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS product_snapshot jsonb");
    expect(migration).toContain("'total_price_cents'");
    expect(migration).toContain("product_snapshot");
    expect(migration).toContain("p_quantity integer");
    expect(migration).toContain("p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 999");
  });

  it("does not drop catalog tables or delete existing product rows", () => {
    expect(migration).not.toMatch(/DROP TABLE\s+IF EXISTS\s+public\.products/i);
    expect(migration).not.toMatch(/TRUNCATE\s+TABLE\s+public\.products/i);
    expect(migration).not.toMatch(/DELETE\s+FROM\s+public\.products/i);
  });
});

describe("catalog seed media", () => {
  it("ships a project-bound image and a fail-closed upload command", () => {
    const image = resolve(ROOT, "assets/catalog-seed/tv-streaming-yearly.png");
    const upload = readFileSync(resolve(ROOT, "scripts/upload-catalog-seed-media.mjs"), "utf8");
    expect(existsSync(image)).toBe(true);
    expect(statSync(image).size).toBeGreaterThan(100_000);
    expect(statSync(image).size).toBeLessThanOrEqual(5_242_880);
    expect(upload).toContain('target !== "staging"');
    expect(upload).toContain("product-media");
    expect(upload).toContain("activated: false");
  });
});
