/**
 * Contract bundle pin for admin control surface rc.4.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const BUNDLE = resolve("contracts/releases/vdb-backend-contract-0.2.0-rc.4");

describe("vdb-backend-contract@0.2.0-rc.4 bundle", () => {
  it("pins schemaVersion and admin RPCs", () => {
    const manifest = JSON.parse(readFileSync(resolve(BUNDLE, "manifest.json"), "utf8"));
    expect(manifest.contractVersion).toBe("vdb-backend-contract@0.2.0-rc.4");
    expect(manifest.schemaVersion).toBe("2026.07.29.admin-control-surface-rc4");

    const rpcs = JSON.parse(readFileSync(resolve(BUNDLE, "rpcs.json"), "utf8"));
    const adminNames = rpcs.adminControlSurfaceRpcs.map((r: { name: string }) => r.name);
    expect(adminNames).toContain("admin_dashboard_stats");
    expect(adminNames).toContain("admin_work_queue");
    expect(rpcs.deferredMobileOnlyRpcs).not.toContain("admin_dashboard_stats");
    expect(rpcs.deferredMobileOnlyRpcs).not.toContain("admin_work_queue");
    expect(rpcs.mobileClientRpcMapping.admin_update_ticket_status.canonical).toBe(
      "transition_portal_support_ticket_status",
    );
    expect(rpcs.deprecatedAliases[0].name).toBe("transition_portal_support_ticket");
    expect(rpcs.payoutMutationsMobilePolicy.status).toBe("disabled");

    const enums = JSON.parse(readFileSync(resolve(BUNDLE, "enums.json"), "utf8"));
    expect(enums.partner_commission_status).toContain("REJECTED");

    const errors = JSON.parse(readFileSync(resolve(BUNDLE, "error-codes.json"), "utf8"));
    expect(errors.codes).toContain("AAL2_REQUIRED");

    const mig = JSON.parse(readFileSync(resolve(BUNDLE, "migration-manifest.json"), "utf8"));
    expect(mig.highestVersion).toBe("20260729130000");
    expect(mig.adminControlSurfaceMigrationCount).toBe(3);
  });
});
