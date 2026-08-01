import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const B = "contracts/releases/vdb-backend-contract-0.2.0-rc.7";

const manifest = JSON.parse(fs.readFileSync(`${B}/manifest.json`, "utf8"));
manifest.contractVersion = "vdb-backend-contract@0.2.0-rc.7";
manifest.minimumCompatibleClientVersion = ">=0.2.0-rc.7";
manifest.partnerApprovalAal2CompatibleWith =
  "vdb-backend-contract@0.2.0-rc.6";
manifest.generatedAt = "2026-08-01";
manifest.sourceHeadHint = "partner-admin-review-rc7";
manifest.notes = [
  "RC7 additive: staff_attest_partner_admin_review for Partners v1 administrative partnercontrole (B1).",
  "identity_verification_status=VERIFIED means administrative partner review completed by authorized staff — NOT document/biometric/external IDV.",
  "Does not change AGE/BUSINESS/AGREEMENT/PAYOUT/STAFF_APPROVAL checklist gates.",
  "Does not rewrite existing rows, ACTIVE partners, or grandfathering.",
  "Does not enable partner_compliance_fixtures; staging fixture RPC remains staging-only.",
  "schemaVersion stamps on admin/directory/checklist read RPCs remain 2026.07.29.partner-approval-aal2-rc6 (no mass stamp bump).",
  "Pre-existing rc.5/rc.6 checksum drift is intentionally NOT repaired in those bundles.",
  "Does not authorize production apply. Payouts remain fail-closed.",
];
fs.writeFileSync(`${B}/manifest.json`, JSON.stringify(manifest, null, 2) + "\n");

const errors = JSON.parse(fs.readFileSync(`${B}/error-codes.json`, "utf8"));
if (!errors.codes.includes("RATE_LIMITED")) errors.codes.push("RATE_LIMITED");
errors.rc7Notes = {
  RATE_LIMITED:
    "staff_attest_partner_admin_review rate-limits per staff uid via check_rate_limit.",
  VALIDATION_FAILED:
    "staff_attest_partner_admin_review rejects unknown outcome/reason_code or incoherent outcome↔reason pairs. No free-text reasons.",
  AAL2_REQUIRED:
    "staff_attest_partner_admin_review requires require_aal2() after is_staff_admin().",
  FORBIDDEN:
    "staff_attest_partner_admin_review requires is_staff_admin(); partners/customers cannot attest.",
  IDENTITY_SEMANTICS_V1:
    "identity_verification_status=VERIFIED means administrative partnercontrole afgerond — not KYC/document/biometric verification.",
};
fs.writeFileSync(`${B}/error-codes.json`, JSON.stringify(errors, null, 2) + "\n");

const rpcs = JSON.parse(fs.readFileSync(`${B}/rpcs.json`, "utf8"));
if (!rpcs.partnerRpcs.some((r) => r.name === "staff_attest_partner_admin_review")) {
  rpcs.partnerRpcs.push({
    name: "staff_attest_partner_admin_review",
    signature: "(p_partner_id uuid, p_outcome text, p_reason_code text)",
    note: "rc.7 NEW — staff + AAL2 administrative partner review. Outcomes: VERIFIED|REJECTED|MANUAL_REVIEW|NOT_STARTED. Reason codes allowlist only. Sets identity_verification_status only; never provider_ref; never activates; never touches age/business/agreement/payout. Idempotent audit on change only. VERIFIED = administrative partnercontrole afgerond (not IDV).",
  });
  rpcs.partnerRpcs.push({
    name: "verify_partner_admin_review_rc7_contracts",
    note: "rc.7 NEW — presence/hardening verifier for staff_attest_partner_admin_review; proves IDENTITY and AGE gates retained.",
  });
}
if (!rpcs.mobileClientRpcMapping) rpcs.mobileClientRpcMapping = {};
rpcs.mobileClientRpcMapping.attest_partner_admin_review = {
  canonical: "staff_attest_partner_admin_review",
  note: "Optional mobile admin surface. AAL2 required. Prefer Partners web admin for Fase 2 if mobile AAL2 mutation UX is incomplete.",
};
fs.writeFileSync(`${B}/rpcs.json`, JSON.stringify(rpcs, null, 2) + "\n");

const mm = JSON.parse(fs.readFileSync(`${B}/migration-manifest.json`, "utf8"));
mm.highestVersion = "20260801120000";
mm.partnerAdminReviewMigrations = [
  {
    version: "20260801120000",
    filename: "20260801120000_staff_attest_partner_admin_review_rc7.sql",
    purpose:
      "staff_attest_partner_admin_review + verify_partner_admin_review_rc7_contracts; identity column comment semantics for v1 administrative review",
  },
];
if (
  !mm.applyOrder.includes(
    "20260801120000_staff_attest_partner_admin_review_rc7.sql",
  )
) {
  mm.applyOrder.push(
    "20260801120000_staff_attest_partner_admin_review_rc7.sql",
  );
}
fs.writeFileSync(
  `${B}/migration-manifest.json`,
  JSON.stringify(mm, null, 2) + "\n",
);

const tables = JSON.parse(fs.readFileSync(`${B}/tables.json`, "utf8"));
tables.rc7Semantics = {
  identity_verification_status:
    "v1: administrative partner review status. VERIFIED = administrative partnercontrole afgerond by authorized staff. Not document/biometric/external IDV. Gate IDENTITY_NOT_VERIFIED retained.",
  identity_verification_provider_ref:
    "Must remain null for administrative review path. Future optional IDV only. Never document contents.",
};
fs.writeFileSync(`${B}/tables.json`, JSON.stringify(tables, null, 2) + "\n");

fs.writeFileSync(
  `${B}/RELEASE_NOTES.md`,
  `# vdb-backend-contract@0.2.0-rc.7

## Summary

Additive Partners v1 administrative partner review (B1 / Fase 2).

- New RPC \`staff_attest_partner_admin_review(partner_id, outcome, reason_code)\`
- Staff + AAL2 + rate limit; allowlisted outcomes/reason codes; no free-text PII
- \`identity_verification_status=VERIFIED\` means **administratieve partnercontrole afgerond**
- Does **not** imply camera/document/selfie/liveness/BSN/external IDV
- Does **not** change AGE or other activation checklist gates
- Does **not** activate partners; does not enable payouts
- Staging fixture RPC unchanged and must stay disabled in production
- schemaVersion stamps for admin/directory/checklist remain \`2026.07.29.partner-approval-aal2-rc6\`
- rc.5/rc.6 checksum drift is **not** repaired in those historical bundles

## Production

NOT AUTHORIZED.
`,
);

fs.writeFileSync(
  `${B}/CONSUMER_VERIFICATION.md`,
  `# Consumer verification — 0.2.0-rc.7

## Pin

- contractVersion: \`vdb-backend-contract@0.2.0-rc.7\`
- schemaVersion (read RPC stamps): \`2026.07.29.partner-approval-aal2-rc6\`
- New mutation: \`staff_attest_partner_admin_review\`

## UI copy

Show administrative partnercontrole statuses. Never claim automatic ID-check/KYC.

## Security

- Partners cannot attest (FORBIDDEN without staff)
- AAL2 required for staff
- No document upload / camera IDV in consumers for this surface
`,
);

let dt = fs.readFileSync(`${B}/database.types.ts`, "utf8");
if (!dt.includes("staff_attest_partner_admin_review")) {
  dt = dt.replace(
    "      staff_set_partner_compliance_fixture: {",
    `      staff_attest_partner_admin_review: {
        Args: {
          p_outcome: string
          p_partner_id: string
          p_reason_code: string
        }
        Returns: Json
      }
      staff_set_partner_compliance_fixture: {`,
  );
  fs.writeFileSync(`${B}/database.types.ts`, dt);
}

const files = fs
  .readdirSync(B)
  .filter((f) => f !== "checksums.json" && f !== "BUNDLE_SHA256.txt")
  .sort();
const checksums = {};
for (const f of files) {
  checksums[f] = createHash("sha256")
    .update(fs.readFileSync(path.join(B, f)))
    .digest("hex");
}
fs.writeFileSync(`${B}/checksums.json`, JSON.stringify(checksums, null, 2) + "\n");
const concat = files.map((f) => `${f}:${checksums[f]}`).join("\n") + "\n";
const bundleSha = createHash("sha256").update(concat).digest("hex");
fs.writeFileSync(`${B}/BUNDLE_SHA256.txt`, bundleSha + "\n");
console.log("rc.7 bundleSha", bundleSha);
console.log("files", files.length);

// Prove rc.6 still dirty-count 0 for checksum files relative to HEAD
console.log("done");
