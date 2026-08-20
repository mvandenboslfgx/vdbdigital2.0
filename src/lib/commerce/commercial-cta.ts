import type { Locale } from "@/i18n/config";
import { paths } from "@/i18n/config";
import type { BillingType } from "@/types";

export type CommercialCtaKind = "order" | "subscribe" | "configure" | "quote";

export function resolveCommercialCtaKind(args: {
  quoteOnly: boolean;
  billingType?: BillingType | null;
  monthly?: boolean;
}): CommercialCtaKind {
  if (args.quoteOnly) return "configure";
  if (
    args.monthly ||
    args.billingType === "MONTHLY" ||
    args.billingType === "YEARLY"
  ) {
    return "subscribe";
  }
  return "order";
}

export function commercialCtaLabel(kind: CommercialCtaKind, locale: Locale): string {
  if (locale === "nl") {
    switch (kind) {
      case "order":
        return "Bestellen";
      case "subscribe":
        return "Abonneren";
      case "configure":
        return "Configureer aanvraag";
      case "quote":
        return "Offerte aanvragen";
    }
  }
  switch (kind) {
    case "order":
      return "Order";
    case "subscribe":
      return "Subscribe";
    case "configure":
      return "Configure request";
    case "quote":
      return "Request a quote";
  }
}

/** Quote/order intake until direct checkout is enabled for the SKU. */
export function commercialPackageCtaHref(args: {
  slug: string;
  kind: CommercialCtaKind;
}): string {
  if (args.kind === "configure" || args.kind === "quote") {
    return `${paths.quote}?package=${encodeURIComponent(args.slug)}&intent=configure`;
  }
  return `${paths.quote}?package=${encodeURIComponent(args.slug)}&intent=order`;
}
