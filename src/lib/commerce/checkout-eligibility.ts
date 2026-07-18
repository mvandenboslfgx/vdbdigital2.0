import type { BillingType, Product } from "@/types";
import {
  canPublishForB2b,
  canPublishForB2c,
  commercialCatalog,
  type CommercialCatalogItem,
  type LegalApprovalStatus,
  type PriceApprovalStatus,
} from "@/config/commercial/pricing";
import { isDirectCheckoutEnabled } from "@/config/features";
import {
  buildP05CommercialItem,
  P05_TEST_SKU_SLUG,
} from "@/config/commercial/p05-test-sku";
import { calculateVatFromSubtotal } from "@/lib/utilities/vat";
import {
  isLegacyTawkProduct,
  LEGACY_TAWK_PUBLIC_DENIED_MESSAGE,
} from "@/lib/commerce/tawk-legacy-blocklist";

export type CheckoutPriceMode = "FIXED" | "STARTING_FROM" | "QUOTE_ONLY";
export type CheckoutCustomerType = "B2B" | "B2C";

function testOnlyCatalogExtras(): CommercialCatalogItem[] {
  if (process.env.NODE_ENV !== "test") return [];
  if (process.env.P05_INCLUDE_APPROVED_SKU !== "1") return [];
  const mode = (process.env.P05_APPROVAL_MODE ?? "both") as
    | "none"
    | "b2b"
    | "b2c"
    | "both";
  return [buildP05CommercialItem(mode)];
}

export function resolvePriceMode(product: Product): CheckoutPriceMode {
  if (
    product.priceMode === "FIXED" ||
    product.priceMode === "STARTING_FROM" ||
    product.priceMode === "QUOTE_ONLY"
  ) {
    return product.priceMode;
  }
  if (product.billingType === "QUOTE_ONLY" || product.billingType === "FREE") {
    return "QUOTE_ONLY";
  }
  if (product.fromPriceCents !== null) {
    return "STARTING_FROM";
  }
  if (product.priceCents !== null) {
    return "FIXED";
  }
  return "QUOTE_ONLY";
}

export function isRecurringBilling(billingType: BillingType): boolean {
  return billingType === "MONTHLY" || billingType === "YEARLY";
}

export function findCommercialCatalogItem(
  productSlug: string,
): CommercialCatalogItem | undefined {
  const extras = testOnlyCatalogExtras();
  return (
    extras.find((item) => item.slug === productSlug) ??
    commercialCatalog.find((item) => item.slug === productSlug)
  );
}

export { canPublishForB2b, canPublishForB2c, P05_TEST_SKU_SLUG };

/**
 * Prefer DB commercial fields when present; otherwise undefined so callers
 * fall back to the central commercial catalog config.
 */
export function commercialItemFromProductRow(
  product: Product,
): CommercialCatalogItem | undefined {
  const hasDbCommercial =
    product.priceStatus !== undefined ||
    product.legalStatus !== undefined ||
    product.publicationReady !== undefined;

  if (!hasDbCommercial) return undefined;

  const mode = resolvePriceMode(product);
  const vatPercent = product.vatPercent ?? 21;
  const vatRate = vatPercent / 100;
  let pricing: CommercialCatalogItem["pricing"] = null;

  if (mode !== "QUOTE_ONLY" && product.priceCents !== null) {
    const stored = product.priceCents;
    if (product.priceIncludesVat) {
      // Integer-safe reverse from incl → excl using cent arithmetic
      const exclVatCents = Math.round((stored * 100) / (100 + vatPercent));
      const vatCents = calculateVatFromSubtotal(exclVatCents, vatRate);
      pricing = {
        exclVatCents,
        inclVatCents: exclVatCents + vatCents,
        vatRate,
        mode:
          mode === "FIXED"
            ? "fixed"
            : mode === "STARTING_FROM"
              ? "starting_from"
              : "quote_only",
      };
    } else {
      const vatCents = calculateVatFromSubtotal(stored, vatRate);
      pricing = {
        exclVatCents: stored,
        inclVatCents: stored + vatCents,
        vatRate,
        mode:
          mode === "FIXED"
            ? "fixed"
            : mode === "STARTING_FROM"
              ? "starting_from"
              : "quote_only",
      };
    }
  }

  return {
    id: product.id,
    slug: product.slug,
    category: "custom",
    nameEn: product.name,
    nameNl: product.name,
    pricing,
    quoteOnly: mode === "QUOTE_ONLY" || pricing === null,
    oneTime: product.billingType === "ONE_TIME",
    monthly: product.billingType === "MONTHLY",
    b2b: product.audienceB2b ?? true,
    b2c: product.audienceB2c ?? false,
    legalType: "standard_service",
    priceStatus: product.priceStatus ?? "DRAFT",
    legalStatus: product.legalStatus ?? "NOT_REVIEWED",
    foundingEligible: false,
    foundingExclVatCents: null,
    publicationReady: product.publicationReady ?? false,
  };
}

export function hasLegalApprovalForCheckout(
  product: Product,
  customerType: CheckoutCustomerType,
): boolean {
  const item =
    commercialItemFromProductRow(product) ??
    findCommercialCatalogItem(product.slug);
  if (!item) {
    return false;
  }
  if (customerType === "B2C") {
    return canPublishForB2c(item);
  }
  return canPublishForB2b(item);
}

export function canAddToDirectCheckout(product: Product): boolean {
  if (isLegacyTawkProduct(product)) return false;
  if (!isDirectCheckoutEnabled()) return false;
  if (product.status !== "PUBLISHED") return false;
  if (resolvePriceMode(product) !== "FIXED") return false;
  if (isRecurringBilling(product.billingType)) return false;
  if (product.priceCents === null || product.priceCents <= 0) return false;
  return hasLegalApprovalForCheckout(product, "B2B");
}

export function assertCheckoutAllowedForCustomer(
  product: Product,
  customerType: CheckoutCustomerType,
): string | null {
  if (isLegacyTawkProduct(product)) {
    return LEGACY_TAWK_PUBLIC_DENIED_MESSAGE;
  }
  if (!isDirectCheckoutEnabled()) {
    return "Direct checkout is temporarily disabled";
  }
  if (customerType !== "B2B" && customerType !== "B2C") {
    return "Unknown customer type";
  }
  if (resolvePriceMode(product) === "STARTING_FROM") {
    return `${product.name} is a starting-from price and requires a quote`;
  }
  if (resolvePriceMode(product) !== "FIXED") {
    return `${product.name} cannot be purchased via direct checkout`;
  }
  if (isRecurringBilling(product.billingType)) {
    return `${product.name} is a recurring product and cannot use one-time checkout`;
  }
  if (!hasLegalApprovalForCheckout(product, customerType)) {
    return `${product.name} is not approved for ${customerType} checkout`;
  }
  if (product.priceCents === null) {
    return `${product.name} has no fixed price`;
  }
  return null;
}

/** Whether any legally approved FIXED one-time catalog SKU exists (production catalog) */
export function hasLegallyApprovedFixedSku(
  customerType: CheckoutCustomerType = "B2B",
): boolean {
  return commercialCatalog.some((item) => {
    if (item.quoteOnly || item.monthly) return false;
    if (!item.pricing || item.pricing.mode !== "fixed") return false;
    if (customerType === "B2C") return canPublishForB2c(item);
    return canPublishForB2b(item);
  });
}

export function getCatalogApprovalSnapshot(slug: string): {
  priceStatus: PriceApprovalStatus | null;
  legalStatus: LegalApprovalStatus | null;
  publicationReady: boolean;
} {
  const item = findCommercialCatalogItem(slug);
  if (!item) {
    return { priceStatus: null, legalStatus: null, publicationReady: false };
  }
  return {
    priceStatus: item.priceStatus,
    legalStatus: item.legalStatus,
    publicationReady: item.publicationReady,
  };
}
