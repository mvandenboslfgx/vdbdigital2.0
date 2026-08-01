import type { Locale } from "@/i18n/config";

/**
 * Dates were formatted with a hardcoded `nl-NL` all over the portal, so an
 * English session still saw Dutch month/day order. `en-GB` keeps day-first
 * ordering — the convention this audience reads — and matches the tag used for
 * currency in `src/lib/utilities/money.ts`.
 */
const DATE_TAGS: Record<Locale, string> = {
  en: "en-GB",
  nl: "nl-NL",
};

function toDate(value: string | number | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(
  value: string | number | Date | null | undefined,
  locale: Locale,
  fallback = "—",
): string {
  if (value === null || value === undefined) return fallback;
  const date = toDate(value);
  return date ? date.toLocaleDateString(DATE_TAGS[locale]) : fallback;
}

export function formatDateTime(
  value: string | number | Date | null | undefined,
  locale: Locale,
  fallback = "—",
): string {
  if (value === null || value === undefined) return fallback;
  const date = toDate(value);
  return date ? date.toLocaleString(DATE_TAGS[locale]) : fallback;
}
