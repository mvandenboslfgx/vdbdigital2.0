import type { Locale } from "@/i18n/config";
import { formatCents } from "@/lib/utilities/money";
import type { CommercialCatalogItem, CommercialPrice } from "@/config/commercial/pricing";
import { priceFromExclEuros } from "@/config/commercial/pricing";

/**
 * Layered commercial price display (max 4 visual layers).
 * Layer 1: amount ("Vanaf €995" / "Prijs op aanvraag")
 * Layer 2: VAT excl note
 * Layer 3: optional incl amount (no "From" repeat)
 * Layer 4: scope / final-price note
 */
export interface DualPriceDisplay {
  /** Layer 1 — hero amount line */
  amountLabel: string;
  /** Layer 2 — e.g. "exclusief 21% btw" */
  vatExclNote: string;
  /** Layer 3 — e.g. "€1.203,95 inclusief btw"; empty when N/A */
  inclAmountLabel: string;
  /** Layer 4 — scope / proposal supporting note */
  scopeNote: string;
  /**
   * Legacy combined excl line (Layer 1 + 2). Prefer layered fields in new UI.
   * Kept for shop/callers that still render a single excl string.
   */
  exclLabel: string;
  /** Legacy incl line without starting-from prefix. */
  inclLabel: string;
  isStartingFrom: boolean;
  isQuoteOnly: boolean;
  isMonthly: boolean;
}

const labels = {
  en: {
    from: "From",
    excl: "excluding 21% VAT",
    incl: "including 21% VAT",
    month: "/month",
    proposal: "Available by proposal",
    quoteScope:
      "Scope, planning, and investment are defined after the introduction.",
    fixedScope: "Final price after introduction and scope definition.",
    b2b: "Business",
    b2c: "Consumer",
  },
  nl: {
    from: "Vanaf",
    excl: "exclusief 21% btw",
    incl: "inclusief 21% btw",
    month: "/maand",
    proposal: "Prijs op aanvraag",
    quoteScope:
      "Scope, planning en investering worden na de kennismaking uitgewerkt.",
    fixedScope: "Definitieve prijs na kennismaking en scopebepaling.",
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
      amountLabel: copy.proposal,
      vatExclNote: "",
      inclAmountLabel: "",
      scopeNote: copy.quoteScope,
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
  const isFrom = startingFrom || pricing.mode === "starting_from";
  const amount = formatCents(pricing.exclVatCents, locale);
  const inclAmount = formatCents(pricing.inclVatCents, locale);
  const amountLabel = isFrom
    ? `${copy.from} ${amount}${month}`
    : `${amount}${month}`;

  return {
    amountLabel,
    vatExclNote: copy.excl,
    inclAmountLabel: `${inclAmount}${month} ${copy.incl}`,
    scopeNote: isFrom ? copy.fixedScope : "",
    exclLabel: `${amountLabel} ${copy.excl}`,
    inclLabel: `${inclAmount}${month} ${copy.incl}`,
    isStartingFrom: isFrom,
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
