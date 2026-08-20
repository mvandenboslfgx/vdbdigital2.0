/**
 * One-shot importer for the software catalog Excel source.
 * Uses a local/temp `xlsx` install (not a repo dependency).
 *
 * Usage:
 *   set XLSX_PKG=C:\Users\...\Temp\vdb-xlsx-lib\package
 *   node scripts/import-software-catalog-xlsx.cjs
 */
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const SRC =
  process.env.VDB_CATALOG_XLSX ||
  path.join(
    process.env.USERPROFILE || "",
    "Downloads",
    "VDB_Digital_inkoop_verkoop_verkoop_of_gezeik.xlsx",
  );
const EXPECTED_SHA =
  "242f18ef2719f3ed61c0a56eab673aa818980db1a70e6b9fef4f32353af43036";
const XLSX_PKG =
  process.env.XLSX_PKG ||
  path.join(process.env.TEMP || "/tmp", "vdb-xlsx-lib", "package");

const XLSX = require(XLSX_PKG);
const OUT_DIR = path.join(ROOT, "src", "config", "software-catalog");
const REPORT_DIR = path.join(ROOT, "docs", "artifacts");

const buf = fs.readFileSync(SRC);
const sha = crypto.createHash("sha256").update(buf).digest("hex");
if (sha !== EXPECTED_SHA) {
  console.error("SHA256 mismatch", { sha, EXPECTED_SHA });
  process.exit(2);
}

const wb = XLSX.read(buf, { type: "buffer", cellDates: false });
const sheetName = "Alles op 1 lijst";
const sheet = wb.Sheets[sheetName];
if (!sheet) {
  console.error("Missing sheet", wb.SheetNames);
  process.exit(2);
}

const rows = XLSX.utils.sheet_to_json(sheet, {
  header: 1,
  defval: "",
  raw: false,
});

let headerIdx = -1;
for (let i = 0; i < rows.length; i++) {
  if (String(rows[i][0]).trim() === "Nr.") {
    headerIdx = i;
    break;
  }
}
if (headerIdx < 0) {
  console.error("Header row not found");
  process.exit(2);
}

const headers = rows[headerIdx].map((h) => String(h).trim());
const dataRows = [];
for (let i = headerIdx + 1; i < rows.length; i++) {
  const r = rows[i];
  const nr = String(r[0] ?? "").trim();
  if (!/^\d+$/.test(nr)) continue;
  const obj = { __excelRow: i + 1 };
  headers.forEach((h, idx) => {
    obj[h] = r[idx] ?? "";
  });
  dataRows.push(obj);
}

function verdictOf(row) {
  return String(row.EINDOORDEEL || "")
    .trim()
    .toUpperCase();
}

function isGreen(v) {
  return v === "VERKOPEN";
}

function isRed(v) {
  return v.startsWith("GEZEIK");
}

const verkopen = dataRows.filter((r) => isGreen(verdictOf(r)));
const gezeik = dataRows.filter((r) => isRed(verdictOf(r)));
const other = dataRows.filter((r) => !isGreen(verdictOf(r)) && !isRed(verdictOf(r)));

function parseEuro(v) {
  if (v == null || v === "") return null;
  const s = String(v)
    .replace(/[^\d,.-]/g, "")
    .replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

function slugify(name, nr) {
  const base = String(name)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return `${base || "product"}-${nr}`;
}

function mapGroup(category) {
  const c = String(category).toLowerCase();
  if (c.includes("windows") || c.includes("server")) return "windows";
  if (c.includes("security")) return "security";
  if (c.includes("professional") || c.includes("office")) return "professional";
  return "tools";
}

function normalizeName(raw) {
  let s = String(raw).trim().replace(/\s+/g, " ");
  s = s.replace(/\bwin\b/gi, "Windows");
  s = s.replace(/\byear\b/gi, "jaar");
  return s;
}

function extractDevices(name) {
  const m = String(name).match(
    /(\d+)\s*(pc|pcs|device|devices|user|users|apparaat|apparaten)/i,
  );
  return m ? Number(m[1]) : null;
}

function extractTerm(name) {
  const y = String(name).match(/(\d+)\s*(jaar|year|yr)/i);
  if (y) return `${y[1]}-year`;
  if (/lifetime|levenslang/i.test(name)) return "lifetime";
  if (/retail|oem/i.test(name) && /windows/i.test(name)) return "perpetual-license";
  return "unspecified";
}

function extractLicenseType(name) {
  if (/oem/i.test(name)) return "OEM";
  if (/retail/i.test(name)) return "Retail";
  if (/lifetime/i.test(name)) return "Lifetime";
  if (/jaar|year|subscription/i.test(name)) return "Subscription";
  return "Unknown";
}

function guessBrand(name) {
  const n = name.toLowerCase();
  if (n.includes("windows") || n.includes("office") || n.includes("microsoft"))
    return "Microsoft";
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
  if (n.includes("kaspersky")) return "Kaspersky";
  if (n.includes("bitdefender")) return "Bitdefender";
  if (n.includes("betterdisplay")) return "BetterDisplay";
  if (n.includes("uninstall")) return "Uninstall Tool";
  return "Unknown";
}

function shortDesc(name, locale) {
  if (locale === "nl") {
    return `Licentiesoftware: ${name}. Prijs en beschikbaarheid op aanvraag.`;
  }
  return `Licensed software: ${name}. Price and availability on request.`;
}

const slugSet = new Set();
const green = verkopen.map((r) => {
  const nr = String(r["Nr."]).trim();
  const sourceLabel = String(r.Product).trim();
  const name = normalizeName(sourceLabel);
  let slug = slugify(name, nr);
  let n = 2;
  while (slugSet.has(slug)) {
    slug = `${slugify(name, nr)}-${n++}`;
  }
  slugSet.add(slug);
  const advies = parseEuro(r["Advies verkoop"]);
  const prijsbron = String(r.Prijsbron ?? "").trim();
  return {
    id: `sw-src-${nr.padStart(3, "0")}`,
    sourceRowNumber: Number(r.__excelRow),
    sourceNr: Number(nr),
    sourceLabel,
    sourceVerdict: "VERKOPEN",
    sourceCategory: String(r.Categorie).trim(),
    sourcePriority: Number(r.Prioriteit) || 0,
    sourceAdviceEur: advies,
    sourcePriceUrl: prijsbron || null,
    sourcePdfPage: String(r["PDF-pagina"] ?? "").trim() || null,
    name,
    nameNl: name,
    nameEn: name,
    slug,
    group: mapGroup(r.Categorie),
    brand: guessBrand(name),
    licenseType: extractLicenseType(name),
    devices: extractDevices(name),
    term: extractTerm(name),
    region: "NL/EU-review-required",
    delivery: "license-key-digital",
    transferable: "review-required",
    publicationStatus: "PUBLIC_REQUEST_ONLY",
    evidenceStatus: prijsbron
      ? "SOURCE_URL_PRESENT_UNVERIFIED"
      : "MISSING_PRICE_SOURCE",
    supplierStatus: "UNVERIFIED",
    verifiedAt: null,
    priceCheckedAt: null,
    publicPriceEur: null,
    shortNl: shortDesc(name, "nl"),
    shortEn: shortDesc(name, "en"),
    disposition: "INCLUDED_GREEN_CANDIDATE",
    internalSourceAdviceEur: advies,
  };
});

const red = gezeik.map((r) => {
  const nr = String(r["Nr."]).trim();
  return {
    id: `sw-src-${nr.padStart(3, "0")}`,
    sourceNr: Number(nr),
    sourceRowNumber: Number(r.__excelRow),
    sourceLabel: String(r.Product).trim(),
    sourceCategory: String(r.Categorie).trim(),
    sourceVerdict: String(r.EINDOORDEEL).trim(),
    publicationStatus: "BLOCKED",
    disposition: "BLOCKED_RED_NOT_OFFERED",
  };
});

const catCounts = {};
for (const g of green) {
  catCounts[g.sourceCategory] = (catCounts[g.sourceCategory] || 0) + 1;
}

const missingPriceSource = green.filter((g) => !g.sourcePriceUrl).length;

const report = {
  generatedAt: new Date().toISOString(),
  sourceFile: path.basename(SRC),
  sourceSha256: sha,
  sheet: sheetName,
  totals: {
    dataRows: dataRows.length,
    expected: 468,
    verkopen: verkopen.length,
    gezeik: gezeik.length,
    other: other.length,
    expectedVerkopen: 72,
    expectedGezeik: 396,
    selectionPct: (verkopen.length / dataRows.length) * 100,
  },
  greenCategoryCounts: catCounts,
  missingPriceSourceAmongGreen: missingPriceSource,
  uniqueGreenSlugs: slugSet.size,
  otherVerdicts: other.map((r) => ({
    nr: r["Nr."],
    verdict: r.EINDOORDEEL,
  })),
  pass:
    dataRows.length === 468 &&
    verkopen.length === 72 &&
    gezeik.length === 396 &&
    other.length === 0 &&
    slugSet.size === 72,
};

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(REPORT_DIR, { recursive: true });

fs.writeFileSync(
  path.join(REPORT_DIR, "software-catalog-import-report.json"),
  JSON.stringify(report, null, 2) + "\n",
);

fs.writeFileSync(
  path.join(OUT_DIR, "source-inventory.json"),
  JSON.stringify({ report, green, red }, null, 2) + "\n",
);

const publicItems = green.map((g) => ({
  id: g.id,
  sourceNr: g.sourceNr,
  sourceRowNumber: g.sourceRowNumber,
  sourceLabel: g.sourceLabel,
  slug: g.slug,
  nameNl: g.nameNl,
  nameEn: g.nameEn,
  group: g.group,
  brand: g.brand,
  licenseType: g.licenseType,
  devices: g.devices,
  term: g.term,
  region: g.region,
  delivery: g.delivery,
  publicationStatus: g.publicationStatus,
  evidenceStatus: g.evidenceStatus,
  supplierStatus: g.supplierStatus,
  publicPriceEur: null,
  shortNl: g.shortNl,
  shortEn: g.shortEn,
  sourceCategory: g.sourceCategory,
  sourcePriority: g.sourcePriority,
  internalSourceAdviceEur: g.internalSourceAdviceEur,
}));

const ts = `/**
 * AUTO-GENERATED — do not hand-edit rows.
 * Source: ${path.basename(SRC)}
 * SHA256: ${sha}
 * Regenerator: node scripts/import-software-catalog-xlsx.cjs
 */
import type { SoftwareCatalogBlockedRef, SoftwareCatalogItem } from "./types";

export const SOFTWARE_CATALOG_SOURCE_SHA256 =
  "${sha}" as const;

export const SOFTWARE_CATALOG_STATS = {
  totalSourceRows: ${dataRows.length},
  greenCount: ${green.length},
  redCount: ${red.length},
  missingPriceSourceAmongGreen: ${missingPriceSource},
  selectionPct: ${(72 / 468) * 100},
} as const;

export const softwareCatalogItems: SoftwareCatalogItem[] = ${JSON.stringify(
  publicItems,
  null,
  2,
)};

export const softwareCatalogBlockedRefs: SoftwareCatalogBlockedRef[] = ${JSON.stringify(
  red,
  null,
  2,
)};
`;

fs.writeFileSync(path.join(OUT_DIR, "generated-inventory.ts"), ts);
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exit(1);
