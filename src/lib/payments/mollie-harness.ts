/**
 * Documented Mollie testmode harness helpers (no live API calls).
 * Manual Mollie Dashboard steps: docs/P0_5_RELEASE_GATE.md
 */
import {
  mapMolliePaymentStatus,
  canApplyOrderTransition,
  externalWebhookEventId,
} from "@/lib/payments/mollie-status";
import { assertMollieKeySafeForRuntime } from "@/lib/payments/mollie-mode";

export const MOLLIE_HARNESS_STATUSES = [
  "open",
  "pending",
  "authorized",
  "paid",
  "failed",
  "canceled",
  "expired",
  "refunded",
  "charged_back",
] as const;

export function simulateWebhookTransition(
  currentOrderStatus: string,
  mollieStatus: string,
): {
  apply: boolean;
  mappedOrderStatus: string | null;
  externalEventId: string;
} {
  const transition = mapMolliePaymentStatus(mollieStatus);
  return {
    apply: canApplyOrderTransition(currentOrderStatus, transition),
    mappedOrderStatus: transition.orderStatus,
    externalEventId: externalWebhookEventId("tr_harness", mollieStatus),
  };
}

export function assertHarnessUsesTestKey(apiKey: string | undefined): void {
  const check = assertMollieKeySafeForRuntime(apiKey, {
    ...process.env,
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    VERCEL_ENV: "development",
  });
  if (apiKey?.startsWith("live_")) {
    throw new Error("Harness refused live Mollie key");
  }
  if (!check.ok && apiKey) {
    // live on localhost already rejected above; unknown also rejected
    if (check.mode === "unknown" || check.mode === "live") {
      throw new Error(check.reason);
    }
  }
}

export function amountMatchesOrder(
  mollieAmountValue: string,
  currency: string,
  orderTotalCents: number,
): boolean {
  if (currency !== "EUR") return false;
  const cents = Math.round(parseFloat(mollieAmountValue) * 100);
  return cents === orderTotalCents;
}
