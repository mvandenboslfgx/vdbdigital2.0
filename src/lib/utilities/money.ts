import type { Locale } from "@/i18n/config";

function currencyFormatter(locale: Locale) {
  return new Intl.NumberFormat(locale === "nl" ? "nl-NL" : "en-GB", {
    style: "currency",
    currency: "EUR",
  });
}

export function formatCents(cents: number, locale: Locale = "en"): string {
  return currencyFormatter(locale).format(cents / 100);
}

const priceCopy = {
  en: {
    onQuote: "On quote",
    free: "Free",
    from: "From ",
    month: "/month",
    year: "/year",
    monthly: "monthly",
    yearly: "yearly",
    oneTime: "one-time",
  },
  nl: {
    onQuote: "Op offerte",
    free: "Gratis",
    from: "Vanaf ",
    month: "/maand",
    year: "/jaar",
    monthly: "maandelijks",
    yearly: "jaarlijks",
    oneTime: "eenmalig",
  },
} as const;

export function formatPriceLabel(
  priceCents: number | null,
  fromPriceCents: number | null,
  billingType: string,
  locale: Locale = "en",
): string {
  const copy = priceCopy[locale] ?? priceCopy.en;

  if (billingType === "QUOTE_ONLY") {
    return copy.onQuote;
  }
  if (billingType === "FREE") {
    return copy.free;
  }

  const amount = fromPriceCents ?? priceCents;
  if (amount === null) {
    return copy.onQuote;
  }

  const formatted = formatCents(amount, locale);
  const prefix = fromPriceCents !== null ? copy.from : "";

  switch (billingType) {
    case "MONTHLY":
      return `${prefix}${formatted}${copy.month}`;
    case "YEARLY":
      return `${prefix}${formatted}${copy.year}`;
    default:
      return `${prefix}${formatted}`;
  }
}

export function billingPeriodLabel(
  billingType: string,
  locale: Locale = "en",
): string {
  const copy = priceCopy[locale] ?? priceCopy.en;
  switch (billingType) {
    case "MONTHLY":
      return copy.monthly;
    case "YEARLY":
      return copy.yearly;
    case "ONE_TIME":
      return copy.oneTime;
    case "QUOTE_ONLY":
      return copy.onQuote;
    case "FREE":
      return copy.free.toLowerCase();
    default:
      return billingType;
  }
}
