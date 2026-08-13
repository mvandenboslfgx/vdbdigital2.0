import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/server/auth/require-session";
import { AuthError } from "@/server/auth/errors";
import { createPortalInvoiceCheckout } from "@/server/services/invoice-checkout-service";
import { verifyOrigin } from "@/lib/security/origin";

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

/**
 * Staging-only portal invoice Mollie test checkout.
 * Does not enable public CHECKOUT_ENABLED. Amount is server-authoritative.
 */
export async function POST(request: Request) {
  try {
    if (!(await verifyOrigin())) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const user = await requireAuthenticatedUser();
    const body = (await request.json().catch(() => null)) as {
      invoiceId?: string;
      idempotencyKey?: string;
      expectedAmountCents?: number;
    } | null;

    const invoiceId = body?.invoiceId?.trim();
    if (!invoiceId) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const result = await createPortalInvoiceCheckout({
      userId: user.id,
      invoiceId,
      idempotencyKey: body?.idempotencyKey ?? null,
      expectedAmountCents:
        typeof body?.expectedAmountCents === "number"
          ? body.expectedAmountCents
          : null,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.code }, { status: result.httpStatus });
    }

    return NextResponse.json({
      checkoutUrl: result.checkoutUrl,
      status: result.status,
      paymentRef: result.paymentRefMasked,
      amountCents: result.amountCents,
      currency: result.currency,
      reused: result.reused,
      payment: {
        id: result.paymentRefMasked,
        invoiceId,
        status: result.status === "paid" ? "open" : result.status,
        amountCents: result.amountCents,
        currency: result.currency,
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 401 });
    }
    return NextResponse.json({ error: "PROVIDER_UNAVAILABLE" }, { status: 503 });
  }
}
