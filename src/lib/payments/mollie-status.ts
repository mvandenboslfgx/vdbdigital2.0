import type { OrderStatus, PaymentStatus } from "@/types";

/** Map internal payment status for DBs that lack extended enum values */
export function toLegacyPaymentStatus(status: PaymentStatus): PaymentStatus {
  switch (status) {
    case "AUTHORIZED":
      return "PENDING";
    case "REFUNDED":
    case "CHARGED_BACK":
      return "CANCELLED";
    default:
      return status;
  }
}

/** Mollie Payments API statuses we handle explicitly */
export type MollieProviderStatus =
  | "open"
  | "canceled"
  | "pending"
  | "authorized"
  | "expired"
  | "failed"
  | "paid"
  | "refunded"
  | "charged_back";

export interface MollieStatusTransition {
  providerStatus: string;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus | null;
  releaseDelivery: boolean;
  revokeDelivery: boolean;
  isPaidEvent: boolean;
  allowedAfterPaid: boolean;
}

const KNOWN: Record<string, MollieStatusTransition> = {
  open: {
    providerStatus: "open",
    paymentStatus: "OPEN",
    orderStatus: "PENDING",
    releaseDelivery: false,
    revokeDelivery: false,
    isPaidEvent: false,
    allowedAfterPaid: false,
  },
  pending: {
    providerStatus: "pending",
    paymentStatus: "PENDING",
    orderStatus: "PENDING",
    releaseDelivery: false,
    revokeDelivery: false,
    isPaidEvent: false,
    allowedAfterPaid: false,
  },
  authorized: {
    providerStatus: "authorized",
    paymentStatus: "AUTHORIZED",
    orderStatus: "PENDING",
    releaseDelivery: false,
    revokeDelivery: false,
    isPaidEvent: false,
    allowedAfterPaid: false,
  },
  paid: {
    providerStatus: "paid",
    paymentStatus: "PAID",
    orderStatus: "PAID",
    releaseDelivery: true,
    revokeDelivery: false,
    isPaidEvent: true,
    allowedAfterPaid: false,
  },
  failed: {
    providerStatus: "failed",
    paymentStatus: "FAILED",
    orderStatus: "FAILED",
    releaseDelivery: false,
    revokeDelivery: false,
    isPaidEvent: false,
    allowedAfterPaid: false,
  },
  canceled: {
    providerStatus: "canceled",
    paymentStatus: "CANCELLED",
    orderStatus: "CANCELLED",
    releaseDelivery: false,
    revokeDelivery: false,
    isPaidEvent: false,
    allowedAfterPaid: false,
  },
  expired: {
    providerStatus: "expired",
    paymentStatus: "EXPIRED",
    orderStatus: "CANCELLED",
    releaseDelivery: false,
    revokeDelivery: false,
    isPaidEvent: false,
    allowedAfterPaid: false,
  },
  refunded: {
    providerStatus: "refunded",
    paymentStatus: "REFUNDED",
    orderStatus: "REFUNDED",
    releaseDelivery: false,
    revokeDelivery: true,
    isPaidEvent: false,
    allowedAfterPaid: true,
  },
  charged_back: {
    providerStatus: "charged_back",
    paymentStatus: "CHARGED_BACK",
    orderStatus: "REFUNDED",
    releaseDelivery: false,
    revokeDelivery: true,
    isPaidEvent: false,
    allowedAfterPaid: true,
  },
};

export function mapMolliePaymentStatus(status: string): MollieStatusTransition {
  const key = status.trim().toLowerCase();
  const mapped = KNOWN[key];
  if (mapped) return mapped;

  return {
    providerStatus: key || "unknown",
    paymentStatus: "PENDING",
    orderStatus: null,
    releaseDelivery: false,
    revokeDelivery: false,
    isPaidEvent: false,
    allowedAfterPaid: false,
  };
}

export function canApplyOrderTransition(
  currentOrderStatus: string,
  transition: MollieStatusTransition,
): boolean {
  if (currentOrderStatus === "PAID") {
    if (transition.isPaidEvent) return false;
    return transition.allowedAfterPaid;
  }
  if (currentOrderStatus === "REFUNDED") {
    return (
      transition.paymentStatus === "REFUNDED" ||
      transition.paymentStatus === "CHARGED_BACK"
    );
  }
  return transition.orderStatus !== null || transition.paymentStatus !== "PENDING";
}

export function externalWebhookEventId(paymentId: string, status: string): string {
  return `${paymentId}:payment.${status.trim().toLowerCase()}`;
}
