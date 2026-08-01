import type { Locale } from "./config";

/** Shared ICU-backed formatters for dates, numbers, currency (EUR). */
export function createLocaleFormatters(locale: Locale) {
  const timeZone = "Europe/Amsterdam";

  return {
    date(value: Date | number) {
      return new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeZone,
      }).format(value);
    },
    dateTime(value: Date | number) {
      return new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone,
      }).format(value);
    },
    number(value: number, options?: Intl.NumberFormatOptions) {
      return new Intl.NumberFormat(locale, options).format(value);
    },
    percent(value: number, options?: Intl.NumberFormatOptions) {
      return new Intl.NumberFormat(locale, {
        style: "percent",
        ...options,
      }).format(value);
    },
    currency(cents: number, currency = "EUR", options?: Intl.NumberFormatOptions) {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        ...options,
      }).format(cents / 100);
    },
  };
}
