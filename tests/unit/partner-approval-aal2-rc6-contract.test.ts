/**
 * Contract bundle pin for partner approval AAL2 rc.6.
 */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const BUNDLE = resolve("contracts/releases/vdb-backend-contract-0.2.0-rc.6");
const CONTRACT_VERSION = "vdb-backend-contract@0.2.0-rc.6";
const SCHEMA_VERSION = "2026.07.29.partner-approval-aal2-rc6";

function readJson(name: string) {
  return JSON.parse(readFileSync(resolve(BUNDLE, name), "utf8"));
}

describe("vdb-backend-contract@0.2.0-rc.6 bundle", () => {
  it("pins the contract and schema version", () => {
    const manifest = readJson("manifest.json");
    expect(manifest.contractVersion).toBe(CONTRACT_VERSION);
    expect(manifest.schemaVersion).toBe(SCHEMA_VERSION);
    expect(manifest.minimumCompatibleClientVersion).toBe(">=0.2.0-rc.6");
    expect(manifest.partnerIdentityDirectoryCompatibleWith).toBe(
      "vdb-backend-contract@0.2.0-rc.5",
    );
    expect(manifest.unpublished).toBe(true);
  });

  it("requires AAL2 on review_partner_application", () => {
    const rpcs = readJson("rpcs.json");
    const review = rpcs.partnerRpcs.find(
      (r: { name: string }) => r.name === "review_partner_application",
    );
    expect(review.note).toMatch(/require_aal2|AAL2/i);
    expect(rpcs.partnerRpcs.map((r: { name: string }) => r.name)).toContain(
      "verify_partner_approval_aal2_rc6_contracts",
    );
    expect(rpcs.mobileClientRpcMapping.approve_partner_application.note).toMatch(/AAL2/);
  });

  it("documents AAL2_REQUIRED for review in rc6Notes", () => {
    const errors = readJson("error-codes.json");
    expect(errors.codes).toContain("AAL2_REQUIRED");
    expect(errors.rc6Notes.AAL2_REQUIRED).toMatch(/review_partner_application/);
  });

  it("lists the forward RC6 migration", () => {
    const mm = readJson("migration-manifest.json");
    expect(mm.partnerApprovalAal2Migrations[0].version).toBe("20260729141024");
    expect(mm.applyOrder.at(-1)).toBe(
      "20260729141024_review_partner_application_aal2_rc6.sql",
    );
  });

  it("checksums and BUNDLE_SHA256 are consistent", () => {
    const files = readdirSync(BUNDLE)
      .filter((f) => f !== "checksums.json" && f !== "BUNDLE_SHA256.txt")
      .sort();
    const checksums = readJson("checksums.json");
    for (const f of files) {
      const digest = createHash("sha256")
        .update(readFileSync(resolve(BUNDLE, f)))
        .digest("hex");
      expect(checksums[f]).toBe(digest);
    }
    const concat = files.map((f) => `${f}:${checksums[f]}`).join("\n") + "\n";
    const bundleSha = createHash("sha256").update(concat).digest("hex");
    expect(readFileSync(resolve(BUNDLE, "BUNDLE_SHA256.txt"), "utf8").trim()).toBe(
      bundleSha,
    );
  });
});
