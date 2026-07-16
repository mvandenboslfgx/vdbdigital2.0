import "server-only";
import { createServiceRoleClient } from "@/lib/database/server";
import { requireAdmin } from "@/server/auth/require-admin";
import { requirePermission } from "@/server/auth/require-permission";
import type { Product } from "@/types";

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
  };
}

/** Admin-only productlijst — vereist AAL2 + products.read */
export async function getAdminProducts(): Promise<Product[]> {
  const ctx = await requireAdmin();
  await requirePermission(ctx, "products.read");

  const supabase = createServiceRoleClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("products")
    .select("*, category:categories(slug, name)")
    .order("sort_order");

  return (data ?? []).map(mapDbProduct);
}
