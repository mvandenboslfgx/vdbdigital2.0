import type { BillingType, PriceMode, Product, ProductStatus } from "@/types";
import {
  canPublishForB2b,
  canPublishForB2c,
} from "@/config/commercial/pricing";
import {
  commercialItemFromProductRow,
  findCommercialCatalogItem,
  isRecurringBilling,
  resolvePriceMode,
} from "@/lib/commerce/checkout-eligibility";
import { isDirectCheckoutEnabled } from "@/config/features";

/** Nederlandstalige redenen waarom directe checkout geblokkeerd is */
export type CheckoutBlockReasonCode =
  | "CHECKOUT_DISABLED"
  | "NOT_PUBLISHED"
  | "HIDDEN"
  | "ARCHIVED"
  | "DRAFT_OR_REVIEW"
  | "STARTING_FROM"
  | "QUOTE_ONLY"
  | "RECURRING_BILLING"
  | "MISSING_PRICE"
  | "INVALID_PRICE"
  | "NO_B2B_LEGAL"
  | "NO_B2C_LEGAL"
  | "NO_COMMERCIAL_RECORD"
  | "PRICE_NOT_APPROVED"
  | "PUBLICATION_NOT_READY";

export const CHECKOUT_BLOCK_LABELS_NL: Record<CheckoutBlockReasonCode, string> = {
  CHECKOUT_DISABLED: "Directe checkout is momenteel algemeen uitgeschakeld",
  NOT_PUBLISHED: "Product is niet gepubliceerd",
  HIDDEN: "Product is verborgen",
  ARCHIVED: "Product is gearchiveerd",
  DRAFT_OR_REVIEW: "Product staat nog als concept of in review",
  STARTING_FROM: "Prijstype is STARTING_FROM (alleen offerte)",
  QUOTE_ONLY: "Prijstype is QUOTE_ONLY (alleen offerte)",
  RECURRING_BILLING: "Billingmodel is MONTHLY of YEARLY (geen eenmalige checkout)",
  MISSING_PRICE: "Geen definitieve prijs",
  INVALID_PRICE: "Prijs is ongeldig of ontbreekt",
  NO_B2B_LEGAL: "B2B-goedkeuring ontbreekt",
  NO_B2C_LEGAL: "B2C-goedkeuring ontbreekt",
  NO_COMMERCIAL_RECORD: "Geen commercieel goedkeuringsrecord voor dit product",
  PRICE_NOT_APPROVED: "Prijsstatus is nog niet goedgekeurd",
  PUBLICATION_NOT_READY: "Publicatieklaarheid ontbreekt",
};

export function resolveStoredOrDerivedPriceMode(product: Product): PriceMode {
  return resolvePriceMode(product);
}

export function resolveCommercialItemForProduct(product: Product) {
  return (
    commercialItemFromProductRow(product) ??
    findCommercialCatalogItem(product.slug)
  );
}

export function getCheckoutBlockReasons(
  product: Product,
  customerType: "B2B" | "B2C" = "B2B",
): CheckoutBlockReasonCode[] {
  const reasons: CheckoutBlockReasonCode[] = [];

  if (!isDirectCheckoutEnabled()) {
    reasons.push("CHECKOUT_DISABLED");
  }

  const status = product.status as ProductStatus;
  if (status === "ARCHIVED") reasons.push("ARCHIVED");
  if (status === "HIDDEN") reasons.push("HIDDEN");
  if (status === "DRAFT" || status === "REVIEW") reasons.push("DRAFT_OR_REVIEW");
  if (status !== "PUBLISHED") {
    if (
      !reasons.includes("ARCHIVED") &&
      !reasons.includes("HIDDEN") &&
      !reasons.includes("DRAFT_OR_REVIEW")
    ) {
      reasons.push("NOT_PUBLISHED");
    }
  }

  const mode = resolveStoredOrDerivedPriceMode(product);
  if (mode === "STARTING_FROM") reasons.push("STARTING_FROM");
  if (mode === "QUOTE_ONLY") reasons.push("QUOTE_ONLY");

  if (isRecurringBilling(product.billingType as BillingType)) {
    reasons.push("RECURRING_BILLING");
  }

  if (product.priceCents === null || product.priceCents === undefined) {
    if (mode === "FIXED") reasons.push("MISSING_PRICE");
  } else if (product.priceCents <= 0 && mode === "FIXED") {
    reasons.push("INVALID_PRICE");
  }

  const item = resolveCommercialItemForProduct(product);
  if (!item) {
    reasons.push("NO_COMMERCIAL_RECORD");
  } else if (customerType === "B2C" && !canPublishForB2c(item)) {
    if (
      item.legalStatus !== "APPROVED_FOR_B2C" &&
      item.legalStatus !== "APPROVED_FOR_BOTH"
    ) {
      reasons.push("NO_B2C_LEGAL");
    } else if (item.priceStatus !== "APPROVED" && item.priceStatus !== "PUBLISHED") {
      reasons.push("PRICE_NOT_APPROVED");
    } else if (!item.publicationReady) {
      reasons.push("PUBLICATION_NOT_READY");
    } else {
      reasons.push("NO_B2C_LEGAL");
    }
  } else if (customerType === "B2B" && !canPublishForB2b(item)) {
    if (
      item.legalStatus !== "APPROVED_FOR_B2B" &&
      item.legalStatus !== "APPROVED_FOR_BOTH"
    ) {
      reasons.push("NO_B2B_LEGAL");
    } else if (item.priceStatus !== "APPROVED" && item.priceStatus !== "PUBLISHED") {
      reasons.push("PRICE_NOT_APPROVED");
    } else if (!item.publicationReady) {
      reasons.push("PUBLICATION_NOT_READY");
    } else {
      reasons.push("NO_B2B_LEGAL");
    }
  }

  return [...new Set(reasons)];
}

export function getCheckoutBlockLabelsNl(
  product: Product,
  customerType: "B2B" | "B2C" = "B2B",
): string[] {
  return getCheckoutBlockReasons(product, customerType).map(
    (code) => CHECKOUT_BLOCK_LABELS_NL[code],
  );
}

export function isDirectlySellableServerSide(product: Product): boolean {
  if (!isDirectCheckoutEnabled()) return false;
  if (product.status !== "PUBLISHED") return false;
  if (resolveStoredOrDerivedPriceMode(product) !== "FIXED") return false;
  if (isRecurringBilling(product.billingType)) return false;
  if (product.priceCents === null || product.priceCents <= 0) return false;
  const item = resolveCommercialItemForProduct(product);
  if (!item) return false;
  return canPublishForB2b(item);
}

export function billingWarningNl(billingType: BillingType): string | null {
  if (billingType === "MONTHLY" || billingType === "YEARLY") {
    return "Maandelijkse of jaarlijkse producten gaan naar offerte of contact. Automatische incasso of abonnementstechniek is nog niet actief.";
  }
  return null;
}
