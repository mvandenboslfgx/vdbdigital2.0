/**
 * Central commercial pricing catalog.
 * All amounts in euro cents. Never trust client-supplied prices.
 *
 * Price approval status: DRAFT until Matthijs explicitly marks APPROVED/PUBLISHED.
 * B2C checkout remains blocked until legalStatus is APPROVED_FOR_B2C or APPROVED_FOR_BOTH.
 */

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

/** Legacy alias used elsewhere */
export type ProductPriceReviewStatus =
  | "PRICE_UNDECIDED"
  | "SCOPE_REVIEW_REQUIRED"
  | "LEGAL_REVIEW_REQUIRED"
  | "READY_FOR_REVIEW"
  | "DO_NOT_PUBLISH";

export interface CommercialPrice {
  /** Price excluding VAT in cents */
  exclVatCents: number;
  /** Precomputed price including VAT in cents (authoritative when set) */
  inclVatCents: number;
  vatRate: number;
  mode: PricingMode;
}

export interface CommercialCatalogItem {
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
  /** Founding price excl. VAT in cents — DRAFT only until campaign approved */
  foundingExclVatCents: number | null;
  publicationReady: boolean;
}

export const VAT_PERCENT = 21;
export const VAT_RATE = DEFAULT_VAT_RATE;

/** Convert excl-VAT euros to cents then derive incl VAT exactly */
export function priceFromExclEuros(
  exclEuros: number,
  mode: PricingMode = "fixed",
): CommercialPrice {
  const exclVatCents = Math.round(exclEuros * 100);
  const vatCents = calculateVatFromSubtotal(exclVatCents, VAT_RATE);
  return {
    exclVatCents,
    inclVatCents: exclVatCents + vatCents,
    vatRate: VAT_RATE,
    mode,
  };
}

export function assertVatConsistency(price: CommercialPrice): boolean {
  const expected = price.exclVatCents + calculateVatFromSubtotal(price.exclVatCents, price.vatRate);
  return expected === price.inclVatCents;
}

/** B2B default payment schedule for custom projects — not for consumers */
export const b2bCustomPaymentSchedule = {
  beforeStartPercent: 70,
  afterCompletionPercent: 30,
  configurable: true,
  consumerDefault: false,
} as const;

/** Whether B2C public checkout may list this item */
export function canPublishForB2c(item: CommercialCatalogItem): boolean {
  if (item.priceStatus !== "APPROVED" && item.priceStatus !== "PUBLISHED") return false;
  if (item.legalStatus !== "APPROVED_FOR_B2C" && item.legalStatus !== "APPROVED_FOR_BOTH") {
    return false;
  }
  if (!item.pricing && !item.quoteOnly) return false;
  if (item.pricing && !assertVatConsistency(item.pricing)) return false;
  return item.publicationReady && item.b2c;
}

/** Whether B2B public checkout may list this item */
export function canPublishForB2b(item: CommercialCatalogItem): boolean {
  if (item.priceStatus !== "APPROVED" && item.priceStatus !== "PUBLISHED") return false;
  if (item.legalStatus !== "APPROVED_FOR_B2B" && item.legalStatus !== "APPROVED_FOR_BOTH") {
    return false;
  }
  if (!item.pricing && !item.quoteOnly) return false;
  if (item.pricing && !assertVatConsistency(item.pricing)) return false;
  return item.publicationReady && item.b2b;
}

/** Whether item may appear on public marketing with draft starting prices */
export function canShowPublicStartingPrice(item: CommercialCatalogItem): boolean {
  return item.priceStatus === "DRAFT" || item.priceStatus === "INTERNAL_REVIEW"
    || item.priceStatus === "APPROVED" || item.priceStatus === "PUBLISHED";
}

export const commercialCatalog: CommercialCatalogItem[] = [
  {
    id: "pkg-onepage",
    slug: "onepage-website",
    category: "website",
    nameEn: "Onepage Website",
    nameNl: "Onepage Website",
    pricing: priceFromExclEuros(995, "starting_from"),
    quoteOnly: false,
    oneTime: true,
    monthly: false,
    b2b: true,
    b2c: true,
    legalType: "custom_service",
    priceStatus: "DRAFT",
    legalStatus: "LEGAL_REVIEW_REQUIRED",
    foundingEligible: true,
    foundingExclVatCents: 895_00,
    publicationReady: false,
  },
  {
    id: "pkg-launch",
    slug: "launch-website",
    category: "website",
    nameEn: "Launch Website",
    nameNl: "Launch Website",
    pricing: priceFromExclEuros(1695, "starting_from"),
    quoteOnly: false,
    oneTime: true,
    monthly: false,
    b2b: true,
    b2c: true,
    legalType: "custom_service",
    priceStatus: "DRAFT",
    legalStatus: "LEGAL_REVIEW_REQUIRED",
    foundingEligible: true,
    foundingExclVatCents: 1525_00,
    publicationReady: false,
  },
  {
    id: "pkg-growth",
    slug: "growth-website",
    category: "website",
    nameEn: "Growth Website",
    nameNl: "Growth Website",
    pricing: priceFromExclEuros(2995, "starting_from"),
    quoteOnly: false,
    oneTime: true,
    monthly: false,
    b2b: true,
    b2c: true,
    legalType: "custom_service",
    priceStatus: "DRAFT",
    legalStatus: "LEGAL_REVIEW_REQUIRED",
    foundingEligible: true,
    foundingExclVatCents: 2695_00,
    publicationReady: false,
  },
  {
    id: "pkg-custom",
    slug: "custom-website",
    category: "custom",
    nameEn: "Custom Website",
    nameNl: "Custom Website",
    pricing: priceFromExclEuros(5000, "starting_from"),
    quoteOnly: true,
    oneTime: true,
    monthly: false,
    b2b: true,
    b2c: true,
    legalType: "custom_service",
    priceStatus: "DRAFT",
    legalStatus: "LEGAL_REVIEW_REQUIRED",
    foundingEligible: false,
    foundingExclVatCents: null,
    publicationReady: false,
  },
  {
    id: "pkg-webshop-launch",
    slug: "webshop-launch",
    category: "webshop",
    nameEn: "Webshop Launch",
    nameNl: "Webshop Launch",
    pricing: priceFromExclEuros(3995, "starting_from"),
    quoteOnly: false,
    oneTime: true,
    monthly: false,
    b2b: true,
    b2c: true,
    legalType: "custom_service",
    priceStatus: "DRAFT",
    legalStatus: "LEGAL_REVIEW_REQUIRED",
    foundingEligible: true,
    foundingExclVatCents: null,
    publicationReady: false,
  },
  {
    id: "care-essential",
    slug: "essential-care",
    category: "care",
    nameEn: "Essential Care",
    nameNl: "Essential Care",
    pricing: priceFromExclEuros(69, "monthly"),
    quoteOnly: false,
    oneTime: false,
    monthly: true,
    b2b: true,
    b2c: true,
    legalType: "maintenance",
    priceStatus: "DRAFT",
    legalStatus: "LEGAL_REVIEW_REQUIRED",
    foundingEligible: false,
    foundingExclVatCents: null,
    publicationReady: false,
  },
  {
    id: "care-business",
    slug: "business-care",
    category: "care",
    nameEn: "Business Care",
    nameNl: "Business Care",
    pricing: priceFromExclEuros(129, "monthly"),
    quoteOnly: false,
    oneTime: false,
    monthly: true,
    b2b: true,
    b2c: true,
    legalType: "maintenance",
    priceStatus: "DRAFT",
    legalStatus: "LEGAL_REVIEW_REQUIRED",
    foundingEligible: false,
    foundingExclVatCents: null,
    publicationReady: false,
  },
  {
    id: "care-growth",
    slug: "growth-care",
    category: "care",
    nameEn: "Growth Care",
    nameNl: "Growth Care",
    pricing: priceFromExclEuros(249, "monthly"),
    quoteOnly: false,
    oneTime: false,
    monthly: true,
    b2b: true,
    b2c: false,
    legalType: "maintenance",
    priceStatus: "DRAFT",
    legalStatus: "LEGAL_REVIEW_REQUIRED",
    foundingEligible: false,
    foundingExclVatCents: null,
    publicationReady: false,
  },
  {
    id: "care-partner",
    slug: "digital-partner",
    category: "care",
    nameEn: "Digital Partner",
    nameNl: "Digital Partner",
    pricing: priceFromExclEuros(500, "monthly"),
    quoteOnly: true,
    oneTime: false,
    monthly: true,
    b2b: true,
    b2c: false,
    legalType: "support_bundle",
    priceStatus: "DRAFT",
    legalStatus: "LEGAL_REVIEW_REQUIRED",
    foundingEligible: false,
    foundingExclVatCents: null,
    publicationReady: false,
  },
  {
    id: "bundle-website-launch",
    slug: "website-launch-system",
    category: "bundle",
    nameEn: "Website Launch System",
    nameNl: "Website Launch System",
    pricing: priceFromExclEuros(1695, "starting_from"),
    quoteOnly: false,
    oneTime: true,
    monthly: false,
    b2b: true,
    b2c: true,
    legalType: "mixed_product",
    priceStatus: "DRAFT",
    legalStatus: "LEGAL_REVIEW_REQUIRED",
    foundingEligible: true,
    foundingExclVatCents: null,
    publicationReady: false,
  },
  {
    id: "bundle-business-growth",
    slug: "business-growth-system",
    category: "bundle",
    nameEn: "Business Growth System",
    nameNl: "Business Growth System",
    pricing: priceFromExclEuros(3495, "starting_from"),
    quoteOnly: false,
    oneTime: true,
    monthly: false,
    b2b: true,
    b2c: false,
    legalType: "mixed_product",
    priceStatus: "DRAFT",
    legalStatus: "LEGAL_REVIEW_REQUIRED",
    foundingEligible: true,
    foundingExclVatCents: null,
    publicationReady: false,
  },
  {
    id: "bundle-webshop-launch",
    slug: "webshop-launch-system",
    category: "bundle",
    nameEn: "Webshop Launch System",
    nameNl: "Webshop Launch System",
    pricing: priceFromExclEuros(3995, "starting_from"),
    quoteOnly: false,
    oneTime: true,
    monthly: false,
    b2b: true,
    b2c: true,
    legalType: "mixed_product",
    priceStatus: "DRAFT",
    legalStatus: "LEGAL_REVIEW_REQUIRED",
    foundingEligible: true,
    foundingExclVatCents: null,
    publicationReady: false,
  },
  {
    id: "bundle-automation",
    slug: "automation-system",
    category: "bundle",
    nameEn: "Automation System",
    nameNl: "Automation System",
    pricing: null,
    quoteOnly: true,
    oneTime: true,
    monthly: false,
    b2b: true,
    b2c: false,
    legalType: "mixed_product",
    priceStatus: "DRAFT",
    legalStatus: "LEGAL_REVIEW_REQUIRED",
    foundingEligible: true,
    foundingExclVatCents: null,
    publicationReady: false,
  },
  {
    id: "bundle-digital-partner",
    slug: "digital-partner-system",
    category: "bundle",
    nameEn: "Digital Partner",
    nameNl: "Digital Partner",
    pricing: null,
    quoteOnly: true,
    oneTime: false,
    monthly: true,
    b2b: true,
    b2c: false,
    legalType: "support_bundle",
    priceStatus: "DRAFT",
    legalStatus: "LEGAL_REVIEW_REQUIRED",
    foundingEligible: false,
    foundingExclVatCents: null,
    publicationReady: false,
  },
];

export function getCatalogItem(slug: string): CommercialCatalogItem | undefined {
  return commercialCatalog.find((item) => item.slug === slug);
}

export function getCatalogByCategory(
  category: CommercialCatalogItem["category"],
): CommercialCatalogItem[] {
  return commercialCatalog.filter((item) => item.category === category);
}
