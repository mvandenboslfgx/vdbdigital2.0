import { describe, expect, it } from "vitest";
import { quotePublicProduct } from "@/lib/commerce/price-quote";
import type { Product } from "@/types";

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    slug: "rc7-catalog-probe",
    name: "Probe",
    shortDescription: "Short",
    fullDescription: "Full description long enough",
    status: "PUBLISHED",
    isConcept: false,
    publicationReady: true,
    legalStatus: "APPROVED_FOR_B2B",
    priceStatus: "APPROVED",
    priceMode: "FIXED",
    billingType: "ONE_TIME",
    priceCents: 49500,
    retailPriceCents: 49500,
    fromPriceCents: null,
    priceLabel: null,
    primaryImagePath: "/images/sample.webp",
    isActive: true,
    categoryActive: true,
    minQuantity: 1,
    maxQuantity: 5,
    categorySlug: "websites",
    categoryName: "Websites",
    featured: false,
    sortOrder: 1,
    includedItems: ["A"],
    excludedItems: [],
    extensions: [],
    requiredInput: [],
    targetAudience: "Business",
    workflow: "Intake",
    faqs: [],
    deliveryTime: "2 weeks",
    seoTitle: "Probe",
    seoDescription: "Probe",
    translations: [
      {
        locale: "nl",
        name: "Probe",
        shortDescription: "Kort",
        fullDescription: "Volledige omschrijving",
        benefits: [],
        includedItems: ["A"],
        excludedItems: [],
        seoTitle: "Probe",
        seoDescription: "Probe",
      },
      {
        locale: "en",
        name: "Probe",
        shortDescription: "Short",
        fullDescription: "Full description",
        benefits: [],
        includedItems: ["A"],
        excludedItems: [],
        seoTitle: "Probe",
        seoDescription: "Probe",
      },
    ],
    media: [
      {
        id: "m1",
        storagePath: "/images/sample.webp",
        mimeType: "image/webp",
        byteSize: 1000,
        sortOrder: 0,
        isPrimary: true,
        altTextNl: "Probe NL",
        altTextEn: "Probe EN",
      },
    ],
    ...overrides,
  } as Product;
}

describe("commerce price quote", () => {
  it("returns a preview-only server quote for a public fixed product", () => {
    const quote = quotePublicProduct(product(), 2);
    expect(quote.ok).toBe(true);
    if (quote.ok) {
      expect(quote.previewOnly).toBe(true);
      expect(quote.unitPriceCents).toBe(49500);
      expect(quote.lineTotalCents).toBe(99000);
      expect(quote.checkoutEligible).toBe(true);
    }
  });

  it("rejects quantity outside the licence range", () => {
    const quote = quotePublicProduct(product(), 9);
    expect(quote.ok).toBe(false);
    if (!quote.ok) expect(quote.code).toBe("INVALID_QUANTITY");
  });

  it("does not quote unpublished products", () => {
    const quote = quotePublicProduct(product({ status: "DRAFT", isActive: false }), 1);
    expect(quote.ok).toBe(false);
  });
});
