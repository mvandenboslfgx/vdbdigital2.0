import "server-only";
import { createServiceRoleClient } from "@/lib/database/server";
import { getMollieClient } from "@/lib/payments/mollie";
import { buildMollieWebhookUrl } from "@/lib/payments/webhook-url";
import { resolveAppUrl } from "@/lib/url/app-url";
import { writeAuditLog } from "@/lib/security/audit-log";
import { checkRateLimit } from "@/lib/security/rate-limit";
import {
  decideInvoiceCheckout,
  maskPaymentRef,
  type InvoiceCheckoutInput,
  type InvoiceRow,
} from "@/lib/payments/invoice-checkout-decision";

export type CreateInvoiceCheckoutResult =
  | {
      ok: true;
      checkoutUrl: string;
      status: string;
      paymentRefMasked: string;
      amountCents: number;
      currency: "EUR";
      reused: boolean;
    }
  | { ok: false; code: string; httpStatus: number };

async function loadMembershipOrgIds(userId: string): Promise<string[] | null> {
  const supabase = createServiceRoleClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("status", "ACTIVE");
  if (error) return null;
  return (data ?? []).map((r) => r.organization_id as string);
}

async function loadInvoice(invoiceId: string): Promise<InvoiceRow | null> {
  const supabase = createServiceRoleClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("portal_invoices")
    .select(
      "id, organization_id, status, currency, total_cents, amount_paid_cents, amount_due_cents, invoice_number, external_payment_reference",
    )
    .eq("id", invoiceId)
    .maybeSingle();
  if (error || !data) return null;
  return data as InvoiceRow;
}

export async function createPortalInvoiceCheckout(params: {
  userId: string;
  invoiceId: string;
  idempotencyKey?: string | null;
  expectedAmountCents?: number | null;
}): Promise<CreateInvoiceCheckoutResult> {
  const rate = await checkRateLimit("payment", params.userId);
  if (!rate.success) {
    return { ok: false, code: "RATE_LIMITED", httpStatus: 429 };
  }

  const envInput: InvoiceCheckoutInput = {
    invoiceId: params.invoiceId,
    idempotencyKey: params.idempotencyKey,
    expectedAmountCents: params.expectedAmountCents,
    appEnv: process.env.APP_ENV,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL,
    mollieApiKey: process.env.MOLLIE_API_KEY,
    testCheckoutEnabled: process.env.MOLLIE_TEST_CHECKOUT_ENABLED,
    checkoutEnabled: process.env.CHECKOUT_ENABLED,
    payoutEnabled:
      process.env.PARTNER_PAYOUTS_ENABLED ?? process.env.partner_payouts,
  };

  const orgIds = await loadMembershipOrgIds(params.userId);
  if (!orgIds) {
    return { ok: false, code: "PROVIDER_UNAVAILABLE", httpStatus: 503 };
  }

  const invoice = await loadInvoice(params.invoiceId);
  const decision = decideInvoiceCheckout(invoice, orgIds, envInput);
  if (!decision.ok) {
    return { ok: false, code: decision.code, httpStatus: decision.httpStatus };
  }

  const mollie = getMollieClient();
  if (!mollie) {
    return { ok: false, code: "FEATURE_NOT_CONFIGURED", httpStatus: 503 };
  }

  const webhook = buildMollieWebhookUrl();
  if (!webhook.ok) {
    return { ok: false, code: "FEATURE_NOT_CONFIGURED", httpStatus: 503 };
  }

  const appUrl = resolveAppUrl();
  const supabase = createServiceRoleClient();
  if (!supabase || !invoice) {
    return { ok: false, code: "PROVIDER_UNAVAILABLE", httpStatus: 503 };
  }

  // Reuse open attempt when provider id already stored.
  if (decision.reuseProviderId) {
    try {
      const existing = await mollie.payments.get(decision.reuseProviderId);
      const checkoutUrl = existing.getCheckoutUrl?.() ?? null;
      if (
        checkoutUrl &&
        (existing.status === "open" || existing.status === "pending")
      ) {
        return {
          ok: true,
          checkoutUrl,
          status: existing.status,
          paymentRefMasked: maskPaymentRef(existing.id),
          amountCents: decision.dueCents,
          currency: "EUR",
          reused: true,
        };
      }
    } catch {
      // Fall through to create a new payment.
    }
  }

  try {
    const payment = await mollie.payments.create({
      amount: {
        currency: "EUR",
        value: (decision.dueCents / 100).toFixed(2),
      },
      description: `Invoice ${invoice.invoice_number}`.slice(0, 255),
      redirectUrl: `${appUrl}/portal/invoices/return?invoice=${invoice.id}`,
      cancelUrl: `${appUrl}/portal/invoices/return?invoice=${invoice.id}&canceled=1`,
      webhookUrl: webhook.url,
      metadata: {
        invoiceId: invoice.id,
        kind: "portal_invoice",
        userIdPrefix: params.userId.slice(0, 8),
        idempotencyKey: params.idempotencyKey ?? undefined,
      },
    });

    const checkoutUrl = payment.getCheckoutUrl();
    if (!checkoutUrl || !payment.id) {
      return { ok: false, code: "PROVIDER_UNAVAILABLE", httpStatus: 503 };
    }

    const mode = (payment as { mode?: string }).mode;
    if (mode && mode !== "test") {
      return { ok: false, code: "TEST_MODE_REQUIRED", httpStatus: 403 };
    }

    await supabase
      .from("portal_invoices")
      .update({
        external_payment_reference: payment.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoice.id);

    await writeAuditLog({
      action: "checkout.invoice_payment_created",
      resourceType: "portal_invoice",
      resourceId: invoice.id,
      userId: params.userId,
      metadata: {
        paymentIdPrefix: payment.id.slice(0, 8),
        amountCents: decision.dueCents,
        reused: false,
      },
    });

    return {
      ok: true,
      checkoutUrl,
      status: payment.status ?? "open",
      paymentRefMasked: maskPaymentRef(payment.id),
      amountCents: decision.dueCents,
      currency: "EUR",
      reused: false,
    };
  } catch {
    return { ok: false, code: "PROVIDER_UNAVAILABLE", httpStatus: 503 };
  }
}
