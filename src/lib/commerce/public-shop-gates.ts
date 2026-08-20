import type { Locale } from "@/i18n/config";
import type { Product } from "@/types";
import { formatCents, formatPriceLabel } from "@/lib/utilities/money";
import { websitePackages } from "@/config/commercial/website-packages";
import { carePackages } from "@/config/commercial/care-packages";
import { commercialBundles } from "@/config/commercial/bundles";

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

/**
 * Slugs owned by commercial SSOT sections (packages / care / bundles).
 * Keep them out of the generic product grid so pricing/copy cannot diverge.
 */
export const COMMERCIAL_SSOT_PUBLIC_SLUGS: ReadonlySet<string> = new Set([
  ...websitePackages.map((p) => p.slug),
  ...websitePackages.map((p) => p.catalogSlug),
  ...carePackages.map((p) => p.slug),
  ...carePackages.map((p) => p.catalogSlug),
  ...commercialBundles.map((b) => b.slug),
  ...commercialBundles.map((b) => b.catalogSlug),
  // Care catalog slug aliases that still exist as legacy product rows
  "digital-partner",
]);

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
  if (product.isConcept) return false;
  if (product.publicationReady === false) return false;
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
    return locale === "nl" ? "Offerte aanvragen" : "Request a quote";
  }
  return locale === "nl" ? "Beschikbaarheid aanvragen" : "Request availability";
}
