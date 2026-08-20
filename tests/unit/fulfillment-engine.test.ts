import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/security/audit-log", () => ({
  writeAuditLog: vi.fn(async () => undefined),
}));

import { writeAuditLog } from "@/lib/security/audit-log";
import {
  __resetFulfillmentIdempotencyForTests,
  processDeliveryReleased,
} from "@/server/services/fulfillment/engine";

describe("fulfillment engine", () => {
  beforeEach(() => {
    __resetFulfillmentIdempotencyForTests();
    vi.mocked(writeAuditLog).mockClear();
  });

  it("queues manual review jobs idempotently on delivery_released", async () => {
    const first = await processDeliveryReleased({
      orderId: "ord-1",
      paymentId: "pay-1",
      productSlugs: ["launch-website"],
    });
    const second = await processDeliveryReleased({
      orderId: "ord-1",
      paymentId: "pay-1",
      productSlugs: ["launch-website"],
    });

    expect(first).toHaveLength(1);
    expect(first[0]?.fulfillmentType).toBe("WEBSITE_PROJECT");
    expect(first[0]?.status).toBe("pending_manual_review");
    expect(second).toHaveLength(0);
    expect(writeAuditLog).toHaveBeenCalledTimes(1);
  });

  it("skips when alreadyProcessed", async () => {
    const jobs = await processDeliveryReleased({
      orderId: "ord-2",
      alreadyProcessed: true,
    });
    expect(jobs).toHaveLength(0);
    expect(writeAuditLog).not.toHaveBeenCalled();
  });
});
