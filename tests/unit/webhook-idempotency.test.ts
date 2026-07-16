import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateOrderPaymentStatus } from "@/server/services/order-service";

vi.mock("@/lib/database/server", () => ({
  isSupabaseDatabaseReady: () => true,
  createServiceRoleClient: () => mockSupabase,
}));

vi.mock("@/lib/security/audit-log", () => ({
  writeAuditLog: vi.fn(),
}));

const insertMock = vi.fn();
const selectMock = vi.fn();
const updateMock = vi.fn();
const upsertMock = vi.fn();
const rpcMock = vi.fn();
const maybeSingleMock = vi.fn();

const mockSupabase = {
  rpc: rpcMock,
  from: (table: string) => {
    if (table === "webhook_events") {
      return {
        insert: insertMock,
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: maybeSingleMock,
            }),
          }),
        }),
        update: () => ({
          eq: () => ({
            eq: updateMock,
          }),
        }),
      };
    }
    if (table === "orders") {
      return {
        select: () => ({
          eq: () => ({
            single: selectMock,
          }),
        }),
        update: () => ({
          eq: updateMock,
        }),
      };
    }
    if (table === "payments") {
      return { upsert: upsertMock };
    }
    return {};
  },
};

describe("Mollie webhook idempotency + status transitions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rpcMock.mockResolvedValue({ data: null, error: { message: "not found" } });
    selectMock.mockResolvedValue({
      data: {
        id: "order-1",
        status: "PENDING",
        customer_email: "test@example.com",
        order_number: "VDB-001",
        total_cents: 1000,
        confirmation_sent: false,
        delivery_released: false,
      },
    });
    updateMock.mockResolvedValue({ error: null });
    upsertMock.mockResolvedValue({ error: null });
    insertMock.mockResolvedValue({ error: null });
    maybeSingleMock.mockResolvedValue({ data: null });
  });

  it("marks event processed only after successful payment upsert path", async () => {
    const result = await updateOrderPaymentStatus("order-1", "tr_abc", "paid");
    expect(result?.alreadyProcessed).toBe(false);
    expect(result?.mappedStatus).toBe("PAID");
    expect(insertMock).toHaveBeenCalled();
    expect(upsertMock).toHaveBeenCalled();
  });

  it("returns alreadyProcessed for duplicate PROCESSED webhook event", async () => {
    insertMock.mockResolvedValueOnce({ error: { code: "23505" } });
    maybeSingleMock.mockResolvedValueOnce({
      data: { id: "evt-1", processed: true, processing_status: "PROCESSED" },
    });

    const result = await updateOrderPaymentStatus("order-1", "tr_abc", "paid");
    expect(result?.alreadyProcessed).toBe(true);
  });

  it("applies refund after PAID instead of treating it as already processed", async () => {
    selectMock.mockResolvedValueOnce({
      data: {
        id: "order-1",
        status: "PAID",
        customer_email: "test@example.com",
        order_number: "VDB-001",
        total_cents: 1000,
        confirmation_sent: true,
        delivery_released: true,
      },
    });

    const result = await updateOrderPaymentStatus("order-1", "tr_abc", "refunded");
    expect(result?.alreadyProcessed).toBe(false);
    expect(result?.mappedStatus).toBe("REFUNDED");
  });

  it("maps expired to cancelled order status", async () => {
    const result = await updateOrderPaymentStatus("order-1", "tr_exp", "expired");
    expect(result?.mappedStatus).toBe("CANCELLED");
  });

  it("maps charged_back after paid", async () => {
    selectMock.mockResolvedValueOnce({
      data: {
        id: "order-1",
        status: "PAID",
        customer_email: "test@example.com",
        order_number: "VDB-001",
        total_cents: 1000,
        confirmation_sent: true,
        delivery_released: true,
      },
    });
    const result = await updateOrderPaymentStatus("order-1", "tr_cb", "charged_back");
    expect(result?.mappedStatus).toBe("REFUNDED");
  });
});
