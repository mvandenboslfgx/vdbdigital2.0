import "server-only";
import { createServiceRoleClient } from "@/lib/database/server";
import { requireAdmin } from "@/server/auth/require-admin";
import { requirePermission } from "@/server/auth/require-permission";
import { isMissingSchemaError } from "@/server/repositories/map-product";
import type { Category } from "@/types";

function mapCategory(row: Record<string, unknown>, productCount = 0): Category {
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    description: (row.description as string) ?? "",
    sortOrder: (row.sort_order as number) ?? 0,
    nameNl: (row.name_nl as string | null | undefined) ?? null,
    descriptionNl: (row.description_nl as string | null | undefined) ?? null,
    imagePath: (row.image_path as string | null | undefined) ?? null,
    isActive: (row.is_active as boolean | undefined) ?? true,
    productCount,
  };
}

export async function getAdminCategories(): Promise<{
  categories: Category[];
  schemaExtended: boolean;
  error?: string;
}> {
  const ctx = await requireAdmin();
  await requirePermission(ctx, "products.read");

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { categories: [], schemaExtended: false, error: "Database is niet geconfigureerd" };
  }

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order");

  if (error) {
    return { categories: [], schemaExtended: false, error: error.message };
  }

  const categories: Category[] = [];
  let schemaExtended = true;

  for (const row of data ?? []) {
    const { count, error: countError } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("category_id", row.id)
      .neq("status", "ARCHIVED");

    if (countError && isMissingSchemaError(countError)) {
      schemaExtended = false;
    }

    categories.push(mapCategory(row as Record<string, unknown>, count ?? 0));
  }

  return { categories, schemaExtended };
}

export async function getAdminCategoryOptions(): Promise<
  Array<{ id: string; name: string; slug: string }>
> {
  const result = await getAdminCategories();
  return result.categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }));
}
