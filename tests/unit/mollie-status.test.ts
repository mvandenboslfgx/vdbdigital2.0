import { describe, it, expect } from "vitest";
import {
  mapMolliePaymentStatus,
  canApplyOrderTransition,
  toLegacyPaymentStatus,
  externalWebhookEventId,
} from "@/lib/payments/mollie-status";

describe("Mollie status map", () => {
  it("maps paid/failed/canceled/expired/authorized/refunded/charged_back", () => {
    expect(mapMolliePaymentStatus("paid").orderStatus).toBe("PAID");
    expect(mapMolliePaymentStatus("paid").releaseDelivery).toBe(true);

    expect(mapMolliePaymentStatus("failed").orderStatus).toBe("FAILED");
    expect(mapMolliePaymentStatus("canceled").orderStatus).toBe("CANCELLED");
    expect(mapMolliePaymentStatus("expired").paymentStatus).toBe("EXPIRED");
    expect(mapMolliePaymentStatus("expired").orderStatus).toBe("CANCELLED");

    expect(mapMolliePaymentStatus("authorized").paymentStatus).toBe("AUTHORIZED");
    expect(mapMolliePaymentStatus("authorized").releaseDelivery).toBe(false);

    expect(mapMolliePaymentStatus("refunded").orderStatus).toBe("REFUNDED");
    expect(mapMolliePaymentStatus("refunded").revokeDelivery).toBe(true);
    expect(mapMolliePaymentStatus("refunded").allowedAfterPaid).toBe(true);

    expect(mapMolliePaymentStatus("charged_back").paymentStatus).toBe("CHARGED_BACK");
    expect(mapMolliePaymentStatus("charged_back").orderStatus).toBe("REFUNDED");
  });

  it("does not invent paid for unknown statuses", () => {
    const unknown = mapMolliePaymentStatus("something_new");
    expect(unknown.orderStatus).toBeNull();
    expect(unknown.isPaidEvent).toBe(false);
  });

  it("allows refund/chargeback after PAID but blocks duplicate paid", () => {
    const paid = mapMolliePaymentStatus("paid");
    const refunded = mapMolliePaymentStatus("refunded");
    const charged = mapMolliePaymentStatus("charged_back");
    const failed = mapMolliePaymentStatus("failed");

    expect(canApplyOrderTransition("PAID", paid)).toBe(false);
    expect(canApplyOrderTransition("PAID", refunded)).toBe(true);
    expect(canApplyOrderTransition("PAID", charged)).toBe(true);
    expect(canApplyOrderTransition("PAID", failed)).toBe(false);
  });

  it("maps extended enums to legacy payment values when needed", () => {
    expect(toLegacyPaymentStatus("AUTHORIZED")).toBe("PENDING");
    expect(toLegacyPaymentStatus("REFUNDED")).toBe("CANCELLED");
    expect(toLegacyPaymentStatus("CHARGED_BACK")).toBe("CANCELLED");
    expect(toLegacyPaymentStatus("PAID")).toBe("PAID");
  });

  it("builds stable external event ids", () => {
    expect(externalWebhookEventId("tr_1", "Paid")).toBe("tr_1:payment.paid");
  });
});
