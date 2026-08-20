import { DEFAULT_VAT_RATE, calculateVatFromSubtotal } from "@/lib/utilities/vat";

export type PriceApprovalStatus =
  | "DRAFT"
  | "INTERNAL_REVIEW"
  | "APPROVED"
  | "PUBLISHED"
  | "ARCHIVED";

export type LegalApprovalStatus =
  | "NOT_REVIEWED"
  | "INTERNAL_REVIEW"
  | "LEGAL_REVIEW_REQUIRED"
  | "APPROVED_FOR_B2B"
  | "APPROVED_FOR_B2C"
  | "APPROVED_FOR_BOTH";

export type PricingMode =
  | "fixed"
  | "starting_from"
  | "quote_only"
  | "monthly"
  | "annual";

export type ProductLegalType =
  | "standard_service"
  | "custom_service"
  | "digital_content"
  | "subscription"
  | "maintenance"
  | "support_bundle"
  | "consultancy"
  | "immediate_service"
  | "mixed_product";

export interface CommercialPrice {
  exclVatCents: number;
  inclVatCents: number;
  vatRate: number;
  mode: PricingMode;
}

/** Approval shape derived from a Supabase product row. It is not a catalog. */
export interface CatalogApprovalItem {
  id: string;
  slug: string;
  category:
    | "website"
    | "webshop"
    | "care"
    | "bundle"
    | "automation"
    | "support"
    | "custom";
  nameEn: string;
  nameNl: string;
  pricing: CommercialPrice | null;
  quoteOnly: boolean;
  oneTime: boolean;
  monthly: boolean;
  b2b: boolean;
  b2c: boolean;
  legalType: ProductLegalType;
  priceStatus: PriceApprovalStatus;
  legalStatus: LegalApprovalStatus;
  foundingEligible: boolean;
  foundingExclVatCents: number | null;
  publicationReady: boolean;
}

export const CATALOG_VAT_RATE = DEFAULT_VAT_RATE;

export function catalogPriceFromExclEuros(
  exclEuros: number,
  mode: PricingMode = "fixed",
): CommercialPrice {
  const exclVatCents = Math.round(exclEuros * 100);
  const vatCents = calculateVatFromSubtotal(exclVatCents, CATALOG_VAT_RATE);
  return {
    exclVatCents,
    inclVatCents: exclVatCents + vatCents,
    vatRate: CATALOG_VAT_RATE,
    mode,
  };
}

export function isCatalogVatConsistent(price: CommercialPrice): boolean {
  return (
    price.exclVatCents + calculateVatFromSubtotal(price.exclVatCents, price.vatRate) ===
    price.inclVatCents
  );
}

export function canPublishForB2c(item: CatalogApprovalItem): boolean {
  if (item.priceStatus !== "APPROVED" && item.priceStatus !== "PUBLISHED") return false;
  if (item.legalStatus !== "APPROVED_FOR_B2C" && item.legalStatus !== "APPROVED_FOR_BOTH") {
    return false;
  }
  if (!item.pricing && !item.quoteOnly) return false;
  if (item.pricing && !isCatalogVatConsistent(item.pricing)) return false;
  return item.publicationReady && item.b2c;
}

export function canPublishForB2b(item: CatalogApprovalItem): boolean {
  if (item.priceStatus !== "APPROVED" && item.priceStatus !== "PUBLISHED") return false;
  if (item.legalStatus !== "APPROVED_FOR_B2B" && item.legalStatus !== "APPROVED_FOR_BOTH") {
    return false;
  }
  if (!item.pricing && !item.quoteOnly) return false;
  if (item.pricing && !isCatalogVatConsistent(item.pricing)) return false;
  return item.publicationReady && item.b2b;
}
