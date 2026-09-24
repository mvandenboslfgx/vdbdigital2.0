import "server-only";

import type { BillingType, OrderLine, PaymentStatus } from "@/types";
import { createServiceRoleClient, isSupabaseDatabaseReady } from "@/lib/database/server";
import { getMollieClient } from "@/lib/payments/mollie";
import { buildMollieWebhookUrl } from "@/lib/payments/webhook-url";
import { mapMolliePaymentStatus } from "@/lib/payments/mollie-status";
import { writeAuditLog } from "@/lib/security/audit-log";

export type RecurringInterval = "1 month" | "1 year";

export function recurringIntervalForBillingType(
  billingType: BillingType,
): RecurringInterval | null {
  if (billingType === "MONTHLY") return "1 month";
  if (billingType === "YEARLY") return "1 year";
  return null;
}

export function isRecurringOrderLine(line: OrderLine): boolean {
  return recurringIntervalForBillingType(line.billingType) !== null;
}

function addMonthsClamped(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const firstOfTarget = new Date(Date.UTC(year, month + months, 1));
  const lastDay = new Date(
    Date.UTC(
      firstOfTarget.getUTCFullYear(),
      firstOfTarget.getUTCMonth() + 1,
      0,
    ),
  ).getUTCDate();
  return new Date(
    Date.UTC(
      firstOfTarget.getUTCFullYear(),
      firstOfTarget.getUTCMonth(),
      Math.min(day, lastDay),
    ),
  );
}

function nextStartDate(interval: RecurringInterval): string {
  const now = new Date();
  const next =
    interval === "1 year"
      ? new Date(Date.UTC(now.getUTCFullYear() + 1, now.getUTCMonth(), now.getUTCDate()))
      : addMonthsClamped(now, 1);
  return next.toISOString().slice(0, 10);
}

type PendingSubscriptionInput = {
  orderId: string;
  orderNumber: string;
  line: OrderLine;
  customerEmail: string;
  mollieCustomerId: string;
  firstPaymentId: string;
  amountCents: number;
};

export async function createPendingBillingSubscription(
  input: PendingSubscriptionInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const interval = recurringIntervalForBillingType(input.line.billingType);
  if (!interval) {
    return { ok: false, error: "Unsupported recurring interval" };
  }
  if (!isSupabaseDatabaseReady()) {
    return { ok: false, error: "Database not configured" };
  }
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { ok: false, error: "Database not configured" };
  }

  const { error } = await supabase.from("billing_subscriptions").upsert(
    {
      order_id: input.orderId,
      product_id: input.line.productId,
      product_name: input.line.productName,
      customer_email: input.customerEmail,
      mollie_customer_id: input.mollieCustomerId,
      first_payment_id: input.firstPaymentId,
      status: "PENDING",
      interval,
      amount_cents: input.amountCents,
      currency: "EUR",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "order_id" },
  );

  if (error) {
    await writeAuditLog({
      action: "billing.subscription_seed_failed",
      resourceType: "order",
      resourceId: input.orderId,
      metadata: { orderNumber: input.orderNumber },
    });
    return { ok: false, error: "Subscription could not be prepared" };
  }

  await supabase
    .from("orders")
    .update({
      mollie_customer_id: input.mollieCustomerId,
      subscription_status: "PENDING",
      billing_interval: interval,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.orderId);

  await writeAuditLog({
    action: "billing.subscription_seeded",
    resourceType: "order",
    resourceId: input.orderId,
    metadata: { orderNumber: input.orderNumber, interval },
  });

  return { ok: true };
}

export async function activateMollieSubscriptionForPaidFirstPayment(input: {
  orderId: string;
  orderNumber: string;
  paymentCustomerId?: string | null;
}): Promise<{ ok: true; subscriptionId: string } | { ok: false; error: string }> {
  if (!isSupabaseDatabaseReady()) {
    return { ok: false, error: "Database not configured" };
  }
  const supabase = createServiceRoleClient();
  const mollie = getMollieClient();
  if (!supabase || !mollie) {
    return { ok: false, error: "Billing provider not configured" };
  }

  const { data: row, error: rowError } = await supabase
    .from("billing_subscriptions")
    .select("*")
    .eq("order_id", input.orderId)
    .maybeSingle();

  if (rowError || !row) {
    return { ok: false, error: "Subscription record missing" };
  }

  if (row.mollie_subscription_id) {
    return { ok: true, subscriptionId: String(row.mollie_subscription_id) };
  }

  const customerId =
    input.paymentCustomerId?.trim() || String(row.mollie_customer_id || "");
  if (!customerId) {
    return { ok: false, error: "Mollie customer missing" };
  }

  const webhook = buildMollieWebhookUrl();
  if (!webhook.ok) {
    return { ok: false, error: webhook.error };
  }

  const startDate = nextStartDate(row.interval as RecurringInterval);

  try {
    const subscription = await mollie.customerSubscriptions.create({
      customerId,
      amount: {
        currency: "EUR",
        value: (Number(row.amount_cents) / 100).toFixed(2),
      },
      interval: String(row.interval),
      startDate,
      description: `${row.product_name} · ${input.orderNumber}`,
      webhookUrl: webhook.url,
      metadata: {
        orderId: input.orderId,
        billingSubscriptionId: row.id,
        productId: row.product_id,
        recurring: true,
      },
    });

    const { error: updateError } = await supabase
      .from("billing_subscriptions")
      .update({
        mollie_customer_id: customerId,
        mollie_subscription_id: subscription.id,
        status: "ACTIVE",
        starts_on: startDate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    if (updateError) {
      return { ok: false, error: "Subscription created but local state update failed" };
    }

    await supabase
      .from("orders")
      .update({
        mollie_customer_id: customerId,
        mollie_subscription_id: subscription.id,
        subscription_status: "ACTIVE",
        billing_interval: row.interval,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.orderId);

    await writeAuditLog({
      action: "billing.subscription_activated",
      resourceType: "order",
      resourceId: input.orderId,
      metadata: {
        subscriptionIdPrefix: String(subscription.id).slice(0, 10),
        interval: row.interval,
      },
    });

    return { ok: true, subscriptionId: subscription.id };
  } catch {
    await writeAuditLog({
      action: "billing.subscription_activation_failed",
      resourceType: "order",
      resourceId: input.orderId,
    });
    return { ok: false, error: "Mollie subscription creation failed" };
  }
}

export async function recordRecurringSubscriptionPayment(input: {
  orderId: string;
  paymentId: string;
  subscriptionId?: string | null;
  providerStatus: string;
  amountCents: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseDatabaseReady()) {
    return { ok: false, error: "Database not configured" };
  }
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { ok: false, error: "Database not configured" };
  }

  const { data: row } = await supabase
    .from("billing_subscriptions")
    .select("*")
    .eq("order_id", input.orderId)
    .maybeSingle();

  if (!row) {
    return { ok: false, error: "Subscription record missing" };
  }

  if (
    row.mollie_subscription_id &&
    input.subscriptionId &&
    row.mollie_subscription_id !== input.subscriptionId
  ) {
    return { ok: false, error: "Subscription mismatch" };
  }

  const transition = mapMolliePaymentStatus(input.providerStatus);
  const paymentStatus = transition.paymentStatus as PaymentStatus;

  const { error: paymentError } = await supabase.from("payments").upsert({
    id: input.paymentId,
    order_id: input.orderId,
    status: paymentStatus,
    amount_cents: input.amountCents,
    provider_status: transition.providerStatus,
    updated_at: new Date().toISOString(),
  });

  if (paymentError) {
    return { ok: false, error: "Recurring payment could not be stored" };
  }

  const localStatus =
    paymentStatus === "PAID"
      ? "ACTIVE"
      : paymentStatus === "FAILED" ||
          paymentStatus === "CANCELLED" ||
          paymentStatus === "EXPIRED" ||
          paymentStatus === "CHARGED_BACK"
        ? "PAST_DUE"
        : row.status;

  const update: Record<string, unknown> = {
    status: localStatus,
    updated_at: new Date().toISOString(),
  };
  if (paymentStatus === "PAID") {
    update.last_payment_at = new Date().toISOString();
  }
  if (input.subscriptionId && !row.mollie_subscription_id) {
    update.mollie_subscription_id = input.subscriptionId;
  }

  await supabase
    .from("billing_subscriptions")
    .update(update)
    .eq("id", row.id);

  await supabase
    .from("orders")
    .update({
      subscription_status: localStatus,
      ...(input.subscriptionId
        ? { mollie_subscription_id: input.subscriptionId }
        : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.orderId);

  await writeAuditLog({
    action: "billing.subscription_payment_recorded",
    resourceType: "order",
    resourceId: input.orderId,
    metadata: {
      paymentIdPrefix: input.paymentId.slice(0, 10),
      providerStatus: transition.providerStatus,
      localStatus,
    },
  });

  return { ok: true };
}
