import "server-only";
import type { Category, Product } from "@/types";
import { categories, getSeedProductBySlug, seedProducts } from "@/config/products.seed";
import {
  createServiceRoleClient,
  isSupabaseDatabaseReady,
} from "@/lib/database/server";
import { allowDevFallback } from "@/lib/runtime/environment";
import { mapDbProductRow } from "@/server/repositories/map-product";
import {
  isLegacyTawkCategorySlug,
  isLegacyTawkProduct,
} from "@/lib/commerce/tawk-legacy-blocklist";

function mapDbProduct(row: Record<string, unknown>): Product {
  return mapDbProductRow(row);
}

function excludeLegacyTawkProducts(products: Product[]): Product[] {
  return products.filter((p) => !isLegacyTawkProduct(p));
}

function excludeLegacyTawkCategories(cats: Category[]): Category[] {
  return cats.filter((c) => !isLegacyTawkCategorySlug(c.slug));
}

function getDevSeedProducts(): Product[] {
  if (!allowDevFallback()) {
    return [];
  }
  return excludeLegacyTawkProducts(
    seedProducts.filter((p) => p.status === "PUBLISHED"),
  );
}

function getDevSeedProduct(slug: string): Product | null {
  if (!allowDevFallback()) {
    return null;
  }
  if (isLegacyTawkProduct({ slug })) return null;
  return getSeedProductBySlug(slug) ?? null;
}

export async function getAllProducts(): Promise<Product[]> {
  if (!isSupabaseDatabaseReady()) {
    return getDevSeedProducts();
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return getDevSeedProducts();
  }

  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories(slug, name)")
    .eq("status", "PUBLISHED")
    .eq("is_concept", false)
    .order("sort_order");

  if (error || !data) {
    if (allowDevFallback()) {
      return getDevSeedProducts();
    }
    return [];
  }

  if (data.length === 0 && allowDevFallback()) {
    return getDevSeedProducts();
  }

  return excludeLegacyTawkProducts(data.map(mapDbProduct));
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (isLegacyTawkProduct({ slug })) {
    return null;
  }

  if (!isSupabaseDatabaseReady()) {
    return getDevSeedProduct(slug);
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return getDevSeedProduct(slug);
  }

  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories(slug, name)")
    .eq("slug", slug)
    .eq("status", "PUBLISHED")
    .eq("is_concept", false)
    .single();

  if (error || !data) {
    return getDevSeedProduct(slug);
  }

  const product = mapDbProduct(data);
  if (isLegacyTawkProduct(product)) return null;
  return product;
}

export async function getFeaturedProductsList(): Promise<Product[]> {
  const products = await getAllProducts();
  return products.filter((p) => p.featured);
}

export async function getAllCategories(): Promise<Category[]> {
  if (!isSupabaseDatabaseReady()) {
    return allowDevFallback() ? excludeLegacyTawkCategories(categories) : [];
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return allowDevFallback() ? excludeLegacyTawkCategories(categories) : [];
  }

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order");

  if (error || !data) {
    return allowDevFallback() ? excludeLegacyTawkCategories(categories) : [];
  }

  return excludeLegacyTawkCategories(
    data.map((row) => ({
      id: row.id as string,
      slug: row.slug as string,
      name: row.name as string,
      description: row.description as string,
      sortOrder: row.sort_order as number,
    })),
  );
}

export async function getProductsByCategory(categorySlug: string): Promise<Product[]> {
  if (isLegacyTawkCategorySlug(categorySlug)) {
    return [];
  }
  const products = await getAllProducts();
  return products.filter((p) => p.categorySlug === categorySlug);
}

/** Server-side product lookup for checkout — strikter dan publieke catalogus */
export async function getProductForCheckout(slug: string): Promise<Product | null> {
  if (isLegacyTawkProduct({ slug })) {
    return null;
  }
  const { canAddToDirectCheckout } = await import(
    "@/lib/commerce/checkout-eligibility"
  );
  const product = await getProductBySlug(slug);
  if (!product) return null;
  if (!canAddToDirectCheckout(product)) return null;
  return product;
}
