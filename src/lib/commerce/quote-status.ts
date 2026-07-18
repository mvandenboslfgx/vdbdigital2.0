/**
 * Quote status transitions — fail-closed server contract.
 * Send is READY-only; DRAFT/IN_REVIEW must never go straight to SENT.
 */

export const QUOTE_SENDABLE_STATUSES = ["READY"] as const;

export const QUOTE_CUSTOMER_VISIBLE_STATUSES = [
  "SENT",
  "VIEWED",
  "ACCEPTED",
  "DECLINED",
  "EXPIRED",
  "WITHDRAWN",
  "SUPERSEDED",
] as const;

export type QuoteSendDecision =
  | { ok: true }
  | { ok: false; code: "NOT_READY" | "ALREADY_SENT" | "INVALID_STATUS" };

/** Server-side: only READY may be sent. */
export function assertQuoteCanBeSent(status: string): QuoteSendDecision {
  if (status === "READY") return { ok: true };
  if (status === "SENT" || status === "VIEWED") {
    return { ok: false, code: "ALREADY_SENT" };
  }
  if (status === "DRAFT" || status === "IN_REVIEW") {
    return { ok: false, code: "NOT_READY" };
  }
  return { ok: false, code: "INVALID_STATUS" };
}

export function isQuoteSendableStatus(status: string): boolean {
  return assertQuoteCanBeSent(status).ok;
}

/** Optimistic concurrency: expected version must match stored version. */
export function assertQuoteExpectedVersion(
  storedVersion: number,
  expectedVersion: number,
): boolean {
  return (
    Number.isInteger(storedVersion) &&
    Number.isInteger(expectedVersion) &&
    storedVersion === expectedVersion
  );
}

export type QuoteItemForSelection = {
  id: string;
  isOptional: boolean;
};

export type OptionalSelectionDecision =
  | { ok: true; selectedIds: string[] }
  | {
      ok: false;
      code:
        | "UNKNOWN_ITEM"
        | "NOT_OPTIONAL"
        | "REQUIRED_AS_OPTIONAL"
        | "DUPLICATE_ID";
      itemId?: string;
    };

/**
 * Re-validate optional line selection server-side (mirrors accept RPC contract).
 * Rejects unknown ids, required lines passed as "optional", and non-optional ids.
 */
export function validateSelectedOptionalQuoteItems(
  items: QuoteItemForSelection[],
  selectedOptionalIds: string[],
): OptionalSelectionDecision {
  const byId = new Map(items.map((i) => [i.id, i]));
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const id of selectedOptionalIds) {
    if (seen.has(id)) {
      return { ok: false, code: "DUPLICATE_ID", itemId: id };
    }
    seen.add(id);
    const item = byId.get(id);
    if (!item) {
      return { ok: false, code: "UNKNOWN_ITEM", itemId: id };
    }
    if (!item.isOptional) {
      return { ok: false, code: "NOT_OPTIONAL", itemId: id };
    }
    normalized.push(id);
  }

  return { ok: true, selectedIds: normalized };
}
