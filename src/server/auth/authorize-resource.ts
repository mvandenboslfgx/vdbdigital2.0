import "server-only";
import { createServiceRoleClient } from "@/lib/database/server";
import type { AdminContext } from "@/server/auth/types";
import { AuthError } from "@/server/auth/errors";
import { requirePermission } from "@/server/auth/require-permission";
import { writeAuditLog } from "@/lib/security/audit-log";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertValidUuid(id: string): void {
  if (!UUID_RE.test(id)) {
    throw new AuthError("NOT_FOUND");
  }
}

export async function authorizeOrderAccess(
  ctx: AdminContext,
  orderId: string,
  action: "read" | "update_status" | "refund",
): Promise<Record<string, unknown>> {
  assertValidUuid(orderId);

  const permission =
    action === "read"
      ? "orders.read"
      : action === "refund"
        ? "payments.refund"
        : "orders.update_status";

  await requirePermission(ctx, permission);

  const supabase = createServiceRoleClient();
  if (!supabase) throw new AuthError("FORBIDDEN");

  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, status, total_cents")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) {
    throw new AuthError("NOT_FOUND");
  }

  return order;
}

export async function authorizeProductMutation(
  ctx: AdminContext,
  productId: string,
  action: "read" | "update" | "publish" | "change_price",
): Promise<Record<string, unknown>> {
  assertValidUuid(productId);

  const permissionMap = {
    read: "products.read",
    update: "products.update",
    publish: "products.publish",
    change_price: "products.change_price",
  } as const;

  await requirePermission(ctx, permissionMap[action]);

  const supabase = createServiceRoleClient();
  if (!supabase) throw new AuthError("FORBIDDEN");

  const { data: product } = await supabase
    .from("products")
    .select("id, slug, status, is_concept, price_cents")
    .eq("id", productId)
    .maybeSingle();

  if (!product) {
    throw new AuthError("NOT_FOUND");
  }

  return product;
}

export async function authorizeLeadAccess(
  ctx: AdminContext,
  leadId: string,
  action: "read" | "update",
): Promise<Record<string, unknown>> {
  assertValidUuid(leadId);
  await requirePermission(ctx, action === "read" ? "leads.read" : "leads.update");

  const supabase = createServiceRoleClient();
  if (!supabase) throw new AuthError("FORBIDDEN");

  const { data: lead } = await supabase
    .from("leads")
    .select("id, type, status, email")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead) {
    throw new AuthError("NOT_FOUND");
  }

  return lead;
}

/** Strip onbekende velden — mass-assignment preventie */
export function pickAllowedFields<T extends Record<string, unknown>>(
  input: Record<string, unknown>,
  allowed: readonly (keyof T)[],
): Partial<T> {
  const result: Partial<T> = {};
  for (const key of allowed) {
    if (key in input) {
      result[key] = input[key as string] as T[keyof T];
    }
  }
  return result;
}

export const FORBIDDEN_CLIENT_FIELDS = [
  "role",
  "owner_id",
  "user_id",
  "payment_status",
  "paid_at",
  "provider_payment_id",
  "order_total",
  "price_cents",
  "confirmation_sent",
  "delivery_released",
  "status",
  "is_concept",
] as const;

export function rejectForbiddenFields(input: Record<string, unknown>): void {
  for (const field of FORBIDDEN_CLIENT_FIELDS) {
    if (field in input) {
      throw new AuthError("FORBIDDEN");
    }
  }
}

export async function logUnauthorizedAccess(
  userId: string | undefined,
  action: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await writeAuditLog({
    userId,
    action,
    metadata: metadata ?? {},
  });
}
