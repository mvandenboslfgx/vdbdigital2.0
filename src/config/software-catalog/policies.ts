/**
 * Master fixlist policies for software catalog publication.
 * Archive/hide — never destructive delete.
 */

export type SoftwareDisposition =
  | "INCLUDED_GREEN_CANDIDATE"
  | "BLOCKED_RED_NOT_OFFERED"
  | "ARCHIVED_MASTER_FIXLIST"
  | "LEGACY_REQUEST_ONLY"
  | "CANDIDATE_REVIEW"
  | "CURATED_PUBLIC_CANDIDATE";

/** Permanently blocked from any public or request surface until re-approved. */
export const PERMANENT_BLOCK_SOURCE_NRS = new Set([
  57, // Affinity V2 Full Set
  26, // Parallels Desktop 19
  27, // Parallels Desktop 20
  58, // Voicemod PRO Lifetime
  24, // CCleaner Pro 1pc
  25, // CCleaner Pro 3pc
  54, // cleanmymacx MAC
  56, // Disk Drill Pro Lifetime
  22, // IDM 1 year
  23, // IDM Lifetime
  20, // Home Upgrade Pro — hidden until verified
]);

/** Windows 10 — legacy only, not in default browse catalog. */
export const LEGACY_WINDOWS10_SOURCE_NRS = new Set([2, 5, 7, 21]);

/** Needs license/version/supplier proof before any public listing. */
export const REVIEW_REQUIRED_SOURCE_NRS = new Set([
  19, // Acronis Cyber Protect Home Office
  53, // Nitro Pro 14
  55, // PDF Expert 3
  59, // RoboForm Everywhere
  60, // Beyond Compare 5
]);

/**
 * Curated business-relevant SKUs (~12–20 target).
 * Only these may become PUBLIC_* when verification metadata passes publish gate.
 */
export const CURATED_PUBLIC_SOURCE_NRS = new Set([
  // Windows 11
  1, // Win 11 Pro Retail
  3, // Win 11 Pro OEM
  4, // Win 11 Home Retail
  6, // Win 11 Home OEM
  // Security families (representative variants)
  8, // McAfee Internet Security 10 devices
  9, // McAfee Total Protection 10 devices
  10, // Norton 360 Premium 10 devices
  12, // Norton 360 Premium 5 devices
  14, // Bitdefender Total Security 1 device
  15, // ESET NOD32 1 device
  18, // McAfee LiveSafe Unlimited
  52, // Avast Premium Security 1 device
]);

/** All other green SKUs default to candidate review (not publicly browsable). */
export function resolveDisposition(sourceNr: number): SoftwareDisposition {
  if (PERMANENT_BLOCK_SOURCE_NRS.has(sourceNr)) return "ARCHIVED_MASTER_FIXLIST";
  if (LEGACY_WINDOWS10_SOURCE_NRS.has(sourceNr)) return "LEGACY_REQUEST_ONLY";
  if (REVIEW_REQUIRED_SOURCE_NRS.has(sourceNr)) return "CANDIDATE_REVIEW";
  if (CURATED_PUBLIC_SOURCE_NRS.has(sourceNr)) return "CURATED_PUBLIC_CANDIDATE";
  return "CANDIDATE_REVIEW";
}

export const PUBLISH_GATE_REQUIRED_FIELDS = [
  "manufacturer",
  "canonicalProductName",
  "edition",
  "platform",
  "licenseType",
  "term",
  "region",
  "activationMethod",
  "supplier",
  "supplierAvailability",
  "licenseProvenance",
  "supportResponsibility",
  "lastVerifiedAt",
  "verifiedBy",
] as const;

export type PublishGateField = (typeof PUBLISH_GATE_REQUIRED_FIELDS)[number];
