import type { Locale } from "@/i18n/config";
import { formatCents } from "@/lib/utilities/money";
import type { CommercialCatalogItem, CommercialPrice } from "@/config/commercial/pricing";
import { priceFromExclEuros } from "@/config/commercial/pricing";

export interface DualPriceDisplay {
  exclLabel: string;
  inclLabel: string;
  isStartingFrom: boolean;
  isQuoteOnly: boolean;
  isMonthly: boolean;
}

const labels = {
  en: {
    from: "From",
    excl: "excluding VAT",
    incl: "including 21% VAT",
    month: "/month",
    proposal: "Available by proposal",
    b2b: "Business",
    b2c: "Consumer",
  },
  nl: {
    from: "Vanaf",
    excl: "excl. btw",
    incl: "incl. 21% btw",
    month: "/maand",
    proposal: "Op offerte",
    b2b: "Zakelijk",
    b2c: "Consument",
  },
} as const;

export function formatDualPrice(
  item: CommercialCatalogItem,
  locale: Locale,
): DualPriceDisplay {
  const copy = labels[locale];
  if (item.quoteOnly || !item.pricing) {
    return {
      exclLabel: copy.proposal,
      inclLabel: "",
      isStartingFrom: false,
      isQuoteOnly: true,
      isMonthly: item.monthly,
    };
  }
  return formatPricePair(item.pricing, locale, item.pricing.mode === "starting_from");
}

export function formatPricePair(
  pricing: CommercialPrice,
  locale: Locale,
  startingFrom = false,
): DualPriceDisplay {
  const copy = labels[locale];
  const month = pricing.mode === "monthly" ? copy.month : "";
  const prefix = startingFrom || pricing.mode === "starting_from" ? `${copy.from} ` : "";
  return {
    exclLabel: `${prefix}${formatCents(pricing.exclVatCents, locale)}${month} ${copy.excl}`,
    inclLabel: `${prefix}${formatCents(pricing.inclVatCents, locale)}${month} ${copy.incl}`,
    isStartingFrom: startingFrom || pricing.mode === "starting_from",
    isQuoteOnly: false,
    isMonthly: pricing.mode === "monthly",
  };
}

export function formatFoundingPrice(
  foundingExclVatCents: number,
  locale: Locale,
  monthly = false,
): DualPriceDisplay {
  const euros = foundingExclVatCents / 100;
  const pricing = priceFromExclEuros(euros, monthly ? "monthly" : "fixed");
  return formatPricePair(pricing, locale, false);
}
