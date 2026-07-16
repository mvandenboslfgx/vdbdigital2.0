/**
 * P0.5 fixture — eligibility-chain test SKU only.
 * Not a public shop product. Never set publicationReady=true in production catalog.
 */
import type { CommercialCatalogItem } from "@/config/commercial/pricing";
import { priceFromExclEuros } from "@/config/commercial/pricing";
import type { BillingType, Product } from "@/types";
import type { CheckoutCustomerType } from "@/lib/commerce/checkout-eligibility";

export const P05_TEST_SKU_SLUG = "p05-gate-fixed-test";

export function buildP05CommercialItem(
  approval: "none" | "b2b" | "b2c" | "both" = "none",
): CommercialCatalogItem {
  const legalStatus =
    approval === "both"
      ? "APPROVED_FOR_BOTH"
      : approval === "b2b"
        ? "APPROVED_FOR_B2B"
        : approval === "b2c"
          ? "APPROVED_FOR_B2C"
          : "LEGAL_REVIEW_REQUIRED";

  const published = approval !== "none";

  return {
    id: "p05-gate-fixed-test",
    slug: P05_TEST_SKU_SLUG,
    category: "support",
    nameEn: "P0.5 Gate FIXED Test SKU",
    nameNl: "P0.5 Gate FIXED Test SKU",
    pricing: priceFromExclEuros(100, "fixed"),
    quoteOnly: false,
    oneTime: true,
    monthly: false,
    b2b: approval === "b2b" || approval === "both",
    b2c: approval === "b2c" || approval === "both",
    legalType: "standard_service",
    priceStatus: published ? "APPROVED" : "DRAFT",
    legalStatus,
    foundingEligible: false,
    foundingExclVatCents: null,
    publicationReady: published,
  };
}

export function buildP05Product(overrides: Partial<Product> = {}): Product {
  return {
    id: "00000000-0000-4000-8000-000000000105",
    slug: P05_TEST_SKU_SLUG,
    name: "P0.5 Gate FIXED Test SKU",
    shortDescription: "Staging/test FIXED SKU for release gate — not for public sale",
    fullDescription: "Internal release-gate fixture",
    categorySlug: "support",
    categoryName: "Support",
    priceCents: 12100,
    fromPriceCents: null,
    billingType: "ONE_TIME" as BillingType,
    deliveryTime: "n/a",
    includedItems: [],
    excludedItems: [],
    extensions: [],
    faqs: [],
    status: "PUBLISHED",
    featured: false,
    sortOrder: 9999,
    seoTitle: "",
    seoDescription: "",
    ...overrides,
  };
}

export function customerTypeBlockedHint(
  approval: "b2b" | "b2c",
  customerType: CheckoutCustomerType,
): boolean {
  if (approval === "b2b" && customerType === "B2C") return true;
  if (approval === "b2c" && customerType === "B2B") return true;
  return false;
}
