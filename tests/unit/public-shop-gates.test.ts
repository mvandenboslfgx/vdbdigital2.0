import { describe, expect, it } from "vitest";
import {
  isBlockedPublicShopSlug,
  isPublicShopProduct,
  publicShopPriceDisplay,
} from "@/lib/commerce/public-shop-gates";
import { localizeCategoryName } from "@/i18n/localize-category";
import { localizeProduct } from "@/i18n/localize-product";
import { formatDualPrice } from "@/lib/utilities/commercial-price";
import { getCatalogItem } from "@/config/commercial/pricing";
import type { Product } from "@/types";

function baseProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    slug: "sample-product",
    name: "Sample",
    shortDescription: "Short",
    fullDescription: "Full description long enough",
    status: "PUBLISHED",
    isConcept: false,
    publicationReady: true,
    legalStatus: "APPROVED_FOR_B2B",
    priceStatus: "APPROVED",
    priceMode: "FIXED",
    billingType: "ONE_TIME",
    priceCents: 10000,
    fromPriceCents: null,
    priceLabel: null,
    primaryImagePath: "/images/sample.webp",
    categorySlug: "websites",
    categoryName: "Websites",
    featured: false,
    sortOrder: 1,
    includedItems: ["A"],
    excludedItems: [],
    extensions: [],
    requiredInput: [],
    targetAudience: [],
    workflow: [],
    faqs: [],
    deliveryTime: null,
    seoTitle: "Sample",
    seoDescription: "Sample",
    ctaLabel: null,
    quoteCtaLabel: null,
    ...overrides,
  } as Product;
}

describe("public shop gates", () => {
  it("blocks commercial SSOT slugs including digital-partner", () => {
    expect(isBlockedPublicShopSlug("digital-partner")).toBe(true);
    expect(isBlockedPublicShopSlug("launch-website")).toBe(true);
    expect(isBlockedPublicShopSlug("website-launch-system")).toBe(true);
    expect(isBlockedPublicShopSlug("unrelated-tool")).toBe(false);
  });

  it("excludes blocked slugs from public shop even when published", () => {
    const product = baseProduct({
      slug: "digital-partner",
      name: "Digital Partner",
      categorySlug: "maatwerk",
      categoryName: "Maatwerk",
      priceMode: "QUOTE_ONLY",
      billingType: "QUOTE_ONLY",
      fromPriceCents: 50000,
    });
    expect(isPublicShopProduct(product)).toBe(false);
  });

  it("never surfaces from-price for quote-only products", () => {
    const product = baseProduct({
      priceMode: "QUOTE_ONLY",
      billingType: "QUOTE_ONLY",
      fromPriceCents: 50000,
      priceLabel: "From €500 / month — quote",
    });
    const en = publicShopPriceDisplay(product, "en");
    const nl = publicShopPriceDisplay(product, "nl");
    expect(en.mode).toBe("on_request");
    expect(en.label).toBe("Price on request");
    expect(en.label).not.toMatch(/500/);
    expect(nl.label).toBe("Prijs op aanvraag");
    expect(nl.label).not.toMatch(/500/);
  });
});

describe("category localization", () => {
  it("maps maatwerk to Custom work on EN", () => {
    expect(localizeCategoryName("maatwerk", "Maatwerk", "en")).toBe("Custom work");
    expect(localizeCategoryName("maatwerk", "Maatwerk", "nl")).toBe("Maatwerk");
  });

  it("does not leak Dutch category names on EN products", () => {
    const localized = localizeProduct(
      baseProduct({
        categorySlug: "maatwerk",
        categoryName: "Maatwerk",
      }),
      "en",
    );
    expect(localized.categoryName).toBe("Custom work");
    expect(localized.categoryName).not.toMatch(/Maatwerk/i);
  });
});

describe("digital partner SSOT", () => {
  it("shows proposal-only on shop and support via formatDualPrice", () => {
    const item = getCatalogItem("digital-partner");
    expect(item).toBeTruthy();
    expect(item!.quoteOnly).toBe(true);
    expect(item!.pricing).toBeNull();

    const en = formatDualPrice(item!, "en");
    const nl = formatDualPrice(item!, "nl");
    expect(en.amountLabel).toBe("Available by proposal");
    expect(en.amountLabel).not.toMatch(/500|From/);
    expect(nl.amountLabel).toBe("Prijs op aanvraag");
  });
});
