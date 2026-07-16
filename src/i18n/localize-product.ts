import type { Locale } from "@/i18n/config";
import { productsNl } from "@/i18n/content/products-nl";
import type { Product } from "@/types";

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

export function localizeProduct(product: Product, locale: Locale): Product {
  if (locale === "en") {
    return product;
  }

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
