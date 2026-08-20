import type { Locale } from "@/i18n/config";
import type { Product } from "@/types";

export type PublicationAdvice =
  | "READY_FOR_CONTENT_REVIEW"
  | "ENGLISH_REVIEW_REQUIRED"
  | "DUTCH_REVIEW_REQUIRED"
  | "SCOPE_REVIEW_REQUIRED"
  | "DO_NOT_PUBLISH";

type ProductWithConcept = Product & { is_concept?: boolean };

export function localizeProduct(product: Product, locale: Locale): Product {
  const translation = product.translations?.find((item) => item.locale === locale);
  const categoryName =
    locale === "nl"
      ? product.categoryNameNl?.trim() || product.categoryName
      : product.categoryName;

  if (!translation) return { ...product, categoryName };

  return {
    ...product,
    name: translation.name,
    slug: translation.slug?.trim() || product.slug,
    shortDescription: translation.shortDescription,
    fullDescription: translation.fullDescription,
    categoryName,
    deliveryTime: translation.deliveryTime?.trim() || product.deliveryTime,
    includedItems: translation.includedItems,
    excludedItems: translation.excludedItems,
    benefits: translation.benefits,
    ctaLabel: translation.ctaLabel ?? product.ctaLabel,
    quoteCtaLabel: translation.quoteCtaLabel ?? product.quoteCtaLabel,
    targetAudience: translation.targetAudience ?? product.targetAudience,
    workflow: translation.workflow ?? product.workflow,
    warnings: translation.warnings ?? product.warnings,
    seoTitle: translation.seoTitle?.trim() || product.seoTitle,
    seoDescription: translation.seoDescription?.trim() || product.seoDescription,
    imageAlt:
      product.media?.find((media) => media.isPrimary)?.[
        locale === "nl" ? "altTextNl" : "altTextEn"
      ] ?? product.imageAlt,
  };
}

export function assertProductTranslationComplete(
  product: Product,
  locale: Locale,
): { complete: boolean; missing: string[] } {
  const translation = product.translations?.find((item) => item.locale === locale);
  if (!translation) {
    return {
      complete: false,
      missing: [
        "translation",
        "name",
        "shortDescription",
        "fullDescription",
        "seoTitle",
        "seoDescription",
        "includedItems",
      ],
    };
  }
  const missing: string[] = [];
  const fields = {
    name: translation.name,
    shortDescription: translation.shortDescription,
    fullDescription: translation.fullDescription,
    seoTitle: translation.seoTitle,
    seoDescription: translation.seoDescription,
  };
  for (const [field, value] of Object.entries(fields)) {
    if (!value?.trim()) missing.push(field);
  }
  if (translation.includedItems.length === 0) {
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
