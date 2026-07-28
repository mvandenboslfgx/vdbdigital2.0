import { describe, expect, it } from "vitest";
import type { Product } from "@/types";
import {
  isPublicShopProduct,
  publicShopCtaLabel,
  publicShopPriceDisplay,
} from "@/lib/commerce/public-shop-gates";

function base(overrides: Partial<Product> = {}): Product {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    slug: "test-product",
    name: "Test Product",
    shortDescription: "Short",
    fullDescription: "Full",
    categorySlug: "software-licenties",
    categoryName: "Software",
    priceCents: null,
    fromPriceCents: null,
    billingType: "ONE_TIME",
    deliveryTime: "",
    includedItems: [],
    excludedItems: [],
    extensions: [],
    faqs: [],
    status: "PUBLISHED",
    featured: false,
    sortOrder: 1,
    seoTitle: "",
    seoDescription: "",
    primaryImagePath: "/products/groups/tools.svg",
    isConcept: false,
    priceMode: "QUOTE_ONLY",
    legalStatus: "APPROVED_FOR_BOTH",
    priceStatus: "APPROVED",
    publicationReady: true,
    ...overrides,
  };
}

describe("public shop catalog gates", () => {
  it("allows published Owner products with image and copy", () => {
    expect(isPublicShopProduct(base())).toBe(true);
  });

  it("blocks entertainment/IPTV slug fragments", () => {
    expect(isPublicShopProduct(base({ slug: "netflix-shared" }))).toBe(false);
    expect(isPublicShopProduct(base({ slug: "iptv-premium" }))).toBe(false);
  });

  it("blocks missing legal/price approval", () => {
    expect(isPublicShopProduct(base({ legalStatus: "NOT_REVIEWED" }))).toBe(
      false,
    );
    expect(isPublicShopProduct(base({ priceStatus: "DRAFT" }))).toBe(false);
  });

  it("blocks missing image or concept/draft", () => {
    expect(isPublicShopProduct(base({ primaryImagePath: null }))).toBe(false);
    expect(isPublicShopProduct(base({ isConcept: true }))).toBe(false);
    expect(isPublicShopProduct(base({ status: "DRAFT" }))).toBe(false);
  });

  it("never invents a fixed price for quote-only products", () => {
    const price = publicShopPriceDisplay(
      base({
        priceMode: "QUOTE_ONLY",
        priceLabel: "Price and availability on request",
      }),
      "en",
    );
    expect(price.mode).toBe("on_request");
    expect(price.label).toMatch(/request|aanvraag|Price and availability/i);
  });

  it("uses Owner FIXED cents when present", () => {
    const price = publicShopPriceDisplay(
      base({
        priceMode: "FIXED",
        priceCents: 6900,
        billingType: "MONTHLY",
        priceLabel: null,
      }),
      "en",
    );
    expect(price.mode).toBe("fixed");
    expect(price.label).toMatch(/69/);
  });

  it("returns quote CTA without checkout language", () => {
    const cta = publicShopCtaLabel(base({ priceMode: "QUOTE_ONLY" }), "nl");
    expect(cta.toLowerCase()).not.toMatch(/afrekenen|checkout|mollie/);
    expect(cta.toLowerCase()).toMatch(/offerte|aanvragen|beschikbaarheid/);
  });
});
