import type { Locale } from "@/i18n/config";
import { productsNl } from "@/i18n/content/products-nl";
import { mergeProductForLocale } from "@/lib/commerce/product-locale-merge";
import type { Product, ProductTranslation } from "@/types";

const COPY_FIELDS = [
  "name",
  "shortDescription",
  "fullDescription",
  "seoTitle",
  "seoDescription",
] as const;

type CopyField = (typeof COPY_FIELDS)[number];

export type PublicationAdvice =
  | "READY_FOR_CONTENT_REVIEW"
  | "ENGLISH_REVIEW_REQUIRED"
  | "DUTCH_REVIEW_REQUIRED"
  | "SCOPE_REVIEW_REQUIRED"
  | "DO_NOT_PUBLISH";

type ProductWithConcept = Product & { is_concept?: boolean };

/**
 * Localize a product for display.
 *
 * Phase 4 SSOT: when `dbTranslation` is provided AND its status is
 * publishable ('published', or 'approved' for gated admin preview), its copy
 * takes priority — this is the path toward product_translations becoming the
 * single source of truth for storefront copy.
 *
 * FALLBACK ONLY: when there is no DB row for this locale yet (or the row
 * exists but isn't publishable, e.g. still 'draft'/'machine_translated'/
 * 'needs_review'), we fall back to the static `products-nl.ts` overlay so the
 * NL storefront keeps working during the migration. Once product_translations
 * reaches parity for a product, its DB row supersedes the static overlay.
 * Do not delete products-nl.ts until that parity is confirmed.
 */
export function localizeProduct(
  product: Product,
  locale: Locale,
  dbTranslation?: ProductTranslation | null,
): Product {
  if (locale === "en") {
    return product;
  }

  if (dbTranslation) {
    const merged = mergeProductForLocale(product, locale, dbTranslation);
    if (merged?.translationApplied) {
      return merged.product;
    }
  }

  // FALLBACK ONLY — see doc comment above.
  const overlay = productsNl[product.slug];
  if (!overlay) {
    return product;
  }

  return {
    ...product,
    name: overlay.name,
    shortDescription: overlay.shortDescription,
    fullDescription: overlay.fullDescription,
    categoryName: overlay.categoryName,
    deliveryTime: overlay.deliveryTime,
    includedItems: overlay.includedItems,
    excludedItems: overlay.excludedItems,
    extensions: overlay.extensions,
    requiredInput: overlay.requiredInput,
    targetAudience: overlay.targetAudience,
    workflow: overlay.workflow,
    faqs: overlay.faqs,
    seoTitle: overlay.seoTitle,
    seoDescription: overlay.seoDescription,
  };
}

export function assertProductTranslationComplete(
  product: Product,
  locale: Locale,
): { complete: boolean; missing: string[] } {
  const localized = localizeProduct(product, locale);
  const missing: string[] = [];

  for (const field of COPY_FIELDS) {
    const value = localized[field as CopyField];
    if (!value || value.trim().length === 0) {
      missing.push(field);
    }
  }

  if (!localized.includedItems || localized.includedItems.length === 0) {
    missing.push("includedItems");
  }

  return { complete: missing.length === 0, missing };
}

export function getProductPublicationAdvice(product: Product): PublicationAdvice {
  const withConcept = product as ProductWithConcept;

  if (product.status === "DRAFT" || withConcept.is_concept === true) {
    return "SCOPE_REVIEW_REQUIRED";
  }

  const enCheck = assertProductTranslationComplete(product, "en");
  if (!enCheck.complete) {
    return "ENGLISH_REVIEW_REQUIRED";
  }

  const nlCheck = assertProductTranslationComplete(product, "nl");
  if (!nlCheck.complete) {
    return "DUTCH_REVIEW_REQUIRED";
  }

  return "READY_FOR_CONTENT_REVIEW";
}
