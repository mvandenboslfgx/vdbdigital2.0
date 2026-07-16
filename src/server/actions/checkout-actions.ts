"use server";

import { redirect } from "next/navigation";
import { checkoutFormSchema } from "@/lib/validation/forms";
import { getCart, clearCart } from "@/features/cart/cart-service";
import { validateCheckout, canCheckoutTogether } from "@/features/checkout/checkout-service";
import {
  createOrder,
  markPaymentCreationFailed,
  markPaymentInitialized,
  OrderPersistenceError,
} from "@/server/services/order-service";
import { createMolliePayment, isMollieConfigured } from "@/lib/payments/mollie";
import { checkRateLimit, rateLimitErrorMessage } from "@/lib/security/rate-limit";
import { verifyOrigin } from "@/lib/security/origin";
import { isDirectCheckoutEnabled } from "@/config/features";
import { logCheckoutEvent, newCheckoutCorrelationId } from "@/lib/observability/checkout-log";

export async function submitCheckoutAction(
  _prev: { errors?: string[] } | null,
  formData: FormData,
) {
  const correlationId = newCheckoutCorrelationId();

  if (!(await verifyOrigin())) {
    logCheckoutEvent("checkout.blocked", {
      correlationId,
      meta: { reason: "origin" },
    });
    return { errors: ["Invalid request"] };
  }

  if (!isDirectCheckoutEnabled()) {
    logCheckoutEvent("checkout.blocked", {
      correlationId,
      meta: { reason: "feature_flag_off" },
    });
    return { errors: ["Direct checkout is temporarily disabled"] };
  }

  const rateLimit = await checkRateLimit("checkout", formData.get("email") as string);
  if (!rateLimit.success) {
    return { errors: [rateLimitErrorMessage(rateLimit)] };
  }

  const raw = {
    email: formData.get("email"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    company: formData.get("company") || undefined,
    phone: formData.get("phone") || undefined,
    vatNumber: formData.get("vatNumber") || undefined,
    addressLine1: formData.get("addressLine1") || undefined,
    postalCode: formData.get("postalCode") || undefined,
    city: formData.get("city") || undefined,
    country: formData.get("country") || "NL",
    notes: formData.get("notes") || undefined,
    customerType: formData.get("customerType") || undefined,
    idempotencyKey: formData.get("idempotencyKey") || undefined,
    acceptTerms: formData.get("acceptTerms") === "true" ? true : undefined,
    website: formData.get("website") || undefined,
  };

  if (raw.website) {
    return { errors: ["Invalid request"] };
  }

  const parsed = checkoutFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.issues.map((i) => i.message) };
  }

  if (!isMollieConfigured()) {
    return { errors: ["Payments are not configured yet"] };
  }

  const cart = await getCart();
  const validation = await validateCheckout(parsed.data, cart.items);

  if (!validation.success) {
    return { errors: validation.errors };
  }

  if (!canCheckoutTogether(validation.data.lines)) {
    return {
      errors: ["Quote-only products cannot be combined with paid products in checkout"],
    };
  }

  let order;
  try {
    order = await createOrder(validation.data);
  } catch (err) {
    if (err instanceof OrderPersistenceError) {
      return { errors: [err.message] };
    }
    return { errors: ["Order could not be created"] };
  }

  const payment = await createMolliePayment({
    orderId: order.id,
    orderNumber: order.orderNumber,
    totals: validation.data.totals,
    customer: validation.data.customer,
    lines: validation.data.lines,
  });

  if (!payment.configured || !payment.checkoutUrl || !("paymentId" in payment)) {
    await markPaymentCreationFailed(order.id);
    const configError =
      "configurationError" in payment && payment.configurationError
        ? payment.configurationError
        : "Payment could not be created";
    return { errors: [configError] };
  }

  await markPaymentInitialized(order.id, payment.paymentId);
  await clearCart();
  redirect(payment.checkoutUrl);
}
