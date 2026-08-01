/**
 * Pure guards + decision helpers for portal-invoice Mollie test checkout.
 * No secrets; no network. Used by API route and unit tests.
 */

export const PAYABLE_INVOICE_STATUSES = new Set([
  "OPEN",
  "ISSUED",
  "PARTIALLY_PAID",
  "OVERDUE",
]);

export type InvoiceCheckoutInput = {
  invoiceId: string;
  idempotencyKey?: string | null;
  expectedAmountCents?: number | null;
  appEnv?: string | null;
  supabaseUrl?: string | null;
  mollieApiKey?: string | null;
  testCheckoutEnabled?: string | null;
  checkoutEnabled?: string | null;
  payoutEnabled?: string | null;
};

export type InvoiceRow = {
  id: string;
  organization_id: string;
  status: string;
  currency: string;
  total_cents: number;
  amount_paid_cents: number;
  amount_due_cents: number;
  invoice_number: string;
  external_payment_reference: string | null;
};

export type InvoiceCheckoutDecision =
  | {
      ok: true;
      dueCents: number;
      currency: "EUR";
      reuseProviderId: string | null;
    }
  | { ok: false; code: string; httpStatus: number };

const STAGING_REF = "qzekuvmgfekzsowdecyk";
const PROD_REF = "nhsrdnjfsxfikfbdmdfj";

export function detectKeyShape(
  key: string | null | undefined,
): "missing" | "test" | "live" | "invalid" {
  if (!key || !String(key).trim()) return "missing";
  const v = String(key).trim();
  if (v.startsWith("test_")) return "test";
  if (v.startsWith("live_")) return "live";
  return "invalid";
}

export function extractSupabaseRef(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.toLowerCase();
    const m = host.match(/^([a-z0-9]+)\.supabase\.co$/);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

export function assertStagingTestCheckoutEnv(input: InvoiceCheckoutInput): InvoiceCheckoutDecision {
  const appEnv = (input.appEnv ?? "").trim().toLowerCase();
  if (appEnv !== "staging") {
    return { ok: false, code: "FEATURE_NOT_CONFIGURED", httpStatus: 503 };
  }

  const testOn = (input.testCheckoutEnabled ?? "").trim().toLowerCase();
  if (testOn !== "true" && testOn !== "1") {
    return { ok: false, code: "FEATURE_NOT_CONFIGURED", httpStatus: 503 };
  }

  const checkoutOn = (input.checkoutEnabled ?? "").trim().toLowerCase();
  if (checkoutOn === "true" || checkoutOn === "1" || checkoutOn === "yes") {
    // Public checkout unlock remains forbidden for this harness surface.
    return { ok: false, code: "FEATURE_NOT_CONFIGURED", httpStatus: 503 };
  }

  const payoutOn = (input.payoutEnabled ?? "").trim().toLowerCase();
  if (payoutOn === "true" || payoutOn === "1") {
    return { ok: false, code: "FEATURE_NOT_CONFIGURED", httpStatus: 503 };
  }

  const ref = extractSupabaseRef(input.supabaseUrl);
  if (ref === PROD_REF) {
    return { ok: false, code: "FORBIDDEN", httpStatus: 403 };
  }
  if (ref && ref !== STAGING_REF) {
    return { ok: false, code: "FORBIDDEN", httpStatus: 403 };
  }

  const shape = detectKeyShape(input.mollieApiKey);
  if (shape === "live") {
    return { ok: false, code: "TEST_MODE_REQUIRED", httpStatus: 403 };
  }
  if (shape !== "test") {
    return { ok: false, code: "FEATURE_NOT_CONFIGURED", httpStatus: 503 };
  }

  return {
    ok: true,
    dueCents: 0,
    currency: "EUR",
    reuseProviderId: null,
  };
}

export function decideInvoiceCheckout(
  invoice: InvoiceRow | null,
  membershipOrgIds: string[],
  input: InvoiceCheckoutInput,
): InvoiceCheckoutDecision {
  const envGate = assertStagingTestCheckoutEnv(input);
  if (!envGate.ok) return envGate;

  if (!input.invoiceId?.trim()) {
    return { ok: false, code: "NOT_FOUND", httpStatus: 404 };
  }
  if (!invoice) {
    return { ok: false, code: "NOT_FOUND", httpStatus: 404 };
  }
  if (!membershipOrgIds.includes(invoice.organization_id)) {
    return { ok: false, code: "FORBIDDEN", httpStatus: 403 };
  }
  if (!PAYABLE_INVOICE_STATUSES.has(invoice.status)) {
    if (invoice.status === "PAID") {
      return { ok: false, code: "ALREADY_PAID", httpStatus: 409 };
    }
    return { ok: false, code: "FORBIDDEN", httpStatus: 403 };
  }

  const due =
    typeof invoice.amount_due_cents === "number"
      ? invoice.amount_due_cents
      : invoice.total_cents - invoice.amount_paid_cents;

  if (!Number.isInteger(due) || due <= 0) {
    return { ok: false, code: "ALREADY_PAID", httpStatus: 409 };
  }
  if (due > 5_000_000) {
    return { ok: false, code: "FORBIDDEN", httpStatus: 403 };
  }
  if ((invoice.currency || "").toUpperCase() !== "EUR") {
    return { ok: false, code: "CURRENCY_MISMATCH", httpStatus: 400 };
  }
  if (
    typeof input.expectedAmountCents === "number" &&
    input.expectedAmountCents !== due
  ) {
    return { ok: false, code: "AMOUNT_MISMATCH", httpStatus: 400 };
  }

  return {
    ok: true,
    dueCents: due,
    currency: "EUR",
    reuseProviderId: invoice.external_payment_reference,
  };
}

export function maskPaymentRef(id: string | null | undefined): string {
  if (!id) return "absent";
  if (id.length <= 8) return `${id.slice(0, 2)}…`;
  return `${id.slice(0, 8)}…`;
}
