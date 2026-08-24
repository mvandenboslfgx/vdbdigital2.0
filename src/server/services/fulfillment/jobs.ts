import "server-only";
import { createServiceRoleClient } from "@/lib/database/server";
import type { FulfillmentJobStatus, FulfillmentType } from "@/server/services/fulfillment/engine";

export type PersistedFulfillmentJob = {
  id: string;
  orderId: string;
  paymentId: string | null;
  productSlug: string | null;
  fulfillmentType: FulfillmentType;
  status: FulfillmentJobStatus;
  provider: string;
  attemptCount: number;
  lastError: string | null;
  metadata: Record<string, unknown>;
};

export async function persistFulfillmentJob(input: {
  orderId: string;
  paymentId?: string;
  productSlug?: string | null;
  fulfillmentType: FulfillmentType;
  status: FulfillmentJobStatus;
  provider?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}): Promise<PersistedFulfillmentJob | null> {
  const supabase = createServiceRoleClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("fulfillment_jobs")
    .upsert(
      {
        idempotency_key: `${input.orderId}:${input.paymentId ?? "none"}:${input.productSlug ?? "none"}`,
        order_id: input.orderId,
        payment_id: input.paymentId ?? null,
        product_slug: input.productSlug ?? null,
        fulfillment_type: input.fulfillmentType,
        status: input.status,
        provider: input.provider ?? "internal",
        last_error: input.error ?? null,
        metadata: input.metadata ?? {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: "idempotency_key" },
    )
    .select(
      "id, order_id, payment_id, product_slug, fulfillment_type, status, provider, attempt_count, last_error, metadata",
    )
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id as string,
    orderId: data.order_id as string,
    paymentId: (data.payment_id as string | null) ?? null,
    productSlug: (data.product_slug as string | null) ?? null,
    fulfillmentType: data.fulfillment_type as FulfillmentType,
    status: data.status as FulfillmentJobStatus,
    provider: data.provider as string,
    attemptCount: (data.attempt_count as number) ?? 0,
    lastError: (data.last_error as string | null) ?? null,
    metadata: (data.metadata as Record<string, unknown>) ?? {},
  };
}

export async function getFulfillmentJob(id: string): Promise<PersistedFulfillmentJob | null> {
  const supabase = createServiceRoleClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("fulfillment_jobs")
    .select(
      "id, order_id, payment_id, product_slug, fulfillment_type, status, provider, attempt_count, last_error, metadata",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id as string,
    orderId: data.order_id as string,
    paymentId: (data.payment_id as string | null) ?? null,
    productSlug: (data.product_slug as string | null) ?? null,
    fulfillmentType: data.fulfillment_type as FulfillmentType,
    status: data.status as FulfillmentJobStatus,
    provider: data.provider as string,
    attemptCount: (data.attempt_count as number) ?? 0,
    lastError: (data.last_error as string | null) ?? null,
    metadata: (data.metadata as Record<string, unknown>) ?? {},
  };
}

export async function listFulfillmentJobs(limit = 100): Promise<PersistedFulfillmentJob[]> {
  const supabase = createServiceRoleClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("fulfillment_jobs")
    .select(
      "id, order_id, payment_id, product_slug, fulfillment_type, status, provider, attempt_count, last_error, metadata",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id as string,
    orderId: row.order_id as string,
    paymentId: (row.payment_id as string | null) ?? null,
    productSlug: (row.product_slug as string | null) ?? null,
    fulfillmentType: row.fulfillment_type as FulfillmentType,
    status: row.status as FulfillmentJobStatus,
    provider: row.provider as string,
    attemptCount: (row.attempt_count as number) ?? 0,
    lastError: (row.last_error as string | null) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  }));
}

export async function updateFulfillmentJobStatus(input: {
  id: string;
  status: FulfillmentJobStatus;
  error?: string | null;
}): Promise<void> {
  const supabase = createServiceRoleClient();
  if (!supabase) return;

  await supabase
    .from("fulfillment_jobs")
    .update({
      status: input.status,
      last_error: input.error ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id);
}
