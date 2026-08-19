/**
 * Applies master-fixlist policies to source-inventory.json and regenerates generated-inventory.ts.
 *
 * Usage: node scripts/apply-software-catalog-policies.cjs
 */
const path = require("path");
const fs = require("fs");

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "src", "config", "software-catalog");
const REPORT_DIR = path.join(ROOT, "docs", "artifacts");

const {
  PERMANENT_BLOCK_SOURCE_NRS,
  LEGACY_WINDOWS10_SOURCE_NRS,
  REVIEW_REQUIRED_SOURCE_NRS,
  CURATED_PUBLIC_SOURCE_NRS,
  resolveDisposition,
} = require("./software-catalog-policies.cjs");

const POLICIES = {
  PERMANENT_BLOCK: PERMANENT_BLOCK_SOURCE_NRS,
  LEGACY_WIN10: LEGACY_WINDOWS10_SOURCE_NRS,
  REVIEW: REVIEW_REQUIRED_SOURCE_NRS,
  CURATED: CURATED_PUBLIC_SOURCE_NRS,
};

function normalizeSoftwareSourceLabel(raw) {
  let s = String(raw).trim().replace(/\s+/g, " ");
  s = s.replace(/\bwin\b/gi, "Windows");
  s = s.replace(/\bwindows\s+(\d+)\s+home\s+retail\b/gi, "Windows $1 Home Retail");
  s = s.replace(/\bwindows\s+(\d+)\s+pro\s+retail\b/gi, "Windows $1 Pro Retail");
  s = s.replace(/\bwindows\s+(\d+)\s+home\s+oem\b/gi, "Windows $1 Home OEM");
  s = s.replace(/\bwindows\s+(\d+)\s+pro\s+oem\b/gi, "Windows $1 Pro OEM");
  s = s.replace(/\bparallels\s+desktop\b/gi, "Parallels Desktop");
  s = s.replace(/\bMAc\b/g, "Mac");
  s = s.replace(/\blpad\b/gi, "iPad");
  s = s.replace(/\b1pc\b/gi, "1 device");
  s = s.replace(/\b3pc\b/gi, "3 devices");
  s = s.replace(/\b5pc\b/gi, "5 devices");
  s = s.replace(/\b10pc\b/gi, "10 devices");
  s = s.replace(/\b1PC\b/g, "1 device");
  s = s.replace(/\b3PC\b/g, "3 devices");
  s = s.replace(/\b5PC\b/g, "5 devices");
  s = s.replace(/\b10PC\b/g, "10 devices");
  s = s.replace(/\b1Year\b/g, "1 year");
  s = s.replace(/\b2Year\b/g, "2 years");
  s = s.replace(/\b3Year\b/g, "3 years");
  s = s.replace(/\bcleanmymacx\s+MAC\b/gi, "CleanMyMac X");
  s = s.replace(/\bKey\b/g, "");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

function extractDevices(name) {
  const m = String(name).match(/(\d+)\s*(pc|pcs|device|devices|user|users)/i);
  return m ? Number(m[1]) : null;
}

function extractTermEn(name) {
  const y = String(name).match(/(\d+)\s*(jaar|year|yr|years)/i);
  if (y) return `${y[1]} year${Number(y[1]) === 1 ? "" : "s"}`;
  if (/lifetime|levenslang/i.test(name)) return "Lifetime";
  if (/retail|oem/i.test(name) && /windows/i.test(name)) return "Perpetual";
  return "unspecified";
}

function extractTermNl(name) {
  const y = String(name).match(/(\d+)\s*(jaar|year|yr|years)/i);
  if (y) return `${y[1]} jaar`;
  if (/lifetime|levenslang/i.test(name)) return "Levenslang";
  if (/retail|oem/i.test(name) && /windows/i.test(name)) return "Eeuwigdurend";
  return "unspecified";
}

function extractLicenseType(name) {
  if (/oem/i.test(name)) return "OEM";
  if (/retail/i.test(name)) return "Retail";
  if (/lifetime|levenslang/i.test(name)) return "Lifetime";
  if (/jaar|year|subscription/i.test(name)) return "Subscription";
  return "Unknown";
}

function extractPlatform(name) {
  const parts = [];
  if (/windows|win\s+\d+/i.test(name)) parts.push("Windows");
  if (/\bmac\b|macos|ios/i.test(name)) parts.push("macOS");
  if (/ipad/i.test(name)) parts.push("iPad");
  return parts.length > 0 ? parts.join(" + ") : "unspecified";
}

function guessManufacturer(name) {
  const n = name.toLowerCase();
  if (n.includes("windows") || n.includes("office") || n.includes("microsoft")) return "Microsoft";
  if (n.includes("norton")) return "Norton";
  if (n.includes("mcafee")) return "McAfee";
  if (n.includes("eset")) return "ESET";
  if (n.includes("acronis")) return "Acronis";
  if (n.includes("ccleaner")) return "CCleaner";
  if (n.includes("parallels")) return "Parallels";
  if (n.includes("affinity")) return "Affinity";
  if (n.includes("idm") || n.includes("internet download")) return "Tonec";
  if (n.includes("avast")) return "Avast";
  if (n.includes("avg")) return "AVG";
  if (n.includes("bitdefender")) return "Bitdefender";
  if (n.includes("trend micro")) return "Trend Micro";
  if (n.includes("avira")) return "Avira";
  if (n.includes("nitro")) return "Nitro";
  if (n.includes("pdf expert")) return "Readdle";
  if (n.includes("roboform")) return "RoboForm";
  if (n.includes("beyond compare")) return "Scooter Software";
  if (n.includes("voicemod")) return "Voicemod";
  if (n.includes("disk drill")) return "CleverFiles";
  if (n.includes("cleanmymac")) return "MacPaw";
  return "Unknown";
}

function buildCanonicalNameEn(manufacturer, normalized, edition, devices, term) {
  const segments = [manufacturer, normalized.replace(new RegExp(`^${manufacturer}\\s*`, "i"), "").trim()];
  if (edition) segments.push(edition);
  if (devices != null) segments.push(`${devices} device${devices === 1 ? "" : "s"}`);
  if (term && term !== "unspecified") segments.push(term);
  return segments.filter(Boolean).join(" — ");
}

function buildCanonicalNameNl(manufacturer, normalized, edition, devices, termNl) {
  const segments = [manufacturer, normalized.replace(new RegExp(`^${manufacturer}\\s*`, "i"), "").trim()];
  if (edition) segments.push(edition);
  if (devices != null) segments.push(`${devices} apparaat${devices === 1 ? "" : "en"}`);
  if (termNl && termNl !== "unspecified") segments.push(termNl);
  return segments.filter(Boolean).join(" — ");
}

function resolvePublicationStatus(sourceNr, disposition, gateOk) {
  if (POLICIES.PERMANENT_BLOCK.has(sourceNr)) return "BLOCKED";
  if (disposition === "LEGACY_REQUEST_ONLY") return "LEGACY_REQUEST_ONLY";
  if (disposition === "CANDIDATE_REVIEW" || disposition === "ARCHIVED_MASTER_FIXLIST") {
    return disposition === "ARCHIVED_MASTER_FIXLIST" ? "BLOCKED" : "CANDIDATE_REVIEW";
  }
  if (disposition === "CURATED_PUBLIC_CANDIDATE" && gateOk) return "PUBLIC_REQUEST_ONLY";
  return "CANDIDATE_REVIEW";
}

function buildVerification(row, normalized, manufacturer, edition, platform, licenseType, termEn, devices) {
  return {
    manufacturer: manufacturer === "Unknown" ? null : manufacturer,
    canonicalProductName: normalized,
    edition: edition || null,
    version: null,
    platform: platform === "unspecified" ? null : platform,
    licenseType: licenseType === "Unknown" ? null : licenseType,
    term: termEn === "unspecified" ? null : termEn,
    deviceCount: devices,
    userCount: null,
    region: null,
    activationMethod: null,
    supplier: null,
    supplierProductReference: row.sourcePriceUrl || null,
    purchaseCostEur: null,
    vatHandling: null,
    supplierAvailability: null,
    licenseProvenance: null,
    refundEligibility: null,
    supportResponsibility: null,
    lastVerifiedAt: null,
    verifiedBy: null,
  };
}

function gateOk(verification) {
  const required = [
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
  ];
  for (const field of required) {
    const v = verification[field];
    if (v == null || v === "" || String(v).toLowerCase() === "unknown" || String(v).toLowerCase() === "unspecified") {
      return false;
    }
  }
  return true;
}

const inventoryPath = path.join(OUT_DIR, "source-inventory.json");
const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
const { report, green, red } = inventory;

const policyReport = {
  archived: [],
  legacy: [],
  reviewRequired: [],
  curatedCandidates: [],
  publicEligible: [],
  blocked: [],
};

const publicItems = green.map((row) => {
  const sourceNr = row.sourceNr;
  const normalized = normalizeSoftwareSourceLabel(row.sourceLabel);
  const manufacturer = guessManufacturer(normalized);
  const edition = extractLicenseType(normalized);
  const devices = extractDevices(normalized);
  const termEn = extractTermEn(normalized);
  const termNl = extractTermNl(normalized);
  const platform = extractPlatform(normalized);
  const disposition = resolveDisposition(sourceNr);
  const verification = buildVerification(row, normalized, manufacturer, edition, platform, edition, termEn, devices);
  const passesGate = gateOk(verification);
  const publicationStatus = resolvePublicationStatus(sourceNr, disposition, passesGate);

  const nameEn = buildCanonicalNameEn(manufacturer, normalized, edition !== "Unknown" ? edition : null, devices, termEn);
  const nameNl = buildCanonicalNameNl(manufacturer, normalized, edition !== "Unknown" ? edition : null, devices, termNl);

  const entry = {
    id: row.id,
    sourceNr,
    sourceRowNumber: row.sourceRowNumber,
    sourceLabel: row.sourceLabel,
    slug: row.slug,
    nameNl,
    nameEn,
    group: row.group,
    brand: manufacturer === "Unknown" ? row.brand : manufacturer,
    licenseType: edition,
    devices,
    term: termEn,
    region: row.region,
    delivery: row.delivery,
    publicationStatus,
    evidenceStatus: row.evidenceStatus,
    supplierStatus: row.supplierStatus,
    publicPriceEur: null,
    shortNl: `${nameNl}. Vraag een geverifieerde offerte aan voor beschikbaarheid en licentievoorwaarden.`,
    shortEn: `${nameEn}. Request a verified quote for availability and licensing terms.`,
    sourceCategory: row.sourceCategory,
    sourcePriority: row.sourcePriority,
    internalSourceAdviceEur: row.internalSourceAdviceEur ?? row.sourceAdviceEur ?? null,
    disposition,
    verification,
  };

  if (POLICIES.PERMANENT_BLOCK.has(sourceNr)) policyReport.archived.push({ sourceNr, label: row.sourceLabel });
  else if (POLICIES.LEGACY_WIN10.has(sourceNr)) policyReport.legacy.push({ sourceNr, label: row.sourceLabel });
  else if (POLICIES.REVIEW.has(sourceNr)) policyReport.reviewRequired.push({ sourceNr, label: row.sourceLabel });
  else if (POLICIES.CURATED.has(sourceNr)) {
    policyReport.curatedCandidates.push({ sourceNr, label: row.sourceLabel, passesGate, publicationStatus });
    if (publicationStatus === "PUBLIC_REQUEST_ONLY") policyReport.publicEligible.push({ sourceNr, label: row.sourceLabel });
  } else policyReport.reviewRequired.push({ sourceNr, label: row.sourceLabel, reason: "non-curated security/utility" });

  if (publicationStatus === "BLOCKED") policyReport.blocked.push({ sourceNr, label: row.sourceLabel });

  return entry;
});

const stats = {
  totalSourceRows: report.totals.dataRows,
  greenCount: green.length,
  redCount: red.length,
  missingPriceSourceAmongGreen: report.missingPriceSourceAmongGreen,
  selectionPct: report.totals.selectionPct,
  publicEligibleCount: policyReport.publicEligible.length,
  archivedCount: policyReport.archived.length,
  legacyCount: policyReport.legacy.length,
  curatedCandidateCount: policyReport.curatedCandidates.length,
};

const ts = `/**
 * AUTO-GENERATED — do not hand-edit rows.
 * Source: ${report.sourceFile}
 * SHA256: ${report.sourceSha256}
 * Regenerator: node scripts/apply-software-catalog-policies.cjs
 */
import type { SoftwareCatalogBlockedRef, SoftwareCatalogItem } from "./types";

export const SOFTWARE_CATALOG_SOURCE_SHA256 =
  "${report.sourceSha256}" as const;

export const SOFTWARE_CATALOG_STATS = ${JSON.stringify(stats, null, 2)} as const;

export const softwareCatalogItems: SoftwareCatalogItem[] = ${JSON.stringify(publicItems, null, 2)};

export const softwareCatalogBlockedRefs: SoftwareCatalogBlockedRef[] = ${JSON.stringify(red, null, 2)};
`;

fs.mkdirSync(REPORT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, "generated-inventory.ts"), ts);
fs.writeFileSync(
  path.join(REPORT_DIR, "software-catalog-policy-report.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), stats, policyReport }, null, 2) + "\n",
);

console.log(JSON.stringify({ stats, policyReport }, null, 2));
