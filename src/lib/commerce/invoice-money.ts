/**
 * Invoice money — reuse quote minor-unit / tax basis-point math.
 * Source of truth is server-side; never trust client totals.
 */
export {
  taxCentsFromNet,
  lineTotals,
  quoteHeaderTotals as invoiceHeaderTotals,
  type QuoteLineInput as InvoiceLineInput,
  type QuoteLineTotals as InvoiceLineTotals,
} from "@/lib/commerce/quote-money";

export function outstandingCents(
  totalCents: number,
  amountPaidCents: number,
): number {
  return Math.max(Math.trunc(totalCents) - Math.max(0, Math.trunc(amountPaidCents)), 0);
}

export function derivePaymentStatus(input: {
  totalCents: number;
  amountPaidCents: number;
  dueDate?: string | null;
  now?: Date;
}): "PAID" | "PARTIALLY_PAID" | "OVERDUE" | "OPEN" {
  const paid = Math.max(0, Math.trunc(input.amountPaidCents));
  const total = Math.trunc(input.totalCents);
  const due = outstandingCents(total, paid);
  if (due <= 0) return "PAID";
  if (paid > 0) return "PARTIALLY_PAID";
  const day = input.dueDate?.slice(0, 10);
  const today = (input.now ?? new Date()).toISOString().slice(0, 10);
  if (day && day < today) return "OVERDUE";
  return "OPEN";
}

/**
 * Status after payment registration/reversal.
 * Fail-closed for CANCELED / CREDITED / ARCHIVED / non-operational statuses.
 * Amounts must already be server-side recomputed (active payments only).
 */
export function recomputeInvoiceStatusFromPayments(input: {
  currentStatus: string;
  totalCents: number;
  amountPaidCents: number;
  dueDate?: string | null;
  now?: Date;
}):
  | { ok: true; status: "PAID" | "PARTIALLY_PAID" | "OVERDUE" | "OPEN"; amountDueCents: number }
  | {
      ok: false;
      code:
        | "STATUS_LOCKED"
        | "STATUS_INVALID"
        | "CREDIT_NOTE_LOCKED";
    } {
  const status = input.currentStatus;
  if (status === "CANCELED" || status === "CREDITED" || status === "ARCHIVED") {
    return { ok: false, code: "STATUS_LOCKED" };
  }
  if (status === "DRAFT" || status === "IN_REVIEW" || status === "READY") {
    return { ok: false, code: "STATUS_INVALID" };
  }

  const amountDueCents = outstandingCents(input.totalCents, input.amountPaidCents);
  const next = derivePaymentStatus({
    totalCents: input.totalCents,
    amountPaidCents: input.amountPaidCents,
    dueDate: input.dueDate,
    now: input.now,
  });
  return { ok: true, status: next, amountDueCents };
}

export function assertInvoiceAllowsPaymentReversal(input: {
  status: string;
  invoiceType?: string | null;
}): { ok: true } | { ok: false; code: "STATUS_LOCKED" | "CREDIT_NOTE_LOCKED" | "STATUS_INVALID" } {
  if (input.invoiceType === "CREDIT_NOTE") {
    return { ok: false, code: "CREDIT_NOTE_LOCKED" };
  }
  if (
    input.status === "CANCELED" ||
    input.status === "CREDITED" ||
    input.status === "ARCHIVED"
  ) {
    return { ok: false, code: "STATUS_LOCKED" };
  }
  if (
    input.status === "DRAFT" ||
    input.status === "IN_REVIEW" ||
    input.status === "READY"
  ) {
    return { ok: false, code: "STATUS_INVALID" };
  }
  return { ok: true };
}
