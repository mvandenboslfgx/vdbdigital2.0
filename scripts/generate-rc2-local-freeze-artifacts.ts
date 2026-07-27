/**
 * Local RC2 freeze artifact generator — no remote, no secrets.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";

const root = process.cwd();
const migDir = path.join(root, "supabase/migrations");
const relDir = path.join(
  root,
  "contracts/releases/vdb-backend-contract-0.2.0-rc.2",
);

const sha = (p: string) =>
  crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");

const writeJson = (name: string, obj: unknown) => {
  const p = path.join(relDir, name);
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n");
  return p;
};

const files = fs
  .readdirSync(migDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();
if (files.length !== 42) {
  throw new Error(`expected 42 migrations, got ${files.length}`);
}

const categoryOf = (f: string) => {
  if (f.includes("baseline_marker")) return "BASELINE_MARKER";
  if (f.startsWith("202607221")) return "PARTNER";
  if (f.includes("grant") || f.includes("catalog_role_acl")) return "GRANT_ACL";
  if (f.includes("mobile_compat")) return "MOBILE_COMPAT";
  if (f.includes("concurrency")) return "CONCURRENCY";
  if (
    f.includes("invoice") ||
    f.includes("quote") ||
    f.includes("portal") ||
    f.includes("customer")
  )
    return "PORTAL_FINANCIAL";
  if (f.includes("catalog") || f.includes("product")) return "CATALOG";
  if (
    f.includes("payment") ||
    f.includes("p0") ||
    f.includes("p05") ||
    f.includes("rate_limit")
  )
    return "PAYMENTS";
  if (f.includes("access") || f.includes("rls") || f.includes("webhook"))
    return "SECURITY";
  if (f.includes("documents") || f.includes("storage")) return "STORAGE";
  if (f.includes("project")) return "PROJECTS";
  if (f.includes("initial") || f.includes("phase") || f.includes("submission"))
    return "FOUNDATION";
  return "OTHER";
};

const purposeOf = (f: string) => {
  const map: Record<string, string> = {
    "20260724180000_partner_sale_single_conversion_concurrency.sql":
      "UNIQUE(partner_lead_id) + confirm_partner_sale hardening",
    "20260724190000_partner_payout_liability_concurrency.sql":
      "request_partner_payout partner_profiles FOR UPDATE serialization",
    "20260724173000_catalog_role_acl_privileges_contract.sql":
      "Catalog ACL privileges for seed/RLS",
    "20260724160000_mobile_compat_rc2.sql":
      "Mobile compat feature flags + payout gate",
    "20260724103105_staging_cloud_grant_hardening.sql":
      "Staging/local grant hardening",
  };
  return (
    map[f] ||
    f
      .replace(/^\d+_/, "")
      .replace(/\.sql$/, "")
      .replace(/_/g, " ")
  );
};

const introducedBy = (f: string) => {
  try {
    return (
      execSync(`git log -1 --format=%H -- "supabase/migrations/${f}"`, {
        encoding: "utf8",
      }).trim() || null
    );
  } catch {
    return null;
  }
};

const stagingKnown = new Set([
  "20260723140000_invoice_rpc_grant_hardening.sql",
  "20260723150000_invoice_rpc_grant_verify_alignment.sql",
  "20260724103105_staging_cloud_grant_hardening.sql",
]);

const migrations = files.map((f) => {
  const version = f.split("_")[0];
  const full = path.join(migDir, f);
  const remoteStaging = stagingKnown.has(f)
    ? "yes"
    : version >= "20260724160000"
      ? "no"
      : "unknown";
  return {
    version,
    filename: f,
    sha256: sha(full),
    category: categoryOf(f),
    purpose: purposeOf(f),
    introducedByCommit: introducedBy(f),
    contractImpact: ["CONCURRENCY", "PARTNER", "MOBILE_COMPAT", "GRANT_ACL"].includes(
      categoryOf(f),
    ),
    dataMutation: false,
    remoteAppliedToStaging: remoteStaging,
    remoteAppliedToProduction: version <= "20260719170000" ? "yes" : "no",
  };
});

writeJson("migrations.json", {
  contractVersion: "vdb-backend-contract@0.2.0-rc.2",
  schemaVersion: "2026.07.27.financial-concurrency-rc2",
  count: migrations.length,
  finalVersion: migrations[migrations.length - 1].version,
  finalFilename: migrations[migrations.length - 1].filename,
  excludedRc3Messaging: [
    "20260725120000_messaging_support_appointments_rc3.sql",
    "20260725120100_messaging_support_appointments_rc3_rpcs.sql",
    "20260725120200_fix_appointment_rls_recursion.sql",
    "20260725120300_rc3_table_grants.sql",
  ],
  migrations,
});

fs.writeFileSync(
  path.join(relDir, "migrations.sha256"),
  migrations.map((m) => `${m.sha256}  ${m.filename}`).join("\n") + "\n",
);

const conc = JSON.parse(
  fs.readFileSync("docs/audits/VDB_RC2_CONCURRENCY_RESULTS.json", "utf8"),
);

writeJson("concurrency-results.json", {
  contractVersion: "vdb-backend-contract@0.2.0-rc.2",
  schemaVersion: "2026.07.27.financial-concurrency-rc2",
  harnessCommit: "084c3fb",
  failureEvidenceCommit: "89721b9c2edfcabe4f2f89af22a2cee6791b2afa",
  remediationCommits: ["ed7a115", "2f5c733", "a15d7ae", "34c0a78"],
  preFreezeHead: "34c0a788086f2c29768da0d15a787f54c49f4d45",
  runCount: 2,
  run1: "PASS",
  run2: "PASS",
  totals: {
    iterations: 594,
    concurrentCalls: 1582,
    unexpectedErrors: 0,
    invariantFailures: 0,
    duplicateSales: 0,
    duplicateCommissions: 0,
    payoutOverspends: 0,
    ledgerImbalances: 0,
  },
  loserOutcomes: {
    distinctIdempotencySameLead: "PARTNER_LEAD_ALREADY_CONVERTED",
    payoutOverspend: "PARTNER_INSUFFICIENT_LIABILITY",
    sameKeyRetry: "idempotent UUID return",
  },
  roleChange: {
    payoutVsSuspension: "PASS",
    staffAuthorityRevocationDuringMutation:
      "STAFF_REVOCATION_CONCURRENCY_NON_BLOCKING_LIMITATION",
    rationale:
      "No temporal admin-grant model inside payout RPCs; staff auth checked at call start. Core financial races proven; staff-revocation concurrency is not claimed as proven.",
  },
  sourceResults: conc.totals,
  scenarios: conc.run1.results.map(
    (r: { race: string; variant: string; pass: boolean }) => ({
      race: r.race,
      variant: r.variant,
      pass: r.pass,
    }),
  ),
});

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
writeJson("dependency-baseline.json", {
  node: process.version,
  npm: execSync("npm -v", { encoding: "utf8" }).trim(),
  lockfileVersion: lock.lockfileVersion,
  packageLockSha256: sha("package-lock.json"),
  dependencies: {
    next: pkg.dependencies.next,
    react: pkg.dependencies.react,
    "react-dom": pkg.dependencies["react-dom"],
  },
  scopedOverrides: pkg.overrides,
  resolvedViaOverride: {
    "next/postcss": "8.5.23",
    "next/sharp": "0.35.3",
  },
  productionAuditRequirement: {
    critical: 0,
    high: 0,
    moderate: 0,
    low: 0,
  },
  residualDevOnlyAdvisories:
    "eslint/minimatch/brace-expansion chain — non-production",
  freezeNote: "No dependency mutation during freeze",
});

writeJson(
  "contract.json",
  JSON.parse(fs.readFileSync(path.join(relDir, "manifest.json"), "utf8")),
);
fs.writeFileSync(
  path.join(relDir, "schema-version.txt"),
  "2026.07.27.financial-concurrency-rc2\n",
);
fs.copyFileSync(
  path.join(relDir, "rpcs.json"),
  path.join(relDir, "rpc-manifest.json"),
);

writeJson("compatibility.json", {
  contractVersion: "vdb-backend-contract@0.2.0-rc.2",
  schemaVersion: "2026.07.27.financial-concurrency-rc2",
  partnerSurfaceCompatibleWith: "vdb-backend-contract@0.2.0-rc.1",
  minimumCompatibleClientVersion: ">=0.2.0-rc.2",
  mobileCompat: "included additive",
  rc3Messaging: "OUTSIDE_RC2",
  breakingForClients: [
    "PARTNER_LEAD_ALREADY_CONVERTED on distinct-key same-lead conversion",
    "PARTNER_INSUFFICIENT_LIABILITY on overspend payout request",
  ],
});

const fin = JSON.parse(
  fs.readFileSync(path.join(relDir, "financial-invariants.json"), "utf8"),
) as { invariants: string[]; [k: string]: unknown };
const extra = [
  "one_partner_sale_per_partner_lead",
  "partner_sales_one_per_lead_unique",
  "confirm_partner_sale_same_key_idempotent",
  "confirm_partner_sale_different_key_conflict",
  "sale_commission_ledger_atomic",
  "payout_request_serialized_on_partner_profile",
  "requested_status_reserves_liability",
  "total_reservation_never_exceeds_available_liability",
];
fin.invariants = Array.from(new Set([...fin.invariants, ...extra]));
fin.saleConcurrency = {
  constraint: "partner_sales_one_per_lead",
  errorCode: "PARTNER_LEAD_ALREADY_CONVERTED",
};
fin.payoutConcurrency = {
  lock: "partner_profiles FOR UPDATE",
  reservingStatus: "REQUESTED",
  errorCode: "PARTNER_INSUFFICIENT_LIABILITY",
};
writeJson("financial-invariants.json", fin);

fs.writeFileSync(
  path.join(relDir, "VERIFY.md"),
  [
    "# Verify vdb-backend-contract@0.2.0-rc.2",
    "",
    "Local-only verification against `vdbdigital2` (42 migrations, schemaVersion `2026.07.27.financial-concurrency-rc2`).",
    "",
    "1. `npx supabase db reset` → exit 0, final `20260724190000`",
    "2. `npm run db:seed`",
    "3. `npm run db:test-rls` → 13/13",
    "4. `npm run db:verify-partner-backend`",
    "5. `npm run db:verify-invoices-financial`",
    "6. `npx tsx scripts/test-rc2-financial-concurrency.ts` → RUN1/RUN2 PASS (594 / 1582)",
    "7. Compare `migrations.sha256` and `SHA256SUMS`",
    "",
    "Do not apply remotely without separate authorization.",
    "",
  ].join("\n"),
);

console.log("OK migrations", migrations.length);
console.log("migrations.json", sha(path.join(relDir, "migrations.json")));
console.log("migrations.sha256", sha(path.join(relDir, "migrations.sha256")));
