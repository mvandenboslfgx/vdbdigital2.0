import "server-only";
import { createHash } from "crypto";

export type CheckoutLogEvent =
  | "order.creation_started"
  | "order.creation_failed"
  | "mollie.payment_creation_failed"
  | "webhook.claimed"
  | "webhook.processing_failed"
  | "webhook.reclaimed"
  | "payment.status_transition"
  | "payment.refund"
  | "payment.chargeback"
  | "limiter.unavailable"
  | "checkout.blocked"
  | "legal_gate.blocked"
  | "release_gate.failure";

const REDACT_KEYS = [
  "authorization",
  "api_key",
  "apikey",
  "secret",
  "token",
  "password",
  "email",
  "phone",
  "customer_email",
];

function sanitizeMeta(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    const lower = key.toLowerCase();
    if (REDACT_KEYS.some((r) => lower.includes(r))) {
      out[key] = "[redacted]";
      continue;
    }
    if (typeof value === "string" && value.length > 200) {
      out[key] = `${value.slice(0, 40)}…`;
      continue;
    }
    out[key] = value;
  }
  return out;
}

export function newCheckoutCorrelationId(): string {
  return createHash("sha256")
    .update(`${Date.now()}:${Math.random()}`)
    .digest("hex")
    .slice(0, 16);
}

/** Structured checkout observability — never log secrets or raw PII */
export function logCheckoutEvent(
  event: CheckoutLogEvent,
  details: {
    correlationId?: string;
    orderIdPrefix?: string;
    paymentIdPrefix?: string;
    meta?: Record<string, unknown>;
  } = {},
): void {
  const line = {
    scope: "checkout",
    event,
    correlationId: details.correlationId,
    orderIdPrefix: details.orderIdPrefix,
    paymentIdPrefix: details.paymentIdPrefix,
    meta: sanitizeMeta(details.meta),
    ts: new Date().toISOString(),
  };
  console.info(JSON.stringify(line));
}
