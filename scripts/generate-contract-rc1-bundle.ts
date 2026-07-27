/**
 * Generate + drift-check vdb-backend-contract@0.2.0-rc.1 release bundle (local only).
 * No publish. No secrets. No remote.
 */
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";

const BUNDLE_DIR = resolve(
  "contracts/releases/vdb-backend-contract-0.2.0-rc.1",
);
const CONTRACT_VERSION = "vdb-backend-contract@0.2.0-rc.1";
const SCHEMA_VERSION = "2026.07.22.partner-rc1";
const MIN_CLIENT = ">=0.2.0-rc.1";
const CONTAINER = "supabase_db_vdbdigital2";

const PARTNER_MIGRATIONS = [
  {
    version: "20260722100000",
    filename: "20260722100000_partner_identity_roles.sql",
    purpose: "Partner enums + partner_profiles + identity helpers (BCP-001)",
    contractImpact: "roles, enums, partner_profiles",
  },
  {
    version: "20260722110000",
    filename: "20260722110000_partner_applications_profiles_codes.sql",
    purpose: "Applications + codes (BCP-002..004)",
    contractImpact: "partner_applications, partner_codes",
  },
  {
    version: "20260722120000",
    filename: "20260722120000_partner_leads_and_sales.sql",
    purpose: "partner_leads/sales — not marketing leads (BCP-005..006)",
    contractImpact: "partner_leads, partner_sales",
  },
  {
    version: "20260722130000",
    filename: "20260722130000_partner_commissions_and_ledger.sql",
    purpose: "Commissions + balanced append-only ledger (BCP-007, 010)",
    contractImpact: "partner_commissions, partner_ledger_*",
  },
  {
    version: "20260722140000",
    filename: "20260722140000_partner_payouts.sql",
    purpose: "Payout requests + payouts (BCP-008)",
    contractImpact: "partner_payout_requests, partner_payouts",
  },
  {
    version: "20260722150000",
    filename: "20260722150000_partner_cash_receipts_adjustments.sql",
    purpose: "Cash receipts + adjustments (BCP-010)",
    contractImpact: "partner_cash_receipts, partner_adjustments",
  },
  {
    version: "20260722160000",
    filename: "20260722160000_partner_rls_and_rpcs.sql",
    purpose: "RLS + partner mutation RPCs + grants",
    contractImpact: "RPC surface, RLS",
  },
  {
    version: "20260722170000",
    filename: "20260722170000_partner_verify_contracts.sql",
    purpose: "verify_partner_admin_contracts",
    contractImpact: "contract verifier RPC",
  },
] as const;

const REQUIRED_TABLES = [
  "partner_profiles",
  "partner_applications",
  "partner_codes",
  "partner_leads",
  "partner_sales",
  "partner_commissions",
  "partner_payout_requests",
  "partner_payouts",
  "partner_ledger_transactions",
  "partner_ledger_entries",
  "partner_cash_receipts",
  "partner_adjustments",
] as const;

const REQUIRED_RPCS = [
  "submit_partner_application",
  "review_partner_application",
  "create_partner_lead",
  "review_partner_lead",
  "confirm_partner_sale",
  "request_partner_payout",
  "approve_partner_payout_request",
  "record_partner_payout_paid",
  "record_partner_cash_receipt",
  "process_partner_refund_adjustment",
  "partner_financial_summary",
  "partner_available_liability_cents",
  "verify_partner_admin_contracts",
] as const;

const STORAGE_BUCKETS = [
  "customer-documents",
  "invoice-documents",
  "product-media",
  "project-files",
  "quote-documents",
  "support-attachments",
] as const;

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function sha256Text(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function psql(sql: string): string {
  return execFileSync(
    "docker",
    [
      "exec",
      "-i",
      CONTAINER,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-At",
      "-F",
      "\t",
      "-c",
      sql,
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ).trim();
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function writeJson(rel: string, data: unknown) {
  const p = join(BUNDLE_DIR, rel);
  mkdirSync(resolve(p, ".."), { recursive: true });
  const body = JSON.stringify(data, null, 2) + "\n";
  writeFileSync(p, body, "utf8");
  return { path: p, sha256: sha256Text(body) };
}

function main() {
  console.log("=== Generate contract RC1 bundle ===");
  assert(PARTNER_MIGRATIONS.length === 8, "expected exactly 8 partner migrations");

  const migDir = resolve("supabase/migrations");
  const allVersions = readdirSync(migDir)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => f.slice(0, 14))
    .sort();
  assert(
    allVersions[allVersions.length - 1] === "20260722170000",
    `highest migration must be 20260722170000 got ${allVersions[allVersions.length - 1]}`,
  );
  const versionSet = new Set(allVersions);
  assert(versionSet.size === allVersions.length, "duplicate migration versions");

  const migrationManifest = PARTNER_MIGRATIONS.map((m) => {
    const path = join(migDir, m.filename);
    assert(existsSync(path), `missing ${m.filename}`);
    return {
      version: m.version,
      filename: m.filename,
      sha256: sha256File(path),
      purpose: m.purpose,
      contractImpact: m.contractImpact,
    };
  });

  mkdirSync(BUNDLE_DIR, { recursive: true });

  const typesSrc = resolve("src/types/database.partner-rc1.ts");
  assert(existsSync(typesSrc), "missing generated types src/types/database.partner-rc1.ts");
  const typesDest = join(BUNDLE_DIR, "database.types.ts");
  copyFileSync(typesSrc, typesDest);
  const typesSha = sha256File(typesDest);

  const manifest = writeJson("manifest.json", {
    contractVersion: CONTRACT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    minimumCompatibleClientVersion: MIN_CLIENT,
    generatedAt: "local-freeze",
    sourceHeadHint: "shared-partner-backend-rc1",
    unpublished: true,
  });

  const roles = writeJson("roles.json", {
    sharedRoles: [
      "customer",
      "partner_pending",
      "partner",
      "staff",
      "admin",
      "owner",
    ],
    encoding: {
      customer: "organization_members",
      partner_pending: "partner_profiles.status=PENDING",
      partner: "partner_profiles.status=ACTIVE",
      staff: "admin_roles + is_staff_admin()",
      admin: "admin_roles.role=ADMIN",
      owner: "admin_roles.role=OWNER",
    },
  });

  const enums = writeJson("enums.json", {
    partner_application_status: [
      "DRAFT",
      "SUBMITTED",
      "IN_REVIEW",
      "APPROVED",
      "REJECTED",
      "WITHDRAWN",
    ],
    partner_profile_status: ["PENDING", "ACTIVE", "SUSPENDED", "REVOKED"],
    partner_code_status: ["ACTIVE", "REVOKED", "EXPIRED"],
    partner_lead_status: [
      "NEW",
      "IN_REVIEW",
      "ASSIGNED",
      "CONVERTED",
      "REJECTED",
      "CLOSED",
    ],
    partner_sale_status: [
      "PENDING",
      "CONFIRMED",
      "SETTLED",
      "CANCELLED",
      "REVERSED",
    ],
    partner_commission_status: [
      "PENDING",
      "ELIGIBLE",
      "APPROVED",
      "PAID",
      "REVERSED",
      "ADJUSTED",
    ],
    partner_payout_request_status: [
      "REQUESTED",
      "APPROVED",
      "REJECTED",
      "CANCELLED",
    ],
    partner_payout_status: ["PENDING", "PAID", "FAILED", "CANCELLED"],
    partner_ledger_account: [
      "COMMISSION_LIABILITY",
      "PAYOUT_CLEARING",
      "CASH",
      "ADJUSTMENT",
      "REVENUE_CLEARING",
    ],
  });

  const rpcs = writeJson("rpcs.json", {
    count: REQUIRED_RPCS.length,
    rpcs: REQUIRED_RPCS.map((name) => ({ name })),
  });

  const errors = writeJson("error-codes.json", {
    codes: [
      "AUTH_REQUIRED",
      "AUTH_NO_ACCESS",
      "FORBIDDEN",
      "NOT_FOUND",
      "CONFLICT",
      "VALIDATION_FAILED",
      "CHECKOUT_DISABLED",
      "CONTRACT_DRIFT",
      "partner_ledger_unbalanced",
      "partner_ledger_immutable",
      "partner_payout_paid_immutable",
    ],
  });

  const flags = writeJson("feature-flags.json", {
    CHECKOUT_ENABLED: { default: false, notes: "fail-closed" },
    P05_MIGRATION_APPLIED: { default: "unset", notes: "operator hint only" },
  });

  const storage = writeJson("storage-buckets.json", {
    count: STORAGE_BUCKETS.length,
    buckets: STORAGE_BUCKETS.map((id) => ({
      id,
      public: false,
    })),
    notes: "No 7th marketing_assets bucket in RC1 (BCP-009 deferred)",
  });

  const financial = writeJson("financial-invariants.json", {
    invariants: [
      "one_commission_per_partner_sale",
      "ledger_append_only",
      "ledger_balanced_debit_eq_credit",
      "available_liability_non_negative_floor",
      "payout_capped_by_available_liability",
      "paid_payout_immutable",
      "refund_after_payout_via_adjustment",
      "no_client_financial_authority",
      "cash_receipt_staff_only_idempotent",
    ],
    calculationRuleVersion: "v1_flat_bps",
  });

  const migrations = writeJson("migration-manifest.json", {
    partnerMigrationCount: 8,
    highestVersion: "20260722170000",
    outsideProductionBaselineEndingAt: "20260719170000",
    migrations: migrationManifest,
  });

  const tables = writeJson("tables.json", {
    partnerTables: REQUIRED_TABLES,
    marketingLeadsUntouched: true,
  });

  writeFileSync(
    join(BUNDLE_DIR, "RELEASE_NOTES.md"),
    `# vdb-backend-contract@0.2.0-rc.1

Additive partner/affiliate backend for shared staging RC1.

## Includes

- Partner identity, applications, codes, leads, sales
- Commissions, balanced ledger, payouts, cash receipts, adjustments
- RLS + SECURITY DEFINER RPCs
- schemaVersion \`${SCHEMA_VERSION}\`

## Deferred

- BCP-STAGING-009 marketing assets / 7th Storage bucket
- BCP-STAGING-011 partner reviews

## Not authorized

- Production apply (exact-17 baseline unchanged)
- Package registry publish
- Staging project creation (separate authorization)

## Consumers

Pin:

\`\`\`text
VDB_BACKEND_CONTRACT=${CONTRACT_VERSION}
VDB_SCHEMA_VERSION=${SCHEMA_VERSION}
\`\`\`

Verify types SHA256 against \`checksums.json\` → \`database.types.ts\`.
`,
    "utf8",
  );

  writeFileSync(
    join(BUNDLE_DIR, "CONSUMER_VERIFICATION.md"),
    `# Consumer verification — ${CONTRACT_VERSION}

1. Confirm \`schemaVersion\` equals \`${SCHEMA_VERSION}\`.
2. Compare \`database.types.ts\` SHA256 to \`checksums.json\`.
3. Confirm RPC names in \`rpcs.json\` exist on the target environment.
4. Confirm Storage bucket list equals six private buckets in \`storage-buckets.json\`.
5. Do not invent parallel partner tables or client-authoritative commission math.
6. Fail-closed hide marketing assets and reviews until BCP-009/011 land.
`,
    "utf8",
  );

  // Drift check against local DB
  console.log("=== Drift check vs local DB ===");
  const verifyFails = psql(
    `SELECT check_name FROM public.verify_partner_admin_contracts() WHERE ok IS NOT TRUE;`,
  );
  assert(verifyFails === "", `verify RPC failures: ${verifyFails}`);

  for (const t of REQUIRED_TABLES) {
    const exists = psql(
      `SELECT to_regclass('public.${t}') IS NOT NULL;`,
    );
    assert(exists === "t", `missing table ${t}`);
  }

  for (const rpc of REQUIRED_RPCS) {
    const n = psql(
      `SELECT COUNT(*)::text FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='${rpc}';`,
    );
    assert(Number(n) >= 1, `missing rpc ${rpc}`);
  }

  const bucketCount = psql(
    `SELECT COUNT(*)::text FROM storage.buckets WHERE id = ANY(ARRAY[${STORAGE_BUCKETS.map((b) => `'${b}'`).join(",")}]);`,
  );
  assert(bucketCount === "6", `expected 6 storage buckets got ${bucketCount}`);

  const extraBuckets = psql(
    `SELECT COUNT(*)::text FROM storage.buckets WHERE id NOT IN (${STORAGE_BUCKETS.map((b) => `'${b}'`).join(",")});`,
  );
  assert(extraBuckets === "0", `unexpected extra buckets: ${extraBuckets}`);

  // Enum spot-check
  const profileStatuses = psql(
    `SELECT string_agg(enumlabel, ',' ORDER BY enumsortorder) FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='partner_profile_status';`,
  );
  assert(
    profileStatuses === "PENDING,ACTIVE,SUSPENDED,REVOKED",
    `profile status drift: ${profileStatuses}`,
  );

  const partnerRpcCount = Number(
    psql(
      `SELECT COUNT(DISTINCT p.proname)::text FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname LIKE 'partner_%' OR p.proname LIKE '%partner_%';`,
    ),
  );
  // soft: known set must exist; unknown partner_* from this domain already covered

  const checksums: Record<string, string> = {
    contractVersion: CONTRACT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    "database.types.ts": typesSha,
    "manifest.json": manifest.sha256,
    "roles.json": roles.sha256,
    "enums.json": enums.sha256,
    "rpcs.json": rpcs.sha256,
    "error-codes.json": errors.sha256,
    "feature-flags.json": flags.sha256,
    "storage-buckets.json": storage.sha256,
    "financial-invariants.json": financial.sha256,
    "migration-manifest.json": migrations.sha256,
    "tables.json": tables.sha256,
  };
  for (const m of migrationManifest) {
    checksums[`migrations/${m.filename}`] = m.sha256;
  }

  writeFileSync(
    join(BUNDLE_DIR, "checksums.json"),
    JSON.stringify(checksums, null, 2) + "\n",
    "utf8",
  );

  // Reproduce typehash
  assert(sha256File(typesDest) === typesSha, "typehash not reproducible");

  const bundleFiles = readdirSync(BUNDLE_DIR).sort();
  const bundleConcat = bundleFiles
    .map((f) => `${f}:${sha256File(join(BUNDLE_DIR, f))}`)
    .join("\n");
  const bundleSha = sha256Text(bundleConcat + "\n");
  writeFileSync(
    join(BUNDLE_DIR, "BUNDLE_SHA256.txt"),
    `${bundleSha}\n`,
    "utf8",
  );

  // Also mirror migration manifest to docs/artifacts for freeze evidence
  mkdirSync(resolve("docs/artifacts"), { recursive: true });
  writeFileSync(
    resolve("docs/artifacts/partner-rc1-migration-manifest.json"),
    JSON.stringify(
      {
        contractVersion: CONTRACT_VERSION,
        schemaVersion: SCHEMA_VERSION,
        migrations: migrationManifest,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );

  console.log("BACKEND CONTRACT RC1 DRIFT CHECK PASS");
  console.log(`BUNDLE_DIR=${BUNDLE_DIR}`);
  console.log(`BUNDLE_SHA256=${bundleSha}`);
  console.log(`TYPES_SHA256=${typesSha}`);
  console.log(`partnerRpcProbe=${partnerRpcCount}`);
}

main();
