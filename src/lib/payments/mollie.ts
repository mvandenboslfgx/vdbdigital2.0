import "server-only";
import createMollieClient from "@mollie/api-client";
import type { OrderLine, OrderTotals, CustomerInput } from "@/types";
import { resolveAppUrl } from "@/lib/url/app-url";
import { buildMollieWebhookUrl } from "@/lib/payments/webhook-url";
import { assertMollieKeySafeForRuntime } from "@/lib/payments/mollie-mode";
import { logCheckoutEvent } from "@/lib/observability/checkout-log";

export function isMollieConfigured(): boolean {
  return Boolean(process.env.MOLLIE_API_KEY);
}

export function getMollieClient() {
  const apiKey = process.env.MOLLIE_API_KEY;
  if (!apiKey) return null;
  const safety = assertMollieKeySafeForRuntime(apiKey);
  if (!safety.ok) {
    logCheckoutEvent("mollie.payment_creation_failed", {
      meta: { reason: safety.reason },
    });
    return null;
  }
  return createMollieClient({ apiKey });
}

export interface CreatePaymentInput {
  orderId: string;
  orderNumber: string;
  totals: OrderTotals;
  customer: CustomerInput;
  lines: OrderLine[];
}

export async function createMolliePayment(input: CreatePaymentInput) {
  const mollie = getMollieClient();
  if (!mollie) {
    return { configured: false as const };
  }

  if (input.totals.totalCents <= 0) {
    return {
      configured: false as const,
      configurationError: "Invalid order total",
    };
  }

  const webhook = buildMollieWebhookUrl();
  if (!webhook.ok) {
    return {
      configured: false as const,
      configurationError: webhook.error,
    };
  }

  const appUrl = resolveAppUrl();

  try {
    const payment = await mollie.payments.create({
      amount: {
        currency: "EUR",
        value: (input.totals.totalCents / 100).toFixed(2),
      },
      description: `Order ${input.orderNumber}`,
      redirectUrl: `${appUrl}/checkout/success?order=${input.orderId}`,
      cancelUrl: `${appUrl}/checkout/cancelled?order=${input.orderId}`,
      webhookUrl: webhook.url,
      metadata: {
        orderId: input.orderId,
        orderNumber: input.orderNumber,
      },
    });

    return {
      configured: true as const,
      paymentId: payment.id,
      checkoutUrl: payment.getCheckoutUrl(),
    };
  } catch {
    logCheckoutEvent("mollie.payment_creation_failed", {
      orderIdPrefix: input.orderId.slice(0, 8),
      meta: { orderNumber: input.orderNumber },
    });
    return {
      configured: false as const,
      configurationError: "Payment provider error",
    };
  }
}

export async function getMolliePaymentStatus(paymentId: string) {
  const mollie = getMollieClient();
  if (!mollie) return null;
  const payment = await mollie.payments.get(paymentId);
  return payment.status;
}
