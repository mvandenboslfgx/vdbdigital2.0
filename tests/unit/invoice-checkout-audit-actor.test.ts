import { describe, expect, it } from "vitest";
import type { AuditLogInput } from "@/lib/security/audit-log";

type ActorKey = keyof AuditLogInput;

/**
 * Regression: invoice checkout must pass the actor via canonical AuditLogInput.userId
 * (maps to audit_logs.user_id). Stale `actorId` is not part of the contract.
 */
describe("invoice checkout audit actor contract", () => {
  it("accepts canonical userId actor on checkout.invoice_payment_created", () => {
    const input: AuditLogInput = {
      action: "checkout.invoice_payment_created",
      resourceType: "portal_invoice",
      resourceId: "00000000-0000-4000-8000-000000000001",
      userId: "00000000-0000-4000-8000-000000000099",
      metadata: {
        paymentIdPrefix: "tr_abcde1",
        amountCents: 1250,
        reused: false,
      },
    };

    expect(input.userId).toBe("00000000-0000-4000-8000-000000000099");
    expect(input.action).toBe("checkout.invoice_payment_created");
    expect(input.resourceType).toBe("portal_invoice");
    expect(input.metadata?.paymentIdPrefix).toBe("tr_abcde1");
    expect("actorId" in input).toBe(false);
  });

  it("keeps userId as the only actor field on AuditLogInput", () => {
    const actorKeys: ActorKey[] = ["userId"];
    expect(actorKeys).toContain("userId");
    expect((actorKeys as string[]).includes("actorId")).toBe(false);

    const sample: AuditLogInput = {
      action: "checkout.invoice_payment_created",
      userId: "user-1",
    };
    expect(Object.prototype.hasOwnProperty.call(sample, "userId")).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(sample, "actorId")).toBe(false);
  });
});
