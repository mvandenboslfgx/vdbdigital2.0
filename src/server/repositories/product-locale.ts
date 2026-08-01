import "server-only";
import type { Locale } from "@/i18n/config";
import type { Product, ProductTranslation } from "@/types";
import { createServiceRoleClient } from "@/lib/database/server";
import { isMissingSchemaError, mapDbTranslationRow } from "@/server/repositories/map-product";
import { mergeProductForLocale } from "@/lib/commerce/product-locale-merge";

export {
  hasMinimalEnglishContent,
  isPublishableTranslationStatus,
  mergeProductForLocale,
  type MergeProductForLocaleOptions,
  type ProductLocaleMergeResult,
} from "@/lib/commerce/product-locale-merge";

/**
 * Batch-fetch product_translations rows for a set of products + one locale.
 * Returns ALL matching rows regardless of status — callers must still gate
 * with mergeProductForLocale()/isPublishableTranslationStatus() before
 * showing anything to a visitor. Safe (returns empty map) before the Phase 4
 * migration is applied or when the DB is not configured.
 */
export async function getProductTranslationsForLocale(
  productIds: string[],
  locale: Locale,
): Promise<Map<string, ProductTranslation>> {
  const result = new Map<string, ProductTranslation>();
  if (productIds.length === 0) return result;

  const supabase = createServiceRoleClient();
  if (!supabase) return result;

  const { data, error } = await supabase
    .from("product_translations")
    .select("*")
    .eq("locale", locale)
    .in("product_id", productIds);

  if (error || !data) {
    if (error && !isMissingSchemaError(error)) {
      console.error("getProductTranslationsForLocale failed", error.message);
    }
    return result;
  }

  for (const row of data as Record<string, unknown>[]) {
    const productId = row.product_id as string;
    result.set(productId, mapDbTranslationRow(row));
  }

  return result;
}

/** Single-product convenience wrapper around getProductTranslationsForLocale. */
export async function getProductTranslationForLocale(
  productId: string,
  locale: Locale,
): Promise<ProductTranslation | null> {
  const map = await getProductTranslationsForLocale([productId], locale);
  return map.get(productId) ?? null;
}

/**
 * Batch merge helper: applies mergeProductForLocale() across a product list
 * using a pre-fetched translations map, dropping any "controlled unavailable"
 * (null) results.
 */
export async function mergeProductsForLocale(
  products: Product[],
  locale: Locale,
): Promise<Product[]> {
  if (locale === "en") return products;

  const translations = await getProductTranslationsForLocale(
    products.map((p) => p.id),
    locale,
  );

  const merged: Product[] = [];
  for (const product of products) {
    const result = mergeProductForLocale(product, locale, translations.get(product.id) ?? null);
    if (result) merged.push(result.product);
  }
  return merged;
}
