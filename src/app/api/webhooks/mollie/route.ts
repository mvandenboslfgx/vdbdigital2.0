import { NextResponse } from "next/server";
import { getMollieClient } from "@/lib/payments/mollie";
import { verifyMollieWebhookToken } from "@/lib/payments/webhook-url";
import {
  updateOrderPaymentStatus,
  markOrderConfirmationSent,
  getOrderById,
} from "@/server/services/order-service";
import { applyPortalInvoiceMolliePayment } from "@/server/services/invoice-mollie-webhook";
import { sendPaymentSuccess, sendPaymentFailed } from "@/lib/email/resend";
import { writeAuditLog } from "@/lib/security/audit-log";
import { sanitizeUrlForLog } from "@/lib/security/sanitize-url";

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

/**
 * Klassieke Mollie Payments API-webhook.
 * Geen X-Mollie-Signature — status altijd opgehaald via mollie.payments.get().
 */
export async function POST(request: Request) {
  const sanitizedRequestUrl = sanitizeUrlForLog(request.url);

  const url = new URL(request.url);
  const providedToken =
    url.searchParams.get("token") ?? url.searchParams.get("secret");

  const tokenCheck = verifyMollieWebhookToken(providedToken);
  if (!tokenCheck.valid) {
    await writeAuditLog({
      action: "webhook.mollie_unauthorized",
      metadata: { reason: tokenCheck.reason, path: "/api/webhooks/mollie" },
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.formData();
  const paymentId = body.get("id");

  if (!paymentId || typeof paymentId !== "string") {
    return NextResponse.json({ error: "Missing payment ID" }, { status: 400 });
  }

  const mollie = getMollieClient();
  if (!mollie) {
    return NextResponse.json({ error: "Mollie not configured" }, { status: 503 });
  }

  let payment;
  try {
    payment = await mollie.payments.get(paymentId);
  } catch {
    await writeAuditLog({
      action: "webhook.mollie_unknown_payment",
      metadata: { paymentIdPrefix: paymentId.slice(0, 8) },
    });
    return NextResponse.json({ error: "Payment not found" }, { status: 400 });
  }

  const metadata = (payment.metadata ?? {}) as {
    orderId?: string;
    invoiceId?: string;
    kind?: string;
    userIdPrefix?: string;
  };

  const mollieAmountCents = Math.round(parseFloat(payment.amount.value) * 100);

  // Portal invoice checkout branch (staging test payments).
  if (metadata.invoiceId && metadata.kind === "portal_invoice") {
    if (payment.amount.currency !== "EUR") {
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }
    const applied = await applyPortalInvoiceMolliePayment({
      invoiceId: metadata.invoiceId,
      paymentId,
      providerStatus: payment.status,
      amountCents: mollieAmountCents,
      currency: payment.amount.currency,
    });
    await writeAuditLog({
      action: applied.alreadyProcessed
        ? "webhook.mollie_invoice_duplicate"
        : "webhook.mollie_invoice_processed",
      resourceType: "portal_invoice",
      resourceId: metadata.invoiceId,
      metadata: {
        paymentIdPrefix: paymentId.slice(0, 8),
        status: payment.status,
        detail: applied.detail,
        requestPath: sanitizedRequestUrl,
      },
    });
    if (!applied.ok) {
      return NextResponse.json({ error: "Invoice apply failed" }, { status: 400 });
    }
    return NextResponse.json({ received: true });
  }

  const orderId = metadata.orderId;
  if (!orderId) {
    await writeAuditLog({
      action: "webhook.mollie_no_order",
      metadata: { paymentIdPrefix: paymentId.slice(0, 8) },
    });
    return NextResponse.json({ error: "Order not found" }, { status: 400 });
  }

  const order = await getOrderById(orderId);
  if (!order) {
    await writeAuditLog({
      action: "webhook.mollie_unknown_order",
      resourceType: "order",
      resourceId: orderId,
      metadata: { paymentIdPrefix: paymentId.slice(0, 8) },
    });
    return NextResponse.json({ error: "Order not found" }, { status: 400 });
  }

  if (payment.amount.currency !== "EUR" || mollieAmountCents !== order.total_cents) {
    await writeAuditLog({
      action: "webhook.mollie_amount_mismatch",
      resourceType: "order",
      resourceId: orderId,
      metadata: {
        paymentIdPrefix: paymentId.slice(0, 8),
        expectedCents: order.total_cents,
        currency: payment.amount.currency,
      },
    });
    return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
  }

  const status = payment.status;
  const result = await updateOrderPaymentStatus(orderId, paymentId, status);

  if (result && !result.alreadyProcessed && result.order) {
    const email = result.order.customer_email as string;
    const orderNumber = result.order.order_number as string;

    if (result.mappedStatus === "PAID" && !result.order.confirmation_sent) {
      const sent = await sendPaymentSuccess(email, orderNumber);
      if (sent.sent) {
        await markOrderConfirmationSent(orderId);
      }
    } else if (result.mappedStatus === "FAILED") {
      await sendPaymentFailed(email, orderNumber);
    }
  }

  await writeAuditLog({
    action: result?.alreadyProcessed
      ? "webhook.mollie_duplicate"
      : "webhook.mollie_processed",
    resourceType: "order",
    resourceId: orderId,
    metadata: {
      paymentIdPrefix: paymentId.slice(0, 8),
      status,
      requestPath: sanitizedRequestUrl,
    },
  });

  return NextResponse.json({ received: true });
}
