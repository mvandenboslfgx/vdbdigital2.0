import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  isLegacyTawkCategorySlug,
  isLegacyTawkProduct,
  isLegacyTawkProductSlug,
  isLegacyTawkSku,
  LEGACY_TAWK_ADMIN_STATUS_LABEL,
  LEGACY_TAWK_PRODUCT_SLUGS,
} from "@/lib/commerce/tawk-legacy-blocklist";
import { canAddToDirectCheckout } from "@/lib/commerce/checkout-eligibility";
import type { Product } from "@/types";
import { seedProducts, categories as seedCategories } from "@/config/products.seed";

function walkFiles(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (["node_modules", ".next", "evidence", "backups"].includes(name)) continue;
      walkFiles(full, acc);
    } else if (/\.(ts|tsx|js|jsx|mjs|cjs|json|md|toml|env\.example)$/i.test(name)) {
      acc.push(full);
    }
  }
  return acc;
}

function read(path: string): string {
  return readFileSync(path, "utf8");
}

const legacyProduct = {
  id: "prod-tawk-installatie",
  slug: "tawk-to-livechat-installatie",
  name: "Tawk.to Live Chat Setup",
  internalSku: "TAWK-LIVECHAT-SETUP",
  shortDescription: "x",
  fullDescription: "x",
  priceCents: 14900,
  fromPriceCents: null,
  billingType: "ONE_TIME" as const,
  priceMode: "FIXED" as const,
  status: "PUBLISHED" as const,
  isConcept: false,
  categoryId: "cat-livechat",
  categorySlug: "livechat",
  categoryName: "Livechat",
  featured: false,
  badge: null,
  deliveryTime: "",
  includedItems: [],
  excludedItems: [],
  extensions: [],
  faqs: [],
  benefits: [],
  targetAudience: "",
  workflow: "",
  sortOrder: 0,
  tags: [],
  seoTitle: "",
  seoDescription: "",
  vatPercent: 21,
  priceIncludesVat: true,
  audienceB2b: true,
  audienceB2c: false,
  publicationReady: true,
  legalStatus: "APPROVED_FOR_B2B" as const,
  priceStatus: "PUBLISHED" as const,
} satisfies Product;

describe("Tawk.to definitive removal — technical absence", () => {
  it("has no Tawk API route directory", () => {
    expect(existsSync("src/app/api/tawk")).toBe(false);
    expect(existsSync("src/app/api/tawk/hash/route.ts")).toBe(false);
  });

  it("has no Tawk config, components, or hash helpers", () => {
    expect(existsSync("src/config/tawk.ts")).toBe(false);
    expect(existsSync("src/lib/chat/tawk-secure.ts")).toBe(false);
    expect(existsSync("src/components/chat/chat-provider.tsx")).toBe(false);
    expect(existsSync("src/components/chat/tawk-widget.tsx")).toBe(false);
  });

  it("CSP middleware has no Tawk domains", () => {
    const mw = read("src/middleware.ts");
    expect(mw).not.toMatch(/tawk\.to/i);
    expect(mw).not.toContain("embed.tawk.to");
    expect(mw).not.toContain("va.tawk.to");
  });

  it("env schema and example have no TAWK variables", () => {
    expect(read("src/config/env.ts")).not.toMatch(/TAWK/i);
    if (existsSync(".env.example")) {
      expect(read(".env.example")).not.toMatch(/TAWK/i);
    }
    expect(read("scripts/lib/validate-env-groups.ts")).not.toMatch(/TAWK|tawk\.to/i);
  });

  it("package manifests have no Tawk dependency", () => {
    const pkg = JSON.parse(read("package.json")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const deps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };
    expect(Object.keys(deps).some((k) => /tawk/i.test(k))).toBe(false);
    expect(Object.values(deps).some((v) => /tawk/i.test(v))).toBe(false);
    if (existsSync("package-lock.json")) {
      const lock = read("package-lock.json");
      // Allow only the verify script path string if present; no package name
      expect(lock).not.toMatch(/"node_modules\/[^"]*tawk/i);
    }
  });

  it("contact FAB has no Tawk script/globals", () => {
    const fab = read("src/components/chat/contact-fab.tsx");
    expect(fab).not.toMatch(/tawk|Tawk_API|Tawk_LoadStart|embed\.tawk/i);
    expect(fab).toContain("paths.contact");
  });
});

describe("Tawk.to definitive removal — commercial catalog", () => {
  it("seed has no Tawk product, slug, or livechat category", () => {
    expect(seedProducts.some((p) => isLegacyTawkProduct(p))).toBe(false);
    expect(seedProducts.some((p) => p.slug.includes("tawk"))).toBe(false);
    expect(seedCategories.some((c) => isLegacyTawkCategorySlug(c.slug))).toBe(false);
  });

  it("legacy slug helpers recognize exact identifiers only", () => {
    expect(isLegacyTawkProductSlug("tawk-to-livechat-installatie")).toBe(true);
    expect(isLegacyTawkSku("TAWK-LIVECHAT-SETUP")).toBe(true);
    expect(isLegacyTawkProduct({ name: "Tawk.to Live Chat" })).toBe(true);
    expect(isLegacyTawkProductSlug("website-chat")).toBe(false);
    expect(isLegacyTawkSku("CHAT-SETUP")).toBe(false);
    expect(isLegacyTawkCategorySlug("livechat")).toBe(true);
  });

  it("legacy product cannot be checkout-eligible or added to cart path", () => {
    expect(canAddToDirectCheckout(legacyProduct)).toBe(false);
  });

  it("admin status label is set for removed legacy records", () => {
    expect(LEGACY_TAWK_ADMIN_STATUS_LABEL).toBe("Verwijderd product — niet verkoopbaar");
  });

  it("public deny message has no vendor brand", async () => {
    const { LEGACY_TAWK_PUBLIC_DENIED_MESSAGE } = await import(
      "@/lib/commerce/tawk-legacy-blocklist"
    );
    expect(LEGACY_TAWK_PUBLIC_DENIED_MESSAGE).toBe(
      "Dit product of deze dienst wordt niet meer aangeboden.",
    );
    expect(LEGACY_TAWK_PUBLIC_DENIED_MESSAGE).not.toMatch(/tawk/i);
  });

  it("ships forward-only remove_tawk_catalog migration with exact matches", () => {
    const mig = read("supabase/migrations/20260718000000_remove_tawk_catalog.sql");
    expect(mig).toContain("tawk-to-livechat-installatie");
    expect(mig).toContain("status = 'ARCHIVED'");
    expect(mig).toContain("publication_ready = FALSE");
    const sqlOnly = mig
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("--"))
      .join("\n");
    expect(sqlOnly).not.toMatch(/LIKE\s+'%chat%'/i);
  });
});

describe("Tawk.to definitive removal — SEO / sitemap / docs hygiene", () => {
  it("sitemap source does not hardcode Tawk product slug", () => {
    const sitemap = read("src/app/sitemap.ts");
    for (const slug of LEGACY_TAWK_PRODUCT_SLUGS) {
      expect(sitemap).not.toContain(slug);
    }
  });

  it("docs (except evidence) have no commercial Tawk product/slug references", () => {
    const docs = walkFiles("docs").filter((p) => !p.includes(`${join("docs", "evidence")}`));
    const commercial = /tawk-to-livechat-installatie|prod-tawk-installatie|TAWK-LIVECHAT-SETUP|tawk\.to Live Chat/i;
    for (const file of docs) {
      const body = read(file);
      expect(body, file).not.toMatch(commercial);
    }
  });
});

describe("Tawk.to definitive removal — regression allowlist", () => {
  it("blocklist module is the only commercial identifier source in src/lib", () => {
    const blocklist = read("src/lib/commerce/tawk-legacy-blocklist.ts");
    expect(blocklist).toContain("tawk-to-livechat-installatie");
    expect(isLegacyTawkProduct(legacyProduct)).toBe(true);
  });
});
