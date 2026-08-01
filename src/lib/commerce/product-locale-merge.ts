/**
 * Pure merge logic for Phase 4 product_translations SSOT foundation.
 *
 * Kept free of server-only imports (no DB client) so it can be unit tested
 * directly and reused both by the storefront repository layer
 * (src/server/repositories/product-locale.ts) and by the legacy
 * localizeProduct() helper (src/i18n/localize-product.ts).
 *
 * Hard rule: a translation row is only ever allowed to overlay the public
 * product when its status is 'published' (or 'approved', and only when the
 * caller explicitly opts into admin preview mode). 'machine_translated' —
 * and every other status — must never leak to storefront visitors.
 */
import type { CatalogLocale, Product, ProductTranslation, ProductTranslationStatus } from "@/types";

export interface MergeProductForLocaleOptions {
  /** Admin-only preview mode: also allow 'approved' (never 'machine_translated'/'needs_review'/'draft'/'stale'). */
  allowApprovedPreview?: boolean;
}

export interface ProductLocaleMergeResult {
  product: Product;
  /** True when translationRow copy was actually applied to the returned product. */
  translationApplied: boolean;
  /** Status of the translation row that was evaluated, or null when none was considered. */
  usedStatus: ProductTranslationStatus | null;
}

/** Statuses that may ever be shown to a real visitor (never 'machine_translated'). */
const PUBLIC_STATUSES: ReadonlySet<ProductTranslationStatus> = new Set(["published"]);
const ADMIN_PREVIEW_STATUSES: ReadonlySet<ProductTranslationStatus> = new Set([
  "published",
  "approved",
]);

export function isPublishableTranslationStatus(
  status: ProductTranslationStatus | null | undefined,
  options: MergeProductForLocaleOptions = {},
): boolean {
  if (!status) return false;
  const allowed = options.allowApprovedPreview ? ADMIN_PREVIEW_STATUSES : PUBLIC_STATUSES;
  return allowed.has(status);
}

/**
 * The `products` row is always treated as the canonical English source of
 * truth. If it lacks the minimum copy fields, there is nothing safe to serve
 * for ANY locale (including EN) — this is the "controlled unavailable" case.
 */
export function hasMinimalEnglishContent(product: Product): boolean {
  return Boolean(product.name?.trim()) && Boolean(product.shortDescription?.trim());
}

function nonEmpty(value: string | null | undefined): string | undefined {
  return value && value.trim().length > 0 ? value : undefined;
}

/**
 * Merge a product_translations row onto the canonical product for the
 * requested locale.
 *
 * - locale 'en': the products row IS the EN copy — returned unchanged.
 * - locale !== 'en': only overlay when translationRow.status is publishable
 *   (published, or approved when options.allowApprovedPreview is set).
 *   Otherwise the EN row is returned untouched (safe fallback) — this
 *   deliberately does NOT fall back to the static products-nl.ts overlay;
 *   callers that want that behaviour should use localizeProduct().
 * - Returns null ("controlled unavailable") when the canonical EN row itself
 *   is missing minimum content — there is nothing safe to render.
 */
export function mergeProductForLocale(
  product: Product,
  locale: CatalogLocale,
  translationRow: ProductTranslation | null,
  options: MergeProductForLocaleOptions = {},
): ProductLocaleMergeResult | null {
  if (!hasMinimalEnglishContent(product)) {
    return null;
  }

  if (locale === "en") {
    return { product, translationApplied: false, usedStatus: null };
  }

  if (!translationRow || translationRow.locale !== locale) {
    return { product, translationApplied: false, usedStatus: null };
  }

  const status = translationRow.status ?? "draft";
  if (!isPublishableTranslationStatus(status, options)) {
    return { product, translationApplied: false, usedStatus: status };
  }

  const merged: Product = {
    ...product,
    name: nonEmpty(translationRow.name) ?? product.name,
    shortDescription: nonEmpty(translationRow.shortDescription) ?? product.shortDescription,
    fullDescription: nonEmpty(translationRow.fullDescription) ?? product.fullDescription,
    benefits: translationRow.benefits.length > 0 ? translationRow.benefits : product.benefits,
    includedItems:
      translationRow.includedItems.length > 0 ? translationRow.includedItems : product.includedItems,
    excludedItems:
      translationRow.excludedItems.length > 0 ? translationRow.excludedItems : product.excludedItems,
    ctaLabel: nonEmpty(translationRow.ctaLabel) ?? product.ctaLabel,
    quoteCtaLabel: nonEmpty(translationRow.quoteCtaLabel) ?? product.quoteCtaLabel,
    seoTitle: nonEmpty(translationRow.seoTitle) ?? product.seoTitle,
    seoDescription: nonEmpty(translationRow.seoDescription) ?? product.seoDescription,
    deliveryTime: nonEmpty(translationRow.deliveryTime) ?? product.deliveryTime,
    targetAudience: nonEmpty(translationRow.targetAudience) ?? product.targetAudience,
    workflow: nonEmpty(translationRow.workflow) ?? product.workflow,
    warnings: nonEmpty(translationRow.warnings) ?? product.warnings,
  };

  return { product: merged, translationApplied: true, usedStatus: status };
}
