/**
 * Invoice status transitions — fail-closed server contract.
 * Issue is READY-only; DRAFT/IN_REVIEW never go straight to ISSUED/OPEN.
 */

export const INVOICE_ISSUEABLE_STATUSES = ["READY"] as const;

export const INVOICE_CUSTOMER_VISIBLE_STATUSES = [
  "ISSUED",
  "OPEN",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "CANCELED",
  "CREDITED",
] as const;

export type InvoiceIssueDecision =
  | { ok: true }
  | { ok: false; code: "NOT_READY" | "ALREADY_ISSUED" | "INVALID_STATUS" };

export function assertInvoiceCanBeIssued(status: string): InvoiceIssueDecision {
  if (status === "READY") return { ok: true };
  if (
    status === "ISSUED" ||
    status === "OPEN" ||
    status === "PARTIALLY_PAID" ||
    status === "PAID" ||
    status === "OVERDUE"
  ) {
    return { ok: false, code: "ALREADY_ISSUED" };
  }
  if (status === "DRAFT" || status === "IN_REVIEW") {
    return { ok: false, code: "NOT_READY" };
  }
  return { ok: false, code: "INVALID_STATUS" };
}

export function isInvoiceIssueableStatus(status: string): boolean {
  return assertInvoiceCanBeIssued(status).ok;
}

export function assertInvoiceExpectedVersion(
  storedVersion: number,
  expectedVersion: number,
): boolean {
  return (
    Number.isInteger(storedVersion) &&
    Number.isInteger(expectedVersion) &&
    storedVersion === expectedVersion
  );
}

/** Allowed staff status transitions (not including payment-driven updates). */
const ALLOWED: Record<string, readonly string[]> = {
  DRAFT: ["IN_REVIEW", "READY", "ARCHIVED"],
  IN_REVIEW: ["DRAFT", "READY", "ARCHIVED"],
  READY: ["ISSUED", "OPEN", "DRAFT", "ARCHIVED"],
  ISSUED: ["OPEN", "CANCELED", "ARCHIVED"],
  OPEN: ["PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELED", "CREDITED", "ARCHIVED"],
  PARTIALLY_PAID: ["PAID", "OVERDUE", "CREDITED", "ARCHIVED"],
  OVERDUE: ["PARTIALLY_PAID", "PAID", "CANCELED", "CREDITED", "ARCHIVED"],
  PAID: ["CREDITED", "ARCHIVED"],
  CANCELED: ["ARCHIVED"],
  CREDITED: ["ARCHIVED"],
  ARCHIVED: [],
};

export function canTransitionInvoiceStatus(
  from: string,
  to: string,
): boolean {
  if (from === to) return true;
  return (ALLOWED[from] ?? []).includes(to);
}

export function isInvoiceOperationallyOverdue(input: {
  status: string;
  dueDate?: string | null;
  amountDueCents: number;
  now?: Date;
}): boolean {
  if (input.amountDueCents <= 0) return false;
  if (
    ["PAID", "CANCELED", "CREDITED", "ARCHIVED", "DRAFT", "IN_REVIEW", "READY"].includes(
      input.status,
    )
  ) {
    return false;
  }
  const day = input.dueDate?.slice(0, 10);
  if (!day) return false;
  const today = (input.now ?? new Date()).toISOString().slice(0, 10);
  return day < today;
}

export function customerFacingInvoiceStatus(input: {
  status: string;
  dueDate?: string | null;
  amountDueCents: number;
  now?: Date;
}): string {
  if (isInvoiceOperationallyOverdue(input) && input.status !== "OVERDUE") {
    return "OVERDUE";
  }
  return input.status;
}
