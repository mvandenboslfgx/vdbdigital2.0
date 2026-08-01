import "server-only";
import { randomUUID } from "crypto";
import type { ValidatedCheckout } from "@/features/checkout/checkout-service";
import {
  createServiceRoleClient,
  isSupabaseDatabaseReady,
} from "@/lib/database/server";
import { sendOrderConfirmation } from "@/lib/email/resend";
import { getLocale } from "@/i18n/get-dictionary";
import { allowDevFallback, isProductionRuntime } from "@/lib/runtime/environment";
import { writeAuditLog } from "@/lib/security/audit-log";
import {
  canApplyOrderTransition,
  externalWebhookEventId,
  mapMolliePaymentStatus,
  toLegacyPaymentStatus,
} from "@/lib/payments/mollie-status";
import type { PaymentStatus } from "@/types";

const inMemoryOrders = new Map<string, Record<string, unknown>>();
const inMemoryWebhookEvents = new Set<string>();

function generateOrderNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `VDB-${date}-${rand}`;
}

export class OrderPersistenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderPersistenceError";
  }
}

type SupabaseLike = NonNullable<ReturnType<typeof createServiceRoleClient>>;

async function createOrderViaRpc(
  supabase: SupabaseLike,
  orderRecord: Record<string, unknown>,
  lines: ValidatedCheckout["lines"],
): Promise<boolean> {
  const { error } = await supabase.rpc("create_order_with_items", {
    p_order: orderRecord,
    p_items: lines.map((line) => ({
      order_id: orderRecord.id,
      product_id: line.productId,
      product_name: line.productName,
      product_slug: line.productSlug,
      quantity: line.quantity,
      unit_price_cents: line.unitPriceCents,
      total_cents: line.totalCents,
      billing_type: line.billingType,
    })),
  });
  return !error;
}

async function createOrderSequential(
  supabase: SupabaseLike,
  orderRecord: Record<string, unknown>,
  lines: ValidatedCheckout["lines"],
): Promise<void> {
  const tryInsert = async (record: Record<string, unknown>) =>
    supabase.from("orders").insert(record);

  let { error: orderError } = await tryInsert(orderRecord);
  if (orderError) {
    if (orderError.code === "23505" && orderRecord.idempotency_key) {
      throw new OrderPersistenceError("Duplicate checkout submission");
    }
    // Migration may not be applied yet — retry without P0 columns
    const core = { ...orderRecord };
    delete core.customer_type;
    delete core.idempotency_key;
    delete core.payment_init_status;
    ({ error: orderError } = await tryInsert(core));
  }
  if (orderError) {
    throw new OrderPersistenceError("Order kon niet worden opgeslagen");
  }

  const { error: itemsError } = await supabase.from("order_items").insert(
    lines.map((line) => ({
      order_id: orderRecord.id,
      product_id: line.productId,
      product_name: line.productName,
      product_slug: line.productSlug,
      quantity: line.quantity,
      unit_price_cents: line.unitPriceCents,
      total_cents: line.totalCents,
      billing_type: line.billingType,
    })),
  );

  if (itemsError) {
    await supabase.from("orders").delete().eq("id", orderRecord.id as string);
    throw new OrderPersistenceError("Orderregels konden niet worden opgeslagen");
  }
}

export async function createOrder(data: ValidatedCheckout) {
  const orderId = randomUUID();
  const orderNumber = generateOrderNumber();
  const idempotencyKey = data.customer.idempotencyKey?.trim() || null;

  const orderRecord = {
    id: orderId,
    order_number: orderNumber,
    status: "PENDING",
    customer_email: data.customer.email,
    customer_first_name: data.customer.firstName,
    customer_last_name: data.customer.lastName,
    customer_company: data.customer.company ?? null,
    customer_phone: data.customer.phone ?? null,
    customer_type: data.customer.customerType,
    subtotal_cents: data.totals.subtotalCents,
    vat_cents: data.totals.vatCents,
    total_cents: data.totals.totalCents,
    vat_rate: data.totals.vatRate,
    notes: data.customer.notes ?? null,
    confirmation_sent: false,
    delivery_released: false,
    idempotency_key: idempotencyKey,
    payment_init_status: "PENDING",
  };

  if (isSupabaseDatabaseReady()) {
    const supabase = createServiceRoleClient();
    if (!supabase) {
      throw new OrderPersistenceError("Database niet beschikbaar");
    }

    const rpcOk = await createOrderViaRpc(supabase, orderRecord, data.lines);
    if (!rpcOk) {
      await createOrderSequential(supabase, orderRecord, data.lines);
    }

    await writeAuditLog({
      action: "order.created",
      resourceType: "order",
      resourceId: orderId,
      metadata: {
        orderNumber,
        totalCents: data.totals.totalCents,
        customerType: data.customer.customerType,
      },
    });
  } else if (allowDevFallback()) {
    inMemoryOrders.set(orderId, { ...orderRecord, lines: data.lines, _dev: true });
  } else {
    throw new OrderPersistenceError(
      isProductionRuntime()
        ? "Orders vereisen Supabase in productie"
        : "Database niet geconfigureerd",
    );
  }

  // Orders have no persisted locale column yet (see docs/adr/RESEND_LOCALE_HANDOFF.md
  // "Known gap"). Best-effort: use the buyer's active session locale at submit time.
  const sessionLocale = await getLocale();
  const emailResult = await sendOrderConfirmation(data.customer.email, orderNumber, sessionLocale);
  if (!emailResult.sent && isProductionRuntime()) {
    await writeAuditLog({
      action: "order.email_failed",
      resourceType: "order",
      resourceId: orderId,
      metadata: { sent: false },
    });
  }

  return { id: orderId, orderNumber };
}

export async function markPaymentCreationFailed(orderId: string): Promise<void> {
  if (isSupabaseDatabaseReady()) {
    const supabase = createServiceRoleClient();
    if (!supabase) return;
    await supabase
      .from("orders")
      .update({
        payment_init_status: "FAILED",
        status: "FAILED",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);
    await writeAuditLog({
      action: "order.payment_creation_failed",
      resourceType: "order",
      resourceId: orderId,
    });
    return;
  }

  const order = inMemoryOrders.get(orderId);
  if (order) {
    order.status = "FAILED";
    order.payment_init_status = "FAILED";
  }
}

export async function markPaymentInitialized(
  orderId: string,
  paymentId: string,
): Promise<void> {
  if (isSupabaseDatabaseReady()) {
    const supabase = createServiceRoleClient();
    if (!supabase) return;
    await supabase
      .from("orders")
      .update({
        payment_init_status: "CREATED",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);
    await supabase.from("payments").upsert({
      id: paymentId,
      order_id: orderId,
      status: "OPEN",
      amount_cents: 0,
      provider_status: "open",
    });
    return;
  }

  const order = inMemoryOrders.get(orderId);
  if (order) {
    order.payment_init_status = "CREATED";
    order.payment_id = paymentId;
  }
}

export function usesInMemoryOrders(): boolean {
  return allowDevFallback() && !isSupabaseDatabaseReady();
}

async function applyPaymentUpdateViaRpc(
  supabase: SupabaseLike,
  args: {
    orderId: string;
    paymentId: string;
    externalEventId: string;
    eventType: string;
    orderStatus: string | null;
    paymentStatus: string;
    providerStatus: string;
    releaseDelivery: boolean;
    revokeDelivery: boolean;
    amountCents: number;
  },
): Promise<{ ok: boolean; alreadyProcessed?: boolean; mappedStatus?: string } | null> {
  const { data, error } = await supabase.rpc("apply_mollie_payment_update", {
    p_order_id: args.orderId,
    p_payment_id: args.paymentId,
    p_external_event_id: args.externalEventId,
    p_event_type: args.eventType,
    p_order_status: args.orderStatus,
    p_payment_status: args.paymentStatus,
    p_provider_status: args.providerStatus,
    p_release_delivery: args.releaseDelivery,
    p_revoke_delivery: args.revokeDelivery,
    p_amount_cents: args.amountCents,
  });

  if (error) return null;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return { ok: true };

  return {
    ok: true,
    alreadyProcessed: Boolean((row as { already_processed?: boolean }).already_processed),
    mappedStatus: (row as { order_status?: string }).order_status,
  };
}

async function upsertPaymentRow(
  supabase: SupabaseLike,
  payload: {
    id: string;
    order_id: string;
    status: PaymentStatus;
    amount_cents: number;
    provider_status: string;
  },
): Promise<{ error: { message: string } | null }> {
  const withProvider = {
    ...payload,
    updated_at: new Date().toISOString(),
  };
  let result = await supabase.from("payments").upsert(withProvider);
  if (!result.error) return { error: null };

  // Retry without provider_status / with legacy payment enum
  const legacy = {
    id: payload.id,
    order_id: payload.order_id,
    status: toLegacyPaymentStatus(payload.status),
    amount_cents: payload.amount_cents,
    updated_at: new Date().toISOString(),
  };
  result = await supabase.from("payments").upsert(legacy);
  return { error: result.error ? { message: result.error.message } : null };
}

async function claimWebhookEvent(
  supabase: SupabaseLike,
  paymentId: string,
  externalEventId: string,
  eventType: string,
): Promise<"claimed" | "already_processed" | "failed"> {
  const eventId = randomUUID();

  let insertError = (
    await supabase.from("webhook_events").insert({
      id: eventId,
      provider: "mollie",
      payment_id: paymentId,
      external_event_id: externalEventId,
      event_type: eventType,
      processed: false,
      processing_status: "PROCESSING",
    })
  ).error;

  // Fallback when processing_status column is missing
  if (insertError && !insertError.code?.startsWith("23505")) {
    insertError = (
      await supabase.from("webhook_events").insert({
        id: eventId,
        provider: "mollie",
        payment_id: paymentId,
        external_event_id: externalEventId,
        event_type: eventType,
        processed: false,
      })
    ).error;
  }

  if (!insertError) return "claimed";

  if (insertError.code !== "23505") return "failed";

  const { data: existing } = await supabase
    .from("webhook_events")
    .select("id, processed, processing_status")
    .eq("provider", "mollie")
    .eq("external_event_id", externalEventId)
    .maybeSingle();

  if (!existing) return "failed";

  if (
    existing.processed === true ||
    existing.processing_status === "PROCESSED"
  ) {
    return "already_processed";
  }

  const { error: reclaimError } = await supabase
    .from("webhook_events")
    .update({
      processing_status: "PROCESSING",
      processed: false,
      last_error: null,
    })
    .eq("id", existing.id);

  if (reclaimError) {
    // Column may be missing — treat as reclaimable via processed=false
    await supabase
      .from("webhook_events")
      .update({ processed: false })
      .eq("id", existing.id);
  }
  return "claimed";
}

async function finalizeWebhookEvent(
  supabase: SupabaseLike,
  externalEventId: string,
  ok: boolean,
  errorMessage?: string,
): Promise<void> {
  await supabase
    .from("webhook_events")
    .update({
      processed: ok,
      processing_status: ok ? "PROCESSED" : "FAILED",
      last_error: ok ? null : (errorMessage ?? "unknown"),
      processed_at: ok ? new Date().toISOString() : null,
    })
    .eq("provider", "mollie")
    .eq("external_event_id", externalEventId);
}

export async function updateOrderPaymentStatus(
  orderId: string,
  paymentId: string,
  status: string,
) {
  const transition = mapMolliePaymentStatus(status);
  const externalEventId = externalWebhookEventId(paymentId, status);
  const eventType = `payment.${transition.providerStatus}`;

  if (isSupabaseDatabaseReady()) {
    const supabase = createServiceRoleClient();
    if (!supabase) return null;

    const { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (!order) return null;

    if (!canApplyOrderTransition(String(order.status), transition)) {
      return { alreadyProcessed: true, order, mappedStatus: order.status as string };
    }

    const rpcResult = await applyPaymentUpdateViaRpc(supabase, {
      orderId,
      paymentId,
      externalEventId,
      eventType,
      orderStatus: transition.orderStatus,
      paymentStatus: transition.paymentStatus,
      providerStatus: transition.providerStatus,
      releaseDelivery: transition.releaseDelivery,
      revokeDelivery: transition.revokeDelivery,
      amountCents: Number(order.total_cents),
    });

    if (rpcResult?.ok) {
      await writeAuditLog({
        action: rpcResult.alreadyProcessed
          ? "order.payment_status_duplicate"
          : "order.payment_status_updated",
        resourceType: "order",
        resourceId: orderId,
        metadata: {
          paymentId,
          status: rpcResult.mappedStatus ?? transition.orderStatus,
          providerStatus: transition.providerStatus,
        },
      });
      return {
        alreadyProcessed: Boolean(rpcResult.alreadyProcessed),
        order,
        mappedStatus: (rpcResult.mappedStatus ??
          transition.orderStatus ??
          order.status) as string,
      };
    }

    const claim = await claimWebhookEvent(
      supabase,
      paymentId,
      externalEventId,
      eventType,
    );

    if (claim === "already_processed") {
      return { alreadyProcessed: true, order, mappedStatus: order.status as string };
    }
    if (claim === "failed") {
      return null;
    }

    try {
      if (transition.orderStatus) {
        const orderUpdate: Record<string, unknown> = {
          status: transition.orderStatus,
          updated_at: new Date().toISOString(),
        };
        if (transition.releaseDelivery) {
          orderUpdate.delivery_released = true;
        }
        if (transition.revokeDelivery) {
          orderUpdate.delivery_released = false;
        }

        const { error: orderError } = await supabase
          .from("orders")
          .update(orderUpdate)
          .eq("id", orderId);

        if (orderError) {
          await finalizeWebhookEvent(supabase, externalEventId, false, orderError.message);
          throw new OrderPersistenceError("Order status update failed");
        }
      }

      const { error: paymentError } = await upsertPaymentRow(supabase, {
        id: paymentId,
        order_id: orderId,
        status: transition.paymentStatus,
        amount_cents: Number(order.total_cents),
        provider_status: transition.providerStatus,
      });

      if (paymentError) {
        await finalizeWebhookEvent(supabase, externalEventId, false, paymentError.message);
        throw new OrderPersistenceError("Payment status update failed");
      }

      await finalizeWebhookEvent(supabase, externalEventId, true);

      await writeAuditLog({
        action: "order.payment_status_updated",
        resourceType: "order",
        resourceId: orderId,
        metadata: {
          paymentId,
          status: transition.orderStatus ?? order.status,
          providerStatus: transition.providerStatus,
        },
      });

      return {
        alreadyProcessed: false,
        order: {
          ...order,
          status: transition.orderStatus ?? order.status,
          delivery_released: transition.releaseDelivery
            ? true
            : transition.revokeDelivery
              ? false
              : order.delivery_released,
        },
        mappedStatus: (transition.orderStatus ?? order.status) as string,
      };
    } catch {
      await finalizeWebhookEvent(supabase, externalEventId, false, "exception");
      return null;
    }
  }

  if (!allowDevFallback()) {
    return null;
  }

  if (inMemoryWebhookEvents.has(externalEventId)) {
    return { alreadyProcessed: true };
  }
  inMemoryWebhookEvents.add(externalEventId);

  const order = inMemoryOrders.get(orderId);
  if (!order) return null;

  if (!canApplyOrderTransition(String(order.status), transition)) {
    return { alreadyProcessed: true, order, mappedStatus: order.status as string };
  }

  if (transition.orderStatus) {
    order.status = transition.orderStatus;
  }
  if (transition.releaseDelivery) order.delivery_released = true;
  if (transition.revokeDelivery) order.delivery_released = false;

  return {
    alreadyProcessed: false,
    order,
    mappedStatus: (transition.orderStatus ?? order.status) as string,
  };
}

export async function markOrderConfirmationSent(orderId: string): Promise<void> {
  if (!isSupabaseDatabaseReady()) return;
  const supabase = createServiceRoleClient();
  if (!supabase) return;
  await supabase
    .from("orders")
    .update({ confirmation_sent: true })
    .eq("id", orderId);
}

export async function getOrderById(orderId: string) {
  if (isSupabaseDatabaseReady()) {
    const supabase = createServiceRoleClient();
    if (!supabase) return null;
    const { data } = await supabase.from("orders").select("*").eq("id", orderId).single();
    return data;
  }
  if (!allowDevFallback()) return null;
  return inMemoryOrders.get(orderId) ?? null;
}
