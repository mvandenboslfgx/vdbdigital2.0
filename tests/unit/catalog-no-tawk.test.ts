import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  classifyDbRows,
  isBlockingTawkClass,
  runNoTawkCatalogScan,
} from "../../scripts/lib/catalog-no-tawk";
import {
  containsTawkBrandMarker,
  denyLegacyTawkCatalogMutation,
  isLegacyTawkAddon,
  isLegacyTawkCatalogOffering,
  isLegacyTawkCategorySlug,
  isLegacyTawkProduct,
  isLegacyTawkProductSlug,
  LEGACY_TAWK_PUBLIC_DENIED_MESSAGE,
} from "@/lib/commerce/tawk-legacy-blocklist";
import { canAddToDirectCheckout } from "@/lib/commerce/checkout-eligibility";
import type { Product } from "@/types";

function baseProduct(over: Partial<Product> = {}): Product {
  return {
    id: "prod-ok",
    slug: "website-chat-setup",
    name: "Website chat setup",
    shortDescription: "Generic live chat wiring for your site",
    fullDescription: "Install and configure website chat without a vendor lock-in.",
    priceCents: 9900,
    fromPriceCents: null,
    billingType: "ONE_TIME",
    priceMode: "FIXED",
    status: "PUBLISHED",
    categorySlug: "automation",
    categoryName: "Automation",
    featured: false,
    deliveryTime: "",
    includedItems: [],
    excludedItems: [],
    extensions: [],
    faqs: [],
    sortOrder: 1,
    seoTitle: "Website chat setup",
    seoDescription: "Generic chat service",
    publicationReady: true,
    legalStatus: "APPROVED_FOR_B2B",
    priceStatus: "PUBLISHED",
    ...over,
  };
}

describe("catalog:verify-no-tawk fail-closed rules", () => {
  it("fails active Tawk product name / slug / SEO / category / addon", () => {
    expect(isLegacyTawkProduct({ name: "Tawk.to Live Chat Setup" })).toBe(true);
    expect(isLegacyTawkProductSlug("tawk-to-livechat-installatie")).toBe(true);
    expect(isLegacyTawkProductSlug("livechat-met-tawk")).toBe(true);
    expect(
      isLegacyTawkCatalogOffering({
        slug: "ok",
        seoTitle: "Tawk.to installatie | Shop",
      }),
    ).toBe(true);
    expect(isLegacyTawkCategorySlug("livechat")).toBe(true);
    expect(
      isLegacyTawkAddon({
        slug: "tawk-addon",
        name: "Tawk widget",
      }),
    ).toBe(true);
  });

  it("does not auto-block brand-free chat services", () => {
    const p = baseProduct();
    expect(isLegacyTawkProduct(p)).toBe(false);
    expect(isLegacyTawkCatalogOffering(p)).toBe(false);
    expect(containsTawkBrandMarker("Website chat en support")).toBe(false);
    expect(isLegacyTawkAddon({ slug: "website-chat", name: "Website chat" })).toBe(
      false,
    );
  });

  it("denies legacy mutations with brand-free Dutch message", () => {
    expect(
      denyLegacyTawkCatalogMutation({
        slug: "tawk-to-livechat-installatie",
      }),
    ).toBe(LEGACY_TAWK_PUBLIC_DENIED_MESSAGE);
    expect(LEGACY_TAWK_PUBLIC_DENIED_MESSAGE).toBe(
      "Dit product of deze dienst wordt niet meer aangeboden.",
    );
    expect(LEGACY_TAWK_PUBLIC_DENIED_MESSAGE).not.toMatch(/tawk/i);
  });

  it("archived legacy DB row is non-blocking; published is blocking", () => {
    const archived = classifyDbRows([
      {
        kind: "product",
        id: "1",
        slug: "tawk-to-livechat-installatie",
        name: "Tawk.to Live Chat",
        status: "ARCHIVED",
        internalSku: "TAWK-LIVECHAT-SETUP",
      },
    ]);
    expect(archived.every((m) => !m.blocking || m.classification === "ARCHIVED_PRODUCT")).toBe(
      true,
    );
    expect(archived.some((m) => m.classification === "ARCHIVED_PRODUCT")).toBe(true);

    const active = classifyDbRows([
      {
        kind: "product",
        id: "2",
        slug: "tawk-to-livechat-installatie",
        name: "Tawk.to Live Chat",
        status: "PUBLISHED",
        internalSku: "TAWK-LIVECHAT-SETUP",
      },
    ]);
    expect(active.some((m) => m.blocking)).toBe(true);
    expect(active.some((m) => m.classification === "ACTIVE_PRODUCT")).toBe(true);
    expect(active.some((m) => m.classification === "PRODUCT_SLUG")).toBe(true);
  });

  it("legacy product is not checkout-eligible and not publicly sellable", () => {
    const legacy = baseProduct({
      id: "prod-tawk-installatie",
      slug: "tawk-to-livechat-installatie",
      name: "Tawk.to Live Chat Setup",
      internalSku: "TAWK-LIVECHAT-SETUP",
    });
    expect(canAddToDirectCheckout(legacy)).toBe(false);
  });

  it("catalog-actions and import paths use public deny message", () => {
    const src = readFileSync("src/server/actions/catalog-actions.ts", "utf8");
    expect(src).toContain("LEGACY_TAWK_PUBLIC_DENIED_MESSAGE");
    expect(src).toContain("isLegacyTawkAddon");
    expect(src).not.toMatch(/legacy provider-SKU geweigerd/);
  });

  it("repo scan: blockers empty; regression + migration matches allowed", () => {
    const { blockers, allowed } = runNoTawkCatalogScan();
    expect(blockers, JSON.stringify(blockers, null, 2)).toEqual([]);
    expect(
      allowed.some((m) => m.classification === "REGRESSION_TEST"),
    ).toBe(true);
    expect(
      allowed.some((m) => m.classification === "LEGACY_CLEANUP_MIGRATION"),
    ).toBe(true);
    for (const m of allowed) {
      expect(isBlockingTawkClass(m.classification)).toBe(false);
    }
  });

  it("CSV restore of legacy SKU is recognized as deny input", () => {
    const denied = denyLegacyTawkCatalogMutation({
      slug: "tawk-to-livechat-installatie",
      name: "Anything",
      internalSku: "TAWK-LIVECHAT-SETUP",
    });
    expect(denied).toBe(LEGACY_TAWK_PUBLIC_DENIED_MESSAGE);
  });

  it("admin publish of legacy product is denied by helper", () => {
    expect(
      denyLegacyTawkCatalogMutation({
        id: "prod-tawk-installatie",
        slug: "ok-slug",
        name: "Ok name",
      }),
    ).toBe(LEGACY_TAWK_PUBLIC_DENIED_MESSAGE);
  });
});
