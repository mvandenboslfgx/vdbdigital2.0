import type { Locale } from "@/i18n/config";
import type { Product } from "@/types";
import { formatCents, formatPriceLabel } from "@/lib/utilities/money";
import { assertProductTranslationComplete } from "@/i18n/localize-product";

/** Products that must never appear publicly even if a row exists. */
const BLOCKED_SLUG_FRAGMENTS = [
  "netflix",
  "spotify",
  "disney",
  "hbo",
  "crunchyroll",
  "iptv",
  "office-365",
  "microsoft-365",
  "autocad",
  "android-tv",
] as const;

/** Legacy export kept empty: Supabase is now the only commercial catalog. */
export const COMMERCIAL_SSOT_PUBLIC_SLUGS: ReadonlySet<string> = new Set();

export function isCommercialSsotPublicSlug(slug: string): boolean {
  return COMMERCIAL_SSOT_PUBLIC_SLUGS.has(slug.toLowerCase());
}

export function isBlockedPublicShopSlug(slug: string): boolean {
  const s = slug.toLowerCase();
  if (isCommercialSsotPublicSlug(s)) return true;
  return BLOCKED_SLUG_FRAGMENTS.some((frag) => s.includes(frag));
}

/** Public gate: published + legal/commercial approval + complete copy/image. */
export function isPublicShopProduct(product: Product): boolean {
  if (product.status !== "PUBLISHED") return false;
  if (product.isActive !== true) return false;
  if (product.categoryActive !== true) return false;
  if (product.isConcept) return false;
  if (product.publicationReady !== true) return false;
  if (isBlockedPublicShopSlug(product.slug)) return false;
  const legal = product.legalStatus;
  if (
    legal !== "APPROVED_FOR_B2B" &&
    legal !== "APPROVED_FOR_B2C" &&
    legal !== "APPROVED_FOR_BOTH"
  ) {
    return false;
  }
  const price = product.priceStatus;
  if (price !== "APPROVED" && price !== "PUBLISHED") return false;
  if (!product.name?.trim()) return false;
  if (!product.shortDescription?.trim()) return false;
  if (!product.fullDescription?.trim()) return false;
  if (!product.primaryImagePath?.trim()) return false;
  if ((product.minQuantity ?? 0) < 1) return false;
  if ((product.maxQuantity ?? 0) < (product.minQuantity ?? 1)) return false;
  for (const locale of ["nl", "en"] as const) {
    if (!assertProductTranslationComplete(product, locale).complete) return false;
  }
  const primaryMedia = product.media?.find((media) => media.isPrimary);
  if (!primaryMedia?.altTextNl?.trim() || !primaryMedia.altTextEn?.trim()) return false;
  if (product.priceMode === "FIXED" && (product.priceCents ?? 0) <= 0) return false;
  if (
    product.priceMode === "STARTING_FROM" &&
    (product.fromPriceCents ?? product.priceCents ?? 0) <= 0
  ) {
    return false;
  }
  if (
    product.priceMode === "QUOTE_ONLY" &&
    product.billingType !== "QUOTE_ONLY"
  ) {
    return false;
  }
  return true;
}

export function publicShopPriceDisplay(
  product: Product,
  locale: Locale,
): { label: string; mode: "fixed" | "from" | "on_request" } {
  const onRequest = locale === "nl" ? "Prijs op aanvraag" : "Price on request";

  // Quote-only never surfaces a concrete from/fixed amount in the public shop.
  if (product.priceMode === "QUOTE_ONLY" || product.billingType === "QUOTE_ONLY") {
    return { label: onRequest, mode: "on_request" };
  }

  if (product.priceLabel?.trim()) {
    const mode =
      product.priceMode === "FIXED"
        ? "fixed"
        : product.priceMode === "STARTING_FROM"
          ? "from"
          : "on_request";
    if (
      product.priceMode === "FIXED" &&
      product.priceCents != null &&
      product.priceCents > 0
    ) {
      return {
        label: product.priceLabel || formatCents(product.priceCents, locale),
        mode: "fixed",
      };
    }
    if (product.priceMode === "STARTING_FROM") {
      const from = product.fromPriceCents ?? product.priceCents;
      if (from != null && from > 0) {
        return {
          label:
            product.priceLabel ||
            formatPriceLabel(null, from, product.billingType, locale),
          mode: "from",
        };
      }
    }
    return { label: product.priceLabel, mode };
  }

  if (
    product.priceMode === "FIXED" &&
    product.priceCents != null &&
    product.priceCents > 0
  ) {
    return {
      label: formatPriceLabel(
        product.priceCents,
        null,
        product.billingType,
        locale,
      ),
      mode: "fixed",
    };
  }

  if (product.priceMode === "STARTING_FROM") {
    const from = product.fromPriceCents ?? product.priceCents;
    if (from != null && from > 0) {
      return {
        label: formatPriceLabel(null, from, product.billingType, locale),
        mode: "from",
      };
    }
  }

  return { label: onRequest, mode: "on_request" };
}

export function publicShopCtaLabel(product: Product, locale: Locale): string {
  if (product.quoteCtaLabel?.trim()) return product.quoteCtaLabel;
  if (product.ctaLabel?.trim()) return product.ctaLabel;
  if (product.priceMode === "QUOTE_ONLY" || product.billingType === "QUOTE_ONLY") {
    return locale === "nl" ? "Configureer aanvraag" : "Configure request";
  }
  if (product.billingType === "MONTHLY" || product.billingType === "YEARLY") {
    return locale === "nl" ? "Abonneren" : "Subscribe";
  }
  if (product.priceMode === "FIXED" || product.priceCents != null) {
    return locale === "nl" ? "Bestellen" : "Order";
  }
  return locale === "nl" ? "Configureer aanvraag" : "Configure request";
}
