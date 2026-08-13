/**
 * Contract bundle pin for partner identity + admin directory detail rc.5.
 */
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  bundleDigestFromChecksums,
  sealMatchesContractFile,
} from "./helpers/contract-bundle-digest";

const BUNDLE = resolve("contracts/releases/vdb-backend-contract-0.2.0-rc.5");
const CONTRACT_VERSION = "vdb-backend-contract@0.2.0-rc.5";
const SCHEMA_VERSION = "2026.07.29.partner-identity-directory-rc5";

function readJson(name: string) {
  return JSON.parse(readFileSync(resolve(BUNDLE, name), "utf8"));
}

describe("vdb-backend-contract@0.2.0-rc.5 bundle", () => {
  it("pins the contract and schema version", () => {
    const manifest = readJson("manifest.json");
    expect(manifest.contractVersion).toBe(CONTRACT_VERSION);
    expect(manifest.schemaVersion).toBe(SCHEMA_VERSION);
    expect(manifest.minimumCompatibleClientVersion).toBe(">=0.2.0-rc.5");
    expect(manifest.generatedAt).toBe("2026-07-29");
    expect(manifest.unpublished).toBe(true);
    expect(manifest.adminControlSurfaceCompatibleWith).toBe(
      "vdb-backend-contract@0.2.0-rc.4",
    );
  });

  it("exposes the rc.5 directory detail RPCs", () => {
    const rpcs = readJson("rpcs.json");
    const adminNames = rpcs.adminControlSurfaceRpcs.map((r: { name: string }) => r.name);
    for (const name of [
      "admin_get_product",
      "admin_get_partner",
      "admin_get_customer",
      "admin_get_project",
      "admin_get_quote",
      "admin_get_invoice",
      "admin_get_appointment",
    ]) {
      expect(adminNames).toContain(name);
      expect(rpcs.mobileClientRpcMapping[name].canonical).toBe(name);
      expect(rpcs.deferredMobileOnlyRpcs).not.toContain(name);
    }

    const portalNames = rpcs.customerPortalRpcs.map((r: { name: string }) => r.name);
    expect(portalNames).toContain("list_portal_support_ticket_replies");
    expect(rpcs.mobileClientRpcMapping.admin_list_support_replies.canonical).toBe(
      "list_portal_support_ticket_replies",
    );
    expect(rpcs.mobileClientRpcMapping.list_ticket_messages.canonical).toBe(
      "list_portal_support_ticket_replies",
    );
  });

  it("exposes the rc.5 partner identity RPCs", () => {
    const rpcs = readJson("rpcs.json");
    const partnerNames = rpcs.partnerRpcs.map((r: { name: string }) => r.name);
    for (const name of [
      "activate_partner_profile",
      "accept_partner_agreement",
      "partner_activation_checklist",
      "partner_try_activate",
      "partner_is_valid_kvk",
      "staff_set_partner_compliance_fixture",
      "verify_partner_identity_directory_rc5_contracts",
    ]) {
      expect(partnerNames).toContain(name);
    }

    // The typed intake signature is the one breaking change clients must adopt.
    const submit = rpcs.partnerRpcs.find(
      (r: { name: string }) => r.name === "submit_partner_application",
    );
    expect(submit.signature).toContain("p_partner_type text");
    expect(submit.signature.indexOf("p_partner_type")).toBeLessThan(
      submit.signature.indexOf("p_legal_name"),
    );
    expect(rpcs.mobileClientRpcMapping.submit_partner_application.status).toBe(
      "client-adapter-required",
    );

    // Compliance fixtures must stay declared as staging-only and flag-gated.
    const stagingOnly = rpcs.stagingOnlyRpcs.map((r: { name: string }) => r.name);
    expect(stagingOnly).toContain("staff_set_partner_compliance_fixture");
    expect(rpcs.stagingOnlyRpcs[0].flag).toBe("partner_compliance_fixtures");

    expect(rpcs.payoutMutationsMobilePolicy.status).toBe("disabled");
    expect(rpcs.deprecatedAliases[0].name).toBe("transition_portal_support_ticket");
  });

  it("declares the rc.5 identity enums", () => {
    const enums = readJson("enums.json");
    expect(enums.partner_type).toEqual(["INDIVIDUAL", "BUSINESS"]);
    expect(enums.partner_type_classification_status).toEqual([
      "UNKNOWN",
      "KNOWN",
      "REVIEW_REQUIRED",
    ]);
    expect(enums.partner_verification_status).toContain("VERIFIED");
    expect(enums.partner_verification_status).toContain("EXPIRED");
    expect(enums.partner_payout_profile_status).toContain("APPROVED");
    expect(enums.partner_agreement_type).toEqual([
      "INDIVIDUAL_PARTNER",
      "BUSINESS_PARTNER",
    ]);
    // rc.4 carry-over must survive the copy.
    expect(enums.partner_commission_status).toContain("REJECTED");
  });

  it("declares the agreement tables and additive columns", () => {
    const tables = readJson("tables.json");
    expect(tables.partnerTables).toContain("partner_agreement_versions");
    expect(tables.partnerTables).toContain("partner_agreement_acceptances");
    expect(tables.rc5NewTables.partner_agreement_acceptances.writer).toContain(
      "accept_partner_agreement",
    );
    expect(tables.rc5NewTables.partner_agreement_versions.legalWarning).toMatch(
      /binding legal text/i,
    );
    expect(tables.rc5NewTables.partner_agreement_versions.legalWarning).toMatch(
      /legal_review_status is REQUIRED/i,
    );
    expect(tables.rc5NewColumns.partner_applications.join(" ")).toContain("partner_type");
    const profileCols = tables.rc5NewColumns.partner_profiles.join(" ");
    for (const col of [
      "type_classification_status",
      "age_verification_status",
      "identity_verification_status",
      "business_verification_status",
      "payout_profile_status",
      "legacy_activation_grandfathered",
      "activation_block_codes",
      "required_agreement_type",
    ]) {
      expect(profileCols).toContain(col);
    }
    expect(tables.marketingLeadsUntouched).toBe(true);
  });

  it("keeps the rc.5 flags fail-closed", () => {
    const flags = readJson("feature-flags.json");
    expect(flags.partner_compliance_fixtures.default).toBe(false);
    expect(flags.partner_compliance_fixtures.scope).toBe("db.feature_flags");
    expect(flags.partner_compliance_fixtures.notes).toMatch(/STAGING ONLY/i);
    expect(flags.support_internal_notes_rpc.default).toBe(false);
    expect(flags.support_internal_notes_rpc.notes).toMatch(
      /staging may enable after ACL prove/i,
    );
  });

  it("declares the activation error codes", () => {
    const errors = readJson("error-codes.json");
    expect(errors.codes).toContain("ACTIVATION_DENIED");
    expect(errors.codes).toContain("AAL2_REQUIRED");
    expect(errors.codes).toContain("FEATURE_DISABLED");
    expect(errors.activationDenied.format).toBe("ACTIVATION_DENIED:<code>");
    for (const code of [
      "PARTNER_TYPE_UNKNOWN",
      "PARTNER_SUSPENDED",
      "STAFF_APPROVAL_MISSING",
      "AGE_NOT_VERIFIED",
      "IDENTITY_NOT_VERIFIED",
      "BUSINESS_NOT_VERIFIED",
      "COMPANY_DETAILS_MISSING",
      "AGREEMENT_NOT_ACCEPTED",
      "PAYOUT_PROFILE_NOT_APPROVED",
    ]) {
      expect(errors.activationDenied.codes).toContain(code);
    }
    expect(errors.activationDenied.raisedBy).toContain("activate_partner_profile");
  });

  it("ties payout eligibility to an approved payout profile", () => {
    const financial = readJson("financial-invariants.json");
    expect(financial.invariants).toContain(
      "payout_eligible_requires_approved_payout_profile",
    );
    expect(financial.invariants).toContain("ledger_balanced_debit_eq_credit");
  });

  it("lists the five rc.5 migrations in apply order", () => {
    // Sealed on 76694a3 lineage: five identity-directory migrations ending at
    // 20260729140400 (fixture-flag verifier narrow). Older test pinned 40300/4.
    const mig = readJson("migration-manifest.json");
    expect(mig.highestVersion).toBe("20260729140400");
    expect(mig.partnerIdentityDirectoryMigrationCount).toBe(5);
    expect(mig.partnerIdentityDirectoryMigrations).toHaveLength(5);
    expect(
      mig.partnerIdentityDirectoryMigrations.map((m: { version: string }) => m.version),
    ).toEqual([
      "20260729140000",
      "20260729140100",
      "20260729140200",
      "20260729140300",
      "20260729140400",
    ]);
    expect(mig.applyOrder).toEqual([
      "20260729140000_partner_identity_directory_rc5_schema.sql",
      "20260729140100_partner_identity_directory_rc5_activation.sql",
      "20260729140200_admin_directory_detail_rc5_rpcs.sql",
      "20260729140300_partner_identity_directory_rc5_verify.sql",
      "20260729140400_rc5_verifier_fixture_flag_exists_only.sql",
    ]);
    expect(mig.applyPolicy.production).toBe("NOT AUTHORIZED");
    // rc.4 and earlier migration groups must survive the copy.
    expect(mig.adminControlSurfaceMigrationCount).toBe(3);
    expect(mig.partnerMigrationCount).toBe(8);
  });

  it("carries the schemaVersion into the generated types and prose", () => {
    const types = readFileSync(resolve(BUNDLE, "database.types.ts"), "utf8");
    expect(types).toContain("partner_agreement_versions");
    expect(types).toContain("partner_agreement_acceptances");
    expect(types).toContain("activate_partner_profile");
    expect(types).toContain("list_portal_support_ticket_replies");

    for (const doc of ["RELEASE_NOTES.md", "CONSUMER_VERIFICATION.md"]) {
      const text = readFileSync(resolve(BUNDLE, doc), "utf8");
      expect(text).toContain(CONTRACT_VERSION);
      expect(text).toContain(SCHEMA_VERSION);
    }
  });

  it("has reproducible checksums and bundle digest", () => {
    const excluded = new Set(["checksums.json", "BUNDLE_SHA256.txt"]);
    const files = readdirSync(BUNDLE)
      .filter((f) => !excluded.has(f))
      .sort();
    const checksums = readJson("checksums.json") as Record<string, string>;

    expect(Object.keys(checksums).sort()).toEqual(files);
    for (const f of files) {
      expect(
        sealMatchesContractFile(readFileSync(resolve(BUNDLE, f)), checksums[f]),
        `${f} checksum drifted (LF/CRLF-tolerant)`,
      ).toBe(true);
    }

    expect(readFileSync(resolve(BUNDLE, "BUNDLE_SHA256.txt"), "utf8").trim()).toBe(
      bundleDigestFromChecksums(files, checksums),
    );
  });
});
