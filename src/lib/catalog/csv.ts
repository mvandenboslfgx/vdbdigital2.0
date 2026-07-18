/**
 * Safe CSV helpers for catalog export/import.
 * Prevents formula injection; never imports legal approval or checkout eligibility.
 */

const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export function escapeCsvCell(value: string | number | null | undefined): string {
  const raw = value === null || value === undefined ? "" : String(value);
  const safe = FORMULA_PREFIX.test(raw) ? `'${raw}` : raw;
  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function csvRow(cells: Array<string | number | null | undefined>): string {
  return cells.map(escapeCsvCell).join(",");
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch === "\r") {
      // skip
    } else {
      cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

/** Strip leading apostrophe used as CSV-injection guard */
export function normalizeImportedCell(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("'") && FORMULA_PREFIX.test(trimmed.slice(1))) {
    return trimmed.slice(1);
  }
  return trimmed;
}

export const PRODUCT_EXPORT_HEADERS = [
  "sku",
  "name",
  "slug",
  "category",
  "price_cents",
  "from_price_cents",
  "price_mode",
  "billing_model",
  "status",
  "audience_b2b",
  "audience_b2c",
  "seo_title",
  "seo_description",
  "updated_at",
] as const;

/** Fields that must never be imported */
export const FORBIDDEN_IMPORT_HEADERS = [
  "legal_status",
  "legal_approved_by",
  "legal_approved_at",
  "publication_ready",
  "price_status",
  "checkout_eligible",
  "checkout_eligibility",
] as const;
