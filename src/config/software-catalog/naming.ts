/**
 * Canonical product naming for software catalog imports.
 * Target format: `Microsoft Windows 11 Pro — Retail — 1 device — Perpetual`
 */

const PLACEHOLDER_VALUES = new Set([
  "unknown",
  "unspecified",
  "review-required",
  "nl/eu-review-required",
]);

export function isPlaceholderValue(value: string | null | undefined): boolean {
  if (value == null) return true;
  const v = value.trim().toLowerCase();
  return v.length === 0 || PLACEHOLDER_VALUES.has(v);
}

export function normalizeSoftwareSourceLabel(raw: string): string {
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

export function extractDevices(name: string): number | null {
  const m = String(name).match(
    /(\d+)\s*(pc|pcs|device|devices|user|users|apparaat|apparaten)/i,
  );
  return m ? Number(m[1]) : null;
}

export function extractTermEn(name: string): string {
  const y = String(name).match(/(\d+)\s*(jaar|year|yr|years)/i);
  if (y) return `${y[1]} year${Number(y[1]) === 1 ? "" : "s"}`;
  if (/lifetime|levenslang/i.test(name)) return "Lifetime";
  if (/retail|oem/i.test(name) && /windows/i.test(name)) return "Perpetual";
  return "unspecified";
}

export function extractTermNl(name: string): string {
  const y = String(name).match(/(\d+)\s*(jaar|year|yr|years)/i);
  if (y) return `${y[1]} jaar`;
  if (/lifetime|levenslang/i.test(name)) return "Levenslang";
  if (/retail|oem/i.test(name) && /windows/i.test(name)) return "Eeuwigdurend";
  return "unspecified";
}

export function extractLicenseType(name: string): string {
  if (/oem/i.test(name)) return "OEM";
  if (/retail/i.test(name)) return "Retail";
  if (/lifetime|levenslang/i.test(name)) return "Lifetime";
  if (/jaar|year|subscription/i.test(name)) return "Subscription";
  return "Unknown";
}

export function extractPlatform(name: string): string {
  const n = name.toLowerCase();
  const parts: string[] = [];
  if (/windows|win\s+\d+/i.test(name)) parts.push("Windows");
  if (/\bmac\b|macos|ios/i.test(name)) parts.push("macOS");
  if (/ipad/i.test(name)) parts.push("iPad");
  if (parts.length === 0 && /windows/i.test(n)) parts.push("Windows");
  return parts.length > 0 ? parts.join(" + ") : "unspecified";
}

export function guessManufacturer(name: string): string {
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
  if (n.includes("trend micro")) return "Trend Micro";
  if (n.includes("avira")) return "Avira";
  if (n.includes("nitro")) return "Nitro";
  if (n.includes("pdf expert")) return "Readdle";
  if (n.includes("roboform")) return "RoboForm";
  if (n.includes("beyond compare")) return "Scooter Software";
  if (n.includes("voicemod")) return "Voicemod";
  if (n.includes("disk drill")) return "CleverFiles";
  if (n.includes("cleanmymac")) return "MacPaw";
  if (n.includes("betterdisplay")) return "BetterDisplay";
  if (n.includes("uninstall tool")) return "CrystalIDEA";
  return "Unknown";
}

export function buildCanonicalNameEn(parts: {
  manufacturer: string;
  product: string;
  edition?: string | null;
  devices?: number | null;
  term: string;
}): string {
  const segments = [parts.manufacturer, parts.product];
  if (parts.edition) segments.push(parts.edition);
  if (parts.devices != null) segments.push(`${parts.devices} device${parts.devices === 1 ? "" : "s"}`);
  if (!isPlaceholderValue(parts.term)) segments.push(parts.term);
  return segments.filter(Boolean).join(" — ");
}

export function buildCanonicalNameNl(parts: {
  manufacturer: string;
  product: string;
  edition?: string | null;
  devices?: number | null;
  term: string;
}): string {
  const segments = [parts.manufacturer, parts.product];
  if (parts.edition) segments.push(parts.edition);
  if (parts.devices != null) {
    segments.push(`${parts.devices} apparaat${parts.devices === 1 ? "" : "en"}`);
  }
  if (!isPlaceholderValue(parts.term)) segments.push(parts.term);
  return segments.filter(Boolean).join(" — ");
}

export function buildShortDescriptionEn(canonicalName: string): string {
  return `${canonicalName}. Request a verified quote for availability and licensing terms.`;
}

export function buildShortDescriptionNl(canonicalName: string): string {
  return `${canonicalName}. Vraag een geverifieerde offerte aan voor beschikbaarheid en licentievoorwaarden.`;
}
