import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const BUNDLE = resolve("contracts/releases/vdb-backend-contract-0.2.0-rc.3");

describe("vdb-backend-contract@0.2.0-rc.3 bundle", () => {
  it("pins schemaVersion and maps support_messages", () => {
    const manifest = JSON.parse(readFileSync(resolve(BUNDLE, "manifest.json"), "utf8"));
    expect(manifest.contractVersion).toBe("vdb-backend-contract@0.2.0-rc.3");
    expect(manifest.schemaVersion).toBe("2026.07.25.messaging-support-appointments-rc3");

    const tables = JSON.parse(readFileSync(resolve(BUNDLE, "tables.json"), "utf8"));
    expect(tables.mobileClientTableMapping.support_messages).toBe("portal_support_replies");
    expect(tables.customerPortalTables).toContain("portal_appointments");
    expect(tables.customerPortalTables).toContain("portal_message_attachments");

    const rpcs = JSON.parse(readFileSync(resolve(BUNDLE, "rpcs.json"), "utf8"));
    expect(rpcs.mobileClientRpcMapping.book_appointment_slot.canonical).toBe("book_portal_appointment");
    expect(rpcs.deferredMobileOnlyRpcs).not.toContain("book_appointment_slot");

    const flags = JSON.parse(readFileSync(resolve(BUNDLE, "feature-flags.json"), "utf8"));
    expect(flags.appointments_booking.default).toBe(false);
    expect(flags.messaging_realtime.default).toBe(false);
    expect(flags.support_internal_notes_rpc.default).toBe(false);

    const errors = JSON.parse(readFileSync(resolve(BUNDLE, "error-codes.json"), "utf8"));
    expect(errors.codes).toContain("NOT_PARTICIPANT");
    expect(errors.codes).toContain("DOUBLE_BOOKING");
  });
});
