import "server-only";
import createMollieClient from "@mollie/api-client";
import type { OrderLine, OrderTotals, CustomerInput } from "@/types";
import { resolveAppUrl } from "@/lib/url/app-url";
import { buildMollieWebhookUrl } from "@/lib/payments/webhook-url";
import { assertMollieKeySafeForRuntime } from "@/lib/payments/mollie-mode";
import { logCheckoutEvent } from "@/lib/observability/checkout-log";

export function isMollieConfigured(): boolean {
  const apiKey = process.env.MOLLIE_API_KEY;
  return Boolean(apiKey && assertMollieKeySafeForRuntime(apiKey).ok);
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

function isRecurringLine(line: OrderLine): boolean {
  return line.billingType === "MONTHLY" || line.billingType === "YEARLY";
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
  const recurringLines = input.lines.filter(isRecurringLine);

  try {
    if (recurringLines.length > 0) {
      if (
        input.lines.length !== 1 ||
        recurringLines.length !== 1 ||
        recurringLines[0].quantity !== 1
      ) {
        return {
          configured: false as const,
          configurationError:
            "Recurring products must be purchased one at a time",
        };
      }

      const line = recurringLines[0];
      const customer = await mollie.customers.create({
        name: `${input.customer.firstName} ${input.customer.lastName}`.trim(),
        email: input.customer.email,
        metadata: {
          orderId: input.orderId,
          orderNumber: input.orderNumber,
        },
      });

      const payment = await mollie.customerPayments.create({
        customerId: customer.id,
        amount: {
          currency: "EUR",
          value: (input.totals.totalCents / 100).toFixed(2),
        },
        description: `${line.productName} · ${input.orderNumber}`,
        sequenceType: "first",
        redirectUrl: `${appUrl}/checkout/complete?order=${input.orderId}`,
        cancelUrl: `${appUrl}/checkout/cancelled?order=${input.orderId}`,
        webhookUrl: webhook.url,
        metadata: {
          orderId: input.orderId,
          orderNumber: input.orderNumber,
          recurring: true,
          productId: line.productId,
          productSlug: line.productSlug,
          billingType: line.billingType,
        },
      });

      return {
        configured: true as const,
        paymentId: payment.id,
        checkoutUrl: payment.getCheckoutUrl(),
        recurring: true as const,
        mollieCustomerId: customer.id,
      };
    }

    const payment = await mollie.payments.create({
      amount: {
        currency: "EUR",
        value: (input.totals.totalCents / 100).toFixed(2),
      },
      description: `Order ${input.orderNumber}`,
      redirectUrl: `${appUrl}/checkout/complete?order=${input.orderId}`,
      cancelUrl: `${appUrl}/checkout/cancelled?order=${input.orderId}`,
      webhookUrl: webhook.url,
      metadata: {
        orderId: input.orderId,
        orderNumber: input.orderNumber,
        recurring: false,
      },
    });

    return {
      configured: true as const,
      paymentId: payment.id,
      checkoutUrl: payment.getCheckoutUrl(),
      recurring: false as const,
      mollieCustomerId: null,
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
