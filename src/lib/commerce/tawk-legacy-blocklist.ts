/**
 * Exact identifiers for legacy Tawk.to catalog records.
 * Fail-closed blocklist — never sell, publish, or surface publicly.
 * Do not use broad LIKE '%chat%' matching for deletions.
 */

export const LEGACY_TAWK_PRODUCT_SLUGS = [
  "tawk-to-livechat-installatie",
] as const;

export const LEGACY_TAWK_PRODUCT_IDS = ["prod-tawk-installatie"] as const;

export const LEGACY_TAWK_CATEGORY_SLUGS = ["livechat"] as const;

/** SKUs / internal identifiers that must never re-enter the active catalog. */
export const LEGACY_TAWK_SKUS = [
  "TAWK-LIVECHAT-SETUP",
  "tawk-to-livechat-installatie",
  "prod-tawk-installatie",
] as const;

/** Public / admin mutation error — no vendor brand name. */
export const LEGACY_TAWK_PUBLIC_DENIED_MESSAGE =
  "Dit product of deze dienst wordt niet meer aangeboden.";

export const LEGACY_TAWK_ADMIN_STATUS_LABEL =
  "Verwijderd product — niet verkoopbaar";

const slugSet = new Set<string>([
  ...LEGACY_TAWK_PRODUCT_SLUGS,
  ...LEGACY_TAWK_PRODUCT_SLUGS.map((s) => s.toLowerCase()),
]);
const idSet = new Set<string>(LEGACY_TAWK_PRODUCT_IDS);
const categorySet = new Set<string>([
  ...LEGACY_TAWK_CATEGORY_SLUGS,
  ...LEGACY_TAWK_CATEGORY_SLUGS.map((s) => s.toLowerCase()),
]);
const skuSet = new Set<string>(LEGACY_TAWK_SKUS.map((s) => s.toLowerCase()));

/** Brand / token markers in commercial copy (not broad "chat"). */
const BRAND_RE = /tawk\.?\s*to|\btawk\b/i;

export function containsTawkBrandMarker(
  value: string | null | undefined,
): boolean {
  if (!value) return false;
  return BRAND_RE.test(value);
}

export function isLegacyTawkProductSlug(
  slug: string | null | undefined,
): boolean {
  if (!slug) return false;
  const s = slug.trim();
  if (slugSet.has(s) || slugSet.has(s.toLowerCase())) return true;
  return /tawk/i.test(s);
}

export function isLegacyTawkProductId(id: string | null | undefined): boolean {
  if (!id) return false;
  return idSet.has(id.trim());
}

export function isLegacyTawkCategorySlug(
  slug: string | null | undefined,
): boolean {
  if (!slug) return false;
  return (
    categorySet.has(slug.trim()) || categorySet.has(slug.trim().toLowerCase())
  );
}

export function isLegacyTawkSku(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  if (skuSet.has(v)) return true;
  return /(^|[^a-z])tawk([^a-z]|$)/i.test(v);
}

export function isLegacyTawkProduct(input: {
  id?: string | null;
  slug?: string | null;
  name?: string | null;
  internalSku?: string | null;
}): boolean {
  if (isLegacyTawkProductId(input.id)) return true;
  if (isLegacyTawkProductSlug(input.slug)) return true;
  if (isLegacyTawkSku(input.internalSku)) return true;
  if (input.name && containsTawkBrandMarker(input.name)) return true;
  return false;
}

/**
 * Broader commercial offering scan (name, slug, SKU, copy, SEO, category, add-on).
 * Generic "live chat" / "website chat" without the Tawk brand is not matched via brand marker alone.
 */
export function isLegacyTawkCatalogOffering(input: {
  id?: string | null;
  slug?: string | null;
  name?: string | null;
  internalSku?: string | null;
  shortDescription?: string | null;
  fullDescription?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  categorySlug?: string | null;
  categoryName?: string | null;
  features?: Array<string | null | undefined> | null;
}): boolean {
  if (isLegacyTawkProduct(input)) return true;
  if (isLegacyTawkCategorySlug(input.categorySlug)) return true;
  if (containsTawkBrandMarker(input.categoryName)) return true;
  if (containsTawkBrandMarker(input.shortDescription)) return true;
  if (containsTawkBrandMarker(input.fullDescription)) return true;
  if (containsTawkBrandMarker(input.seoTitle)) return true;
  if (containsTawkBrandMarker(input.seoDescription)) return true;
  if (input.features?.some((f) => containsTawkBrandMarker(f))) return true;
  return false;
}

export function isLegacyTawkAddon(input: {
  slug?: string | null;
  name?: string | null;
  description?: string | null;
}): boolean {
  if (isLegacyTawkProductSlug(input.slug)) return true;
  if (containsTawkBrandMarker(input.name)) return true;
  if (containsTawkBrandMarker(input.description)) return true;
  return false;
}

/** Server-side deny for publish / import / cart / legal / restore. */
export function denyLegacyTawkCatalogMutation(input: {
  id?: string | null;
  slug?: string | null;
  name?: string | null;
  internalSku?: string | null;
}): string | null {
  if (isLegacyTawkProduct(input)) {
    return LEGACY_TAWK_PUBLIC_DENIED_MESSAGE;
  }
  return null;
}
