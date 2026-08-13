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

/** Copy fields the admin translation workflow treats as required before a translation can publish. */
const REQUIRED_TRANSLATION_FIELDS = [
  "name",
  "shortDescription",
  "fullDescription",
  "seoTitle",
  "seoDescription",
] as const;

export type RequiredTranslationField = (typeof REQUIRED_TRANSLATION_FIELDS)[number];

export interface TranslationCompletenessInput {
  name?: string | null;
  shortDescription?: string | null;
  fullDescription?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  includedItems?: string[] | null;
}

/**
 * Admin translation workflow completeness check (distinct from
 * assertProductTranslationComplete() in src/i18n/localize-product.ts, which
 * checks the *resolved* storefront copy including static-overlay fallback).
 * This checks the raw DB translation row fields only — used to gate the
 * draft -> published transition in the admin editor.
 */
export function getMissingTranslationFields(
  input: TranslationCompletenessInput,
): string[] {
  const missing: string[] = [];
  for (const field of REQUIRED_TRANSLATION_FIELDS) {
    const value = input[field];
    if (!value || value.trim().length === 0) missing.push(field);
  }
  if (!input.includedItems || input.includedItems.length === 0) {
    missing.push("includedItems");
  }
  return missing;
}

/**
 * Fields of the canonical English source that a translation is reviewed
 * against. When any of these change, every non-English translation is
 * considered drifted and must be re-reviewed.
 */
export interface TranslationSourceInput {
  name?: string | null;
  shortDescription?: string | null;
  fullDescription?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  benefits?: string[] | null;
  includedItems?: string[] | null;
  excludedItems?: string[] | null;
}

function normalizeSourcePart(value: string | string[] | null | undefined): string {
  if (Array.isArray(value)) return value.map((v) => v.trim()).join("\u0001");
  return (value ?? "").trim();
}

/**
 * Stable content fingerprint of the English source copy, stored on the
 * translation row as `source_hash`.
 *
 * Deliberately a plain FNV-1a variant rather than a crypto digest: this runs
 * in the admin editor (a client component) as well as in the server action, so
 * it must not pull in `node:crypto`. It is drift detection, not a security
 * control — a collision only means a re-review is skipped, and the publish
 * gate still requires an explicit human 'approved' status either way.
 */
export function computeTranslationSourceHash(input: TranslationSourceInput): string {
  const serialized = [
    normalizeSourcePart(input.name),
    normalizeSourcePart(input.shortDescription),
    normalizeSourcePart(input.fullDescription),
    normalizeSourcePart(input.seoTitle),
    normalizeSourcePart(input.seoDescription),
    normalizeSourcePart(input.benefits),
    normalizeSourcePart(input.includedItems),
    normalizeSourcePart(input.excludedItems),
  ].join("\u0000");

  let hash = 0x811c9dc5;
  for (let i = 0; i < serialized.length; i += 1) {
    hash ^= serialized.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return `v1.${serialized.length.toString(36)}.${hash.toString(36)}`;
}

/**
 * True when the English source has changed since this translation was last
 * reviewed against it.
 *
 * A row with no stored `source_hash` predates staleness tracking; it is NOT
 * reported as stale, because we cannot tell drift from "never recorded" and
 * flagging every legacy row would bury the real signal. Such rows record a
 * hash on their next save.
 */
export function isTranslationSourceStale(
  storedSourceHash: string | null | undefined,
  currentSourceHash: string,
): boolean {
  if (!storedSourceHash) return false;
  return storedSourceHash !== currentSourceHash;
}

export type TranslationPublishBlockReason =
  | "missing_fields"
  | "not_approved"
  | "forbidden"
  | "stale";

export interface TranslationTransitionResult {
  allowed: boolean;
  reason?: TranslationPublishBlockReason;
  missingFields?: string[];
}

export interface TranslationTransitionOptions {
  missingFields: string[];
  previousStatus: ProductTranslationStatus | null | undefined;
  /** Actor lacks the 'products.publish' capability — publish must be denied even when content is complete. */
  canPublish?: boolean;
  /** The English source changed after the last review — re-review is required. */
  sourceStale?: boolean;
}

/**
 * Publish gate for the admin translation workflow. A translation may only be
 * promoted to 'published' when:
 *  - the actor holds the 'products.publish' capability, AND
 *  - every required copy field is present, AND
 *  - the English source has not drifted since the last review, AND
 *  - it has already passed human review (previous status 'approved', or is
 *    already 'published' — re-saving copy edits keeps it published).
 * Every other requested status transition is always allowed — the workflow
 * only ever gates the promotion TO 'published'.
 */
export function canTransitionTranslationStatus(
  nextStatus: ProductTranslationStatus,
  options: TranslationTransitionOptions,
): TranslationTransitionResult {
  if (nextStatus !== "published") return { allowed: true };

  if (options.canPublish === false) {
    return { allowed: false, reason: "forbidden" };
  }

  if (options.missingFields.length > 0) {
    return { allowed: false, reason: "missing_fields", missingFields: options.missingFields };
  }

  if (options.sourceStale) {
    return { allowed: false, reason: "stale" };
  }

  const previous = options.previousStatus ?? "draft";
  if (previous !== "approved" && previous !== "published") {
    return { allowed: false, reason: "not_approved" };
  }

  return { allowed: true };
}

/** Status a blocked publish attempt is safely downgraded to. */
export function downgradeStatusForBlockedPublish(
  reason: TranslationPublishBlockReason,
): ProductTranslationStatus {
  return reason === "stale" ? "stale" : "needs_review";
}
