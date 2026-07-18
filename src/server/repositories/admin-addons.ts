import "server-only";
import { createServiceRoleClient } from "@/lib/database/server";
import { requireAdmin } from "@/server/auth/require-admin";
import { requirePermission } from "@/server/auth/require-permission";
import type { BillingType, PriceMode, ProductAddon } from "@/types";

function mapAddon(row: Record<string, unknown>): ProductAddon {
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    description: (row.description as string) ?? "",
    nameNl: (row.name_nl as string | null) ?? null,
    descriptionNl: (row.description_nl as string | null) ?? null,
    priceCents: row.price_cents as number | null,
    priceMode: (row.price_mode as PriceMode) ?? "QUOTE_ONLY",
    billingType: (row.billing_type as BillingType) ?? "ONE_TIME",
    audienceB2b: Boolean(row.audience_b2b ?? true),
    audienceB2c: Boolean(row.audience_b2c ?? false),
    isActive: Boolean(row.is_active ?? true),
    sortOrder: (row.sort_order as number) ?? 0,
  };
}

export async function getAdminAddons(): Promise<{
  addons: ProductAddon[];
  error?: string;
}> {
  const ctx = await requireAdmin();
  await requirePermission(ctx, "products.read");

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { addons: [], error: "Database is niet geconfigureerd" };
  }

  const { data, error } = await supabase
    .from("product_addons")
    .select("*")
    .order("sort_order");

  if (error) {
    return { addons: [], error: error.message };
  }

  return { addons: (data ?? []).map((r) => mapAddon(r as Record<string, unknown>)) };
}
