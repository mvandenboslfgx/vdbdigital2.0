import "server-only";
import type { Category, Product } from "@/types";
import { categories, getSeedProductBySlug, seedProducts } from "@/config/products.seed";
import {
  createServiceRoleClient,
  isSupabaseDatabaseReady,
} from "@/lib/database/server";
import { allowDevFallback } from "@/lib/runtime/environment";

function mapDbProduct(row: Record<string, unknown>): Product {
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    shortDescription: row.short_description as string,
    fullDescription: row.full_description as string,
    categorySlug: (row.category as { slug: string })?.slug ?? "",
    categoryName: (row.category as { name: string })?.name ?? "",
    priceCents: row.price_cents as number | null,
    fromPriceCents: row.from_price_cents as number | null,
    billingType: row.billing_type as Product["billingType"],
    deliveryTime: row.delivery_time as string,
    includedItems: (row.included_items as string[]) ?? [],
    excludedItems: (row.excluded_items as string[]) ?? [],
    extensions: (row.extensions as string[]) ?? [],
    faqs: [],
    status: row.status as Product["status"],
    featured: row.featured as boolean,
    sortOrder: row.sort_order as number,
    seoTitle: (row.seo_title as string) ?? "",
    seoDescription: (row.seo_description as string) ?? "",
    targetAudience: row.target_audience as string | undefined,
    workflow: row.workflow as string | undefined,
    requiredInput: (row.required_input as string[]) ?? undefined,
  };
}

function getDevSeedProducts(): Product[] {
  if (!allowDevFallback()) {
    return [];
  }
  return seedProducts.filter((p) => p.status === "PUBLISHED");
}

function getDevSeedProduct(slug: string): Product | null {
  if (!allowDevFallback()) {
    return null;
  }
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

  return data.map(mapDbProduct);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
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

  return mapDbProduct(data);
}

export async function getFeaturedProductsList(): Promise<Product[]> {
  const products = await getAllProducts();
  return products.filter((p) => p.featured);
}

export async function getAllCategories(): Promise<Category[]> {
  if (!isSupabaseDatabaseReady()) {
    return allowDevFallback() ? categories : [];
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return allowDevFallback() ? categories : [];
  }

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order");

  if (error || !data) {
    return allowDevFallback() ? categories : [];
  }

  return data.map((row) => ({
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    description: row.description as string,
    sortOrder: row.sort_order as number,
  }));
}

export async function getProductsByCategory(categorySlug: string): Promise<Product[]> {
  const products = await getAllProducts();
  return products.filter((p) => p.categorySlug === categorySlug);
}

/** Server-side product lookup for checkout — strikter dan publieke catalogus */
export async function getProductForCheckout(slug: string): Promise<Product | null> {
  const { canAddToDirectCheckout } = await import(
    "@/lib/commerce/checkout-eligibility"
  );
  const product = await getProductBySlug(slug);
  if (!product) return null;
  if (!canAddToDirectCheckout(product)) return null;
  return product;
}
