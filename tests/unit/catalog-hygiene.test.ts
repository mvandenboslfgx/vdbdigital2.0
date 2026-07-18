import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  CATALOG_ADMIN_MIGRATION_FILES,
  REQUIRED_CATALOG_CONTRACT_CHECKS,
  evaluateCatalogContractResults,
  type CatalogVerifyCheck,
} from "../../scripts/lib/catalog-admin-contracts";
import { runAlignmentReport, type AlignmentRow } from "../../scripts/lib/catalog-alignment";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { mediaUploadMetaSchema } from "@/lib/validation/catalog";
import { hasPermission, SENSITIVE_PERMISSIONS } from "@/lib/auth/permissions";
import { isDirectCheckoutEnabled } from "@/config/features";
import { canAddToDirectCheckout } from "@/lib/commerce/checkout-eligibility";
import type { Product } from "@/types";
import { seedProducts } from "@/config/products.seed";

describe("catalog admin contracts catalog", () => {
  it("lists required migration files that exist in the repo", () => {
    for (const file of CATALOG_ADMIN_MIGRATION_FILES) {
      expect(existsSync(resolve(process.cwd(), file)), file).toBe(true);
    }
  });

  it("fails when verification RPC result is missing required checks", () => {
    const partial: CatalogVerifyCheck[] = [
      { name: "table:products", ok: true },
      { name: "table:categories", ok: true },
    ];
    const summary = evaluateCatalogContractResults(partial);
    expect(summary.ok).toBe(false);
    expect(summary.missingRequired.length).toBeGreaterThan(10);
    expect(summary.missingRequired).toContain(
      "rpc:catalog_verify_admin_contracts.signature",
    );
  });

  it("fails on wrong/failed column contract", () => {
    const rows: CatalogVerifyCheck[] = REQUIRED_CATALOG_CONTRACT_CHECKS.map(
      (name) => ({
        name,
        ok: name !== "column:products.version",
        detail: name === "column:products.version" ? "wrong type" : "ok",
      }),
    );
    const summary = evaluateCatalogContractResults(rows);
    expect(summary.ok).toBe(false);
    expect(summary.failed.some((f) => f.name === "column:products.version")).toBe(
      true,
    );
  });

  it("fails on missing index", () => {
    const rows: CatalogVerifyCheck[] = REQUIRED_CATALOG_CONTRACT_CHECKS.map(
      (name) => ({
        name,
        ok: name !== "index:idx_products_internal_sku",
      }),
    );
    expect(evaluateCatalogContractResults(rows).ok).toBe(false);
  });

  it("fails when EXECUTE is too broad", () => {
    const rows: CatalogVerifyCheck[] = REQUIRED_CATALOG_CONTRACT_CHECKS.map(
      (name) => ({
        name,
        ok: name !== "rpc:catalog_verify_admin_contracts.no_public_execute",
        detail: "anon has EXECUTE",
      }),
    );
    expect(evaluateCatalogContractResults(rows).ok).toBe(false);
  });

  it("fails when RLS missing", () => {
    const rows: CatalogVerifyCheck[] = REQUIRED_CATALOG_CONTRACT_CHECKS.map(
      (name) => ({
        name,
        ok: name !== "rls:product_media.enabled",
      }),
    );
    expect(evaluateCatalogContractResults(rows).ok).toBe(false);
  });

  it("fails on duplicate SKU data check", () => {
    const rows: CatalogVerifyCheck[] = REQUIRED_CATALOG_CONTRACT_CHECKS.map(
      (name) => ({
        name,
        ok: name !== "data:duplicate_sku",
        detail: "2 duplicate SKU groups",
      }),
    );
    expect(evaluateCatalogContractResults(rows).ok).toBe(false);
  });

  it("passes when all required checks are present and ok", () => {
    const rows: CatalogVerifyCheck[] = REQUIRED_CATALOG_CONTRACT_CHECKS.map(
      (name) => ({ name, ok: true }),
    );
    expect(evaluateCatalogContractResults(rows).ok).toBe(true);
  });
});

describe("catalog alignment", () => {
  it("flags duplicate slugs", () => {
    const dup: Product[] = [
      { ...seedProducts[0], id: "a", slug: "same-slug" },
      { ...seedProducts[0], id: "b", slug: "same-slug" },
    ];
    const { blockers } = runAlignmentReport(dup);
    expect(blockers.some((b) => b.classification === "DUPLICATE_SLUG")).toBe(true);
  });

  it("flags duplicate SKUs", () => {
    const dup: Product[] = [
      { ...seedProducts[0], id: "a", slug: "one", internalSku: "SKU-1" },
      { ...seedProducts[1], id: "b", slug: "two", internalSku: "SKU-1" },
    ];
    const { blockers } = runAlignmentReport(dup);
    expect(blockers.some((b) => b.classification === "DUPLICATE_SKU")).toBe(true);
  });

  it("reports missing commercial mapping for unknown shop slug", () => {
    const shop: Product[] = [
      { ...seedProducts[0], slug: "no-commercial-for-this-slug-xyz" },
    ];
    const { rows } = runAlignmentReport(shop);
    expect(
      rows.some((r) => r.classification === "MISSING_COMMERCIAL_MAPPING"),
    ).toBe(true);
  });

  it("seed alignment has no duplicate slug/sku blockers", () => {
    const { blockers } = runAlignmentReport(seedProducts);
    const hard = blockers.filter((b: AlignmentRow) =>
      ["DUPLICATE_SKU", "DUPLICATE_SLUG"].includes(b.classification),
    );
    expect(hard).toEqual([]);
  });
});

describe("media policy & service role", () => {
  it("rejects disallowed MIME and oversized uploads", () => {
    expect(
      mediaUploadMetaSchema.safeParse({
        productId: "00000000-0000-4000-8000-000000000001",
        mimeType: "application/pdf",
        byteSize: 100,
        fileName: "x.pdf",
      }).success,
    ).toBe(false);
    expect(
      mediaUploadMetaSchema.safeParse({
        productId: "00000000-0000-4000-8000-000000000001",
        mimeType: "image/png",
        byteSize: 9_000_000,
        fileName: "x.png",
      }).success,
    ).toBe(false);
  });

  it("CONTENT may manage media; cannot legal approve", () => {
    expect(hasPermission("CONTENT", "products.manage_media")).toBe(true);
    expect(hasPermission("CONTENT", "products.legal_approve")).toBe(false);
  });

  it("admin client module stays server-only", async () => {
    const fs = await import("node:fs");
    const admin = fs.readFileSync("src/lib/database/admin.ts", "utf8");
    expect(admin).toContain('import "server-only"');
    const client = fs.readFileSync("src/lib/database/client.ts", "utf8");
    expect(client).not.toContain("getSupabaseSecretKey");
  });
});

describe("checkout remains OFF / no auto legal", () => {
  const prev = process.env.CHECKOUT_ENABLED;

  beforeEach(() => {
    delete process.env.CHECKOUT_ENABLED;
  });

  afterEach(() => {
    process.env.CHECKOUT_ENABLED = prev;
  });

  it("checkout flag defaults off", () => {
    expect(isDirectCheckoutEnabled()).toBe(false);
  });

  it("canAddToDirectCheckout is false when flag off even for published FIXED", () => {
    const p: Product = {
      ...seedProducts[0],
      status: "PUBLISHED",
      priceCents: 10000,
      fromPriceCents: null,
      billingType: "ONE_TIME",
      priceMode: "FIXED",
      priceStatus: "PUBLISHED",
      legalStatus: "APPROVED_FOR_B2B",
      publicationReady: true,
      audienceB2b: true,
    };
    expect(canAddToDirectCheckout(p)).toBe(false);
  });

  it("legal approval permission is sensitive and OWNER-only", () => {
    expect(SENSITIVE_PERMISSIONS.has("products.legal_approve")).toBe(true);
    expect(hasPermission("ADMIN", "products.legal_approve")).toBe(false);
    expect(hasPermission("OWNER", "products.legal_approve")).toBe(true);
  });

  it("migration SQL does not set legal approvals to approved by default", async () => {
    const fs = await import("node:fs");
    const sql = fs.readFileSync(
      "supabase/migrations/20260716200000_catalog_admin.sql",
      "utf8",
    );
    expect(sql).toMatch(/legal_status legal_approval_status NOT NULL DEFAULT 'NOT_REVIEWED'/);
    expect(sql).toMatch(/publication_ready BOOLEAN NOT NULL DEFAULT FALSE/);
    expect(sql).not.toMatch(/DEFAULT 'APPROVED_FOR_/);
  });
});

describe("catalog verify CLI messaging", () => {
  it("documents FAIL when RPC missing", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("scripts/verify-catalog-admin.ts", "utf8");
    expect(src).toContain("RESULT: FAIL — catalog verification RPC missing");
    expect(src).toContain("catalog_verify_admin_contracts");
  });
});
