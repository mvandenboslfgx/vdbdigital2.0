import "server-only";
import { createServiceRoleClient } from "@/lib/database/server";
import type { AdminContext } from "@/server/auth/types";
import { AuthError } from "@/server/auth/errors";
import { requirePermission } from "@/server/auth/require-permission";
import { assertValidUuid } from "@/server/auth/authorize-resource";
import type { Permission } from "@/lib/auth/permissions";

export async function authorizeCatalogProduct(
  ctx: AdminContext,
  productId: string,
  permission: Permission,
): Promise<Record<string, unknown>> {
  assertValidUuid(productId);
  await requirePermission(ctx, permission);

  const supabase = createServiceRoleClient();
  if (!supabase) throw new AuthError("FORBIDDEN");

  const { data: product } = await supabase
    .from("products")
    .select(
      "id, slug, status, is_concept, price_cents, from_price_cents, billing_type, price_mode, version, legal_status, price_status, publication_ready, updated_at",
    )
    .eq("id", productId)
    .maybeSingle();

  if (!product) {
    throw new AuthError("NOT_FOUND");
  }

  return product;
}

export async function assertNoOrderReferences(productId: string): Promise<boolean> {
  const supabase = createServiceRoleClient();
  if (!supabase) return false;

  const { count: orderLines } = await supabase
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);

  if ((orderLines ?? 0) > 0) return false;

  const { count: cartItems } = await supabase
    .from("cart_items")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);

  return (cartItems ?? 0) === 0;
}
