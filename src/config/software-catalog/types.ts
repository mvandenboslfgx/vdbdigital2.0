/**
 * Software license catalog — isolated from website packages / commercial pricing.
 * Public DTOs must never include purchase cost, margin, or supplier secrets.
 */

export type SoftwarePublicationStatus =
  | "BLOCKED"
  | "CANDIDATE_REVIEW"
  | "PUBLIC_REQUEST_ONLY"
  | "PUBLIC_PRICE_VERIFIED";

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
}

export interface SoftwareCatalogBlockedRef {
  id: string;
  sourceNr: number;
  sourceRowNumber: number;
  sourceLabel: string;
  sourceCategory: string;
  sourceVerdict: string;
  publicationStatus: "BLOCKED";
  disposition: "BLOCKED_RED_NOT_OFFERED";
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
