import type { SoftwareCatalogItem, SoftwareVerificationMeta } from "./types";
import {
  CURATED_PUBLIC_SOURCE_NRS,
  PUBLISH_GATE_REQUIRED_FIELDS,
  type PublishGateField,
} from "./policies";
import { isPlaceholderValue } from "./naming";

export interface PublishGateResult {
  ok: boolean;
  missingFields: PublishGateField[];
  placeholderFields: PublishGateField[];
}

function fieldValue(
  verification: SoftwareVerificationMeta,
  field: PublishGateField,
): string | number | null {
  switch (field) {
    case "manufacturer":
      return verification.manufacturer;
    case "canonicalProductName":
      return verification.canonicalProductName;
    case "edition":
      return verification.edition;
    case "platform":
      return verification.platform;
    case "licenseType":
      return verification.licenseType;
    case "term":
      return verification.term;
    case "region":
      return verification.region;
    case "activationMethod":
      return verification.activationMethod;
    case "supplier":
      return verification.supplier;
    case "supplierAvailability":
      return verification.supplierAvailability;
    case "licenseProvenance":
      return verification.licenseProvenance;
    case "supportResponsibility":
      return verification.supportResponsibility;
    case "lastVerifiedAt":
      return verification.lastVerifiedAt;
    case "verifiedBy":
      return verification.verifiedBy;
    default:
      return null;
  }
}

export function evaluatePublishGate(
  verification: SoftwareVerificationMeta,
): PublishGateResult {
  const missingFields: PublishGateField[] = [];
  const placeholderFields: PublishGateField[] = [];

  for (const field of PUBLISH_GATE_REQUIRED_FIELDS) {
    const value = fieldValue(verification, field);
    if (value == null) {
      missingFields.push(field);
      continue;
    }
    if (typeof value === "string" && isPlaceholderValue(value)) {
      placeholderFields.push(field);
    }
  }

  return {
    ok: missingFields.length === 0 && placeholderFields.length === 0,
    missingFields,
    placeholderFields,
  };
}

/** Fail-closed public visibility with master-fixlist policies */
export function isSoftwareItemPublic(item: SoftwareCatalogItem): boolean {
  if (item.publicationStatus === "BLOCKED") return false;
  if (item.publicationStatus === "CANDIDATE_REVIEW") return false;
  if (item.publicationStatus === "LEGACY_REQUEST_ONLY") return false;
  if (item.disposition === "ARCHIVED_MASTER_FIXLIST") return false;
  if (item.disposition === "CANDIDATE_REVIEW") return false;
  if (item.disposition === "LEGACY_REQUEST_ONLY") return false;

  if (!CURATED_PUBLIC_SOURCE_NRS.has(item.sourceNr)) return false;

  const gate = evaluatePublishGate(item.verification);
  if (!gate.ok) return false;

  if (item.publicationStatus === "PUBLIC_REQUEST_ONLY") return true;

  if (item.publicationStatus === "PUBLIC_PRICE_VERIFIED") {
    return (
      item.publicPriceEur != null &&
      item.publicPriceEur > 0 &&
      item.evidenceStatus === "PRICE_VERIFIED"
    );
  }

  return false;
}

export function countPublicSoftwareItems(items: SoftwareCatalogItem[]): number {
  return items.filter(isSoftwareItemPublic).length;
}

/** Alias used in UI/docs: only gate-passed PUBLIC_REQUEST_ONLY / PUBLIC_PRICE_VERIFIED */
export function isPublicVerifiedSoftwareItem(item: SoftwareCatalogItem): boolean {
  return isSoftwareItemPublic(item);
}

export const PUBLIC_VERIFIED_SOFTWARE_STATUSES = [
  "PUBLIC_REQUEST_ONLY",
  "PUBLIC_PRICE_VERIFIED",
] as const;
