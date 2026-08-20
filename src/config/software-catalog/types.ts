/**
 * Software license catalog — isolated from website packages / commercial pricing.
 * Public DTOs must never include purchase cost, margin, or supplier secrets.
 */

export type SoftwarePublicationStatus =
  | "BLOCKED"
  | "CANDIDATE_REVIEW"
  | "LEGACY_REQUEST_ONLY"
  | "PUBLIC_REQUEST_ONLY"
  | "PUBLIC_PRICE_VERIFIED";

export type SoftwareDisposition =
  | "INCLUDED_GREEN_CANDIDATE"
  | "BLOCKED_RED_NOT_OFFERED"
  | "ARCHIVED_MASTER_FIXLIST"
  | "LEGACY_REQUEST_ONLY"
  | "CANDIDATE_REVIEW"
  | "CURATED_PUBLIC_CANDIDATE";

/** Verification metadata — required for public publication */
export interface SoftwareVerificationMeta {
  manufacturer: string | null;
  canonicalProductName: string | null;
  edition: string | null;
  version: string | null;
  platform: string | null;
  licenseType: string | null;
  term: string | null;
  deviceCount: number | null;
  userCount: number | null;
  region: string | null;
  activationMethod: string | null;
  supplier: string | null;
  supplierProductReference: string | null;
  purchaseCostEur: number | null;
  vatHandling: string | null;
  supplierAvailability: string | null;
  licenseProvenance: string | null;
  refundEligibility: string | null;
  supportResponsibility: string | null;
  lastVerifiedAt: string | null;
  verifiedBy: string | null;
}

export type SoftwareCatalogGroup =
  | "windows"
  | "security"
  | "tools"
  | "professional";

export type SoftwareEvidenceStatus =
  | "MISSING_PRICE_SOURCE"
  | "SOURCE_URL_PRESENT_UNVERIFIED"
  | "LICENSE_UNVERIFIED"
  | "PRICE_VERIFIED"
  | "EVIDENCE_EXPIRED";

export interface SoftwareCatalogItem {
  id: string;
  sourceNr: number;
  sourceRowNumber: number;
  sourceLabel: string;
  slug: string;
  nameNl: string;
  nameEn: string;
  group: SoftwareCatalogGroup;
  brand: string;
  licenseType: string;
  devices: number | null;
  term: string;
  region: string;
  delivery: string;
  publicationStatus: SoftwarePublicationStatus;
  evidenceStatus: SoftwareEvidenceStatus | string;
  supplierStatus: string;
  /** Only set when PUBLIC_PRICE_VERIFIED with fresh evidence — otherwise null */
  publicPriceEur: number | null;
  shortNl: string;
  shortEn: string;
  sourceCategory: string;
  sourcePriority: number;
  /** Historical Excel advice — never expose via toPublicDto */
  internalSourceAdviceEur: number | null;
  disposition: SoftwareDisposition;
  verification: SoftwareVerificationMeta;
}

export interface SoftwareCatalogBlockedRef {
  id: string;
  sourceNr: number;
  sourceRowNumber: number;
  sourceLabel: string;
  sourceCategory: string;
  sourceVerdict: string;
  publicationStatus: "BLOCKED";
  disposition: Extract<SoftwareDisposition, "BLOCKED_RED_NOT_OFFERED">;
}

export interface SoftwarePublicDto {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  group: SoftwareCatalogGroup;
  brand: string;
  licenseType: string;
  devices: number | null;
  term: string;
  publicationStatus: Extract<
    SoftwarePublicationStatus,
    "PUBLIC_REQUEST_ONLY" | "PUBLIC_PRICE_VERIFIED"
  >;
  priceLabel: "on_request" | "verified";
  publicPriceEur: number | null;
  specs: { label: string; value: string }[];
}

export const SOFTWARE_GROUP_ORDER: SoftwareCatalogGroup[] = [
  "windows",
  "security",
  "tools",
  "professional",
];

export const SOFTWARE_GROUP_LABELS = {
  nl: {
    windows: "Windows",
    security: "Beveiliging",
    tools: "Tools & apps",
    professional: "Professionele software",
  },
  en: {
    windows: "Windows",
    security: "Security",
    tools: "Tools & apps",
    professional: "Professional software",
  },
} as const;
