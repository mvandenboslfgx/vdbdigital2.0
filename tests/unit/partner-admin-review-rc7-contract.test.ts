/**
 * Contract bundle pin for partner administrative review rc.7 (B1).
 * Isolates Fase-2 contract from pre-existing rc.5/rc.6 checksum drift.
 */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const BUNDLE = resolve("contracts/releases/vdb-backend-contract-0.2.0-rc.7");
const CONTRACT_VERSION = "vdb-backend-contract@0.2.0-rc.7";
const SCHEMA_VERSION = "2026.07.29.partner-approval-aal2-rc6";

function readJson(name: string) {
  return JSON.parse(readFileSync(resolve(BUNDLE, name), "utf8"));
}

describe("vdb-backend-contract@0.2.0-rc.7 bundle", () => {
  it("pins contract package while retaining rc.6 read schema stamps", () => {
    const manifest = readJson("manifest.json");
    expect(manifest.contractVersion).toBe(CONTRACT_VERSION);
    expect(manifest.schemaVersion).toBe(SCHEMA_VERSION);
    expect(manifest.minimumCompatibleClientVersion).toBe(">=0.2.0-rc.7");
    expect(manifest.unpublished).toBe(true);
    expect(manifest.notes.join(" ")).toMatch(/administrative partner/i);
    expect(manifest.notes.join(" ")).not.toMatch(/Veriff|Sumsub|Onfido/i);
  });

  it("documents staff_attest_partner_admin_review with AAL2 and no IDV claim", () => {
    const rpcs = readJson("rpcs.json");
    const attest = rpcs.partnerRpcs.find(
      (r: { name: string }) => r.name === "staff_attest_partner_admin_review",
    );
    expect(attest).toBeTruthy();
    expect(attest.signature).toContain("p_partner_id");
    expect(attest.note).toMatch(/require_aal2|AAL2/i);
    expect(attest.note).toMatch(/administrative/i);
    expect(attest.note).toMatch(/not IDV/i);
    expect(attest.note).not.toMatch(/Veriff|document upload|selfie/i);
    expect(rpcs.partnerRpcs.map((r: { name: string }) => r.name)).toContain(
      "verify_partner_admin_review_rc7_contracts",
    );
  });

  it("documents reason/outcome validation and RATE_LIMITED", () => {
    const errors = readJson("error-codes.json");
    expect(errors.codes).toContain("RATE_LIMITED");
    expect(errors.rc7Notes.IDENTITY_SEMANTICS_V1).toMatch(
      /administrative partnercontrole/i,
    );
    expect(errors.activationDenied.codes).toContain("IDENTITY_NOT_VERIFIED");
    expect(errors.activationDenied.codes).toContain("AGE_NOT_VERIFIED");
  });

  it("lists the rc.7 admin-review migration without rewriting rc.6 history", () => {
    const mm = readJson("migration-manifest.json");
    expect(mm.partnerAdminReviewMigrations[0].version).toBe("20260801120000");
    expect(mm.applyOrder.at(-1)).toBe(
      "20260801120000_staff_attest_partner_admin_review_rc7.sql",
    );
    expect(mm.applyOrder).toContain(
      "20260729145145_admin_rpc_schema_stamps_rc6.sql",
    );
  });

  it("checksums and BUNDLE_SHA256 are consistent for rc.7", () => {
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
    expect(
      readFileSync(resolve(BUNDLE, "BUNDLE_SHA256.txt"), "utf8").trim(),
    ).toBe(bundleSha);
  });
});

describe("pre-existing rc.6 drift remains isolated", () => {
  it("does not modify historical rc.6 checksums.json as part of rc.7", () => {
    const rc6 = resolve("contracts/releases/vdb-backend-contract-0.2.0-rc.6");
    const recorded = JSON.parse(
      readFileSync(resolve(rc6, "checksums.json"), "utf8"),
    );
    // Document known pre-existing drift file still present as recorded ≠ actual
    const actual = createHash("sha256")
      .update(readFileSync(resolve(rc6, "error-codes.json")))
      .digest("hex");
    expect(recorded["error-codes.json"]).not.toBe(actual);
  });
});
