import { describe, expect, it } from "vitest";
import {
  hasMinimalEnglishContent,
  isPublishableTranslationStatus,
  mergeProductForLocale,
} from "@/lib/commerce/product-locale-merge";
import type { Product, ProductTranslation, ProductTranslationStatus } from "@/types";

function baseProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    slug: "starter-website",
    name: "Starter Website",
    shortDescription: "EN short description",
    fullDescription: "EN full description",
    categorySlug: "websites",
    categoryName: "Websites",
    priceCents: 99900,
    fromPriceCents: null,
    billingType: "ONE_TIME",
    deliveryTime: "2-3 weeks",
    includedItems: ["Up to 5 pages"],
    excludedItems: [],
    extensions: [],
    faqs: [],
    status: "PUBLISHED",
    featured: false,
    sortOrder: 1,
    seoTitle: "EN SEO title",
    seoDescription: "EN SEO description",
    ctaLabel: "Buy now",
    benefits: ["Fast", "Reliable"],
    ...overrides,
  };
}

function translation(overrides: Partial<ProductTranslation> = {}): ProductTranslation {
  return {
    locale: "nl",
    name: "Starter Website NL",
    slug: null,
    shortDescription: "NL korte omschrijving",
    fullDescription: "NL volledige omschrijving",
    benefits: ["Snel", "Betrouwbaar"],
    includedItems: ["Tot 5 pagina's"],
    excludedItems: [],
    ctaLabel: "Koop nu",
    quoteCtaLabel: null,
    seoTitle: "NL SEO titel",
    seoDescription: "NL SEO omschrijving",
    deliveryTime: "2-3 weken",
    targetAudience: null,
    workflow: null,
    warnings: null,
    status: "published",
    ...overrides,
  };
}

describe("isPublishableTranslationStatus", () => {
  it("only allows 'published' for public (non-preview) callers", () => {
    expect(isPublishableTranslationStatus("published")).toBe(true);
    expect(isPublishableTranslationStatus("approved")).toBe(false);
    expect(isPublishableTranslationStatus("machine_translated")).toBe(false);
    expect(isPublishableTranslationStatus("needs_review")).toBe(false);
    expect(isPublishableTranslationStatus("draft")).toBe(false);
    expect(isPublishableTranslationStatus("stale")).toBe(false);
    expect(isPublishableTranslationStatus(null)).toBe(false);
    expect(isPublishableTranslationStatus(undefined)).toBe(false);
  });

  it("additionally allows 'approved' only when allowApprovedPreview is set (admin preview)", () => {
    expect(
      isPublishableTranslationStatus("approved", { allowApprovedPreview: true }),
    ).toBe(true);
    expect(
      isPublishableTranslationStatus("published", { allowApprovedPreview: true }),
    ).toBe(true);
  });

  it("never allows machine_translated to be treated as publishable, even in preview mode", () => {
    expect(
      isPublishableTranslationStatus("machine_translated", {
        allowApprovedPreview: true,
      }),
    ).toBe(false);
  });
});

describe("hasMinimalEnglishContent", () => {
  it("requires a non-empty name and short description", () => {
    expect(hasMinimalEnglishContent(baseProduct())).toBe(true);
    expect(hasMinimalEnglishContent(baseProduct({ name: "" }))).toBe(false);
    expect(hasMinimalEnglishContent(baseProduct({ name: "   " }))).toBe(false);
    expect(hasMinimalEnglishContent(baseProduct({ shortDescription: "" }))).toBe(false);
  });
});

describe("mergeProductForLocale", () => {
  it("returns the EN row unchanged (and untouched) for locale 'en'", () => {
    const product = baseProduct();
    const result = mergeProductForLocale(product, "en", translation());
    expect(result?.product).toBe(product);
    expect(result?.translationApplied).toBe(false);
    expect(result?.usedStatus).toBeNull();
  });

  it("falls back to the EN row when there is no translation row", () => {
    const product = baseProduct();
    const result = mergeProductForLocale(product, "nl", null);
    expect(result?.product).toBe(product);
    expect(result?.translationApplied).toBe(false);
  });

  it("falls back to the EN row when the translation row is for a different locale", () => {
    const product = baseProduct();
    const result = mergeProductForLocale(product, "nl", translation({ locale: "en" }));
    expect(result?.translationApplied).toBe(false);
    expect(result?.product.name).toBe(product.name);
  });

  it("returns 'controlled unavailable' (null) when the canonical EN row lacks minimum content", () => {
    const broken = baseProduct({ name: "" });
    expect(mergeProductForLocale(broken, "en", null)).toBeNull();
    expect(mergeProductForLocale(broken, "nl", translation())).toBeNull();
  });

  const NON_PUBLIC_STATUSES: ProductTranslationStatus[] = [
    "draft",
    "machine_translated",
    "needs_review",
    "stale",
  ];

  it.each(NON_PUBLIC_STATUSES)(
    "never overlays a '%s' translation onto the public product (no leak)",
    (status) => {
      const product = baseProduct();
      const result = mergeProductForLocale(product, "nl", translation({ status }));
      expect(result?.translationApplied).toBe(false);
      expect(result?.usedStatus).toBe(status);
      expect(result?.product.name).toBe(product.name);
      expect(result?.product.shortDescription).toBe(product.shortDescription);
    },
  );

  it("does not overlay an 'approved' translation for regular (non-preview) callers", () => {
    const product = baseProduct();
    const result = mergeProductForLocale(product, "nl", translation({ status: "approved" }));
    expect(result?.translationApplied).toBe(false);
    expect(result?.product.name).toBe(product.name);
  });

  it("overlays an 'approved' translation only when allowApprovedPreview is set (admin preview)", () => {
    const product = baseProduct();
    const result = mergeProductForLocale(product, "nl", translation({ status: "approved" }), {
      allowApprovedPreview: true,
    });
    expect(result?.translationApplied).toBe(true);
    expect(result?.product.name).toBe("Starter Website NL");
  });

  it("overlays a 'published' translation's copy fields", () => {
    const product = baseProduct();
    const nl = translation();
    const result = mergeProductForLocale(product, "nl", nl);
    expect(result?.translationApplied).toBe(true);
    expect(result?.usedStatus).toBe("published");
    expect(result?.product.name).toBe(nl.name);
    expect(result?.product.shortDescription).toBe(nl.shortDescription);
    expect(result?.product.fullDescription).toBe(nl.fullDescription);
    expect(result?.product.includedItems).toEqual(nl.includedItems);
    expect(result?.product.seoTitle).toBe(nl.seoTitle);
    expect(result?.product.seoDescription).toBe(nl.seoDescription);
    // Non-localized fields (price, ids, status) are never touched by the merge.
    expect(result?.product.id).toBe(product.id);
    expect(result?.product.slug).toBe(product.slug);
    expect(result?.product.priceCents).toBe(product.priceCents);
    expect(result?.product.billingType).toBe(product.billingType);
  });

  it("falls back to the EN field per-field when the translation leaves it empty", () => {
    const product = baseProduct();
    const nl = translation({ name: "", includedItems: [], ctaLabel: null });
    const result = mergeProductForLocale(product, "nl", nl);
    expect(result?.translationApplied).toBe(true);
    expect(result?.product.name).toBe(product.name);
    expect(result?.product.includedItems).toEqual(product.includedItems);
    expect(result?.product.ctaLabel).toBe(product.ctaLabel);
    // Fields the translation DID provide are still applied.
    expect(result?.product.shortDescription).toBe(nl.shortDescription);
  });
});
