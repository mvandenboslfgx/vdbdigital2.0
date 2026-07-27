/**
 * Local verify for messaging/support/appointments owner contract rc.3.
 * Uses only supabase_db_vdbdigital2. No remote. No sibling containers.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";

const CONTAINER = "supabase_db_vdbdigital2";
const BUNDLE = resolve("contracts/releases/vdb-backend-contract-0.2.0-rc.3");
const EXPECTED_CONTRACT = "vdb-backend-contract@0.2.0-rc.3";
const EXPECTED_SCHEMA = "2026.07.25.messaging-support-appointments-rc3";

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

function sha256File(path: string) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

async function main() {
  console.log("=== Messaging/Support/Appointments contract verify (rc.3) ===");

  const manifest = JSON.parse(readFileSync(join(BUNDLE, "manifest.json"), "utf8"));
  assert(manifest.contractVersion === EXPECTED_CONTRACT, `contractVersion drift: ${manifest.contractVersion}`);
  assert(manifest.schemaVersion === EXPECTED_SCHEMA, `schemaVersion drift: ${manifest.schemaVersion}`);
  console.log(`MANIFEST: ${manifest.contractVersion} / ${manifest.schemaVersion}`);

  // Ensure local DB container exists
  const running = execFileSync("docker", ["ps", "--format", "{{.Names}}"], { encoding: "utf8" });
  assert(running.includes(CONTAINER), `Local container ${CONTAINER} not running`);

  const failures = psql(
    `SELECT check_name || '|' || COALESCE(detail,'') FROM public.verify_messaging_support_appointments_contracts() WHERE ok IS NOT TRUE;`,
  );
  assert(failures === "", `verify_messaging_support_appointments_contracts failures:\n${failures}`);
  console.log("DB VERIFIER RPC: PASS");

  // Explicit rc.2 regression object presence
  const rc2 = psql(`
SELECT string_agg(name, ',') FROM (VALUES
  ('portal_projects'),('portal_quotes'),('portal_quote_items'),('portal_invoices'),
  ('portal_files'),('partner_commissions')
) AS t(name)
WHERE to_regclass('public.' || name) IS NULL;
`);
  assert(rc2 === "", `rc.2 surfaces missing: ${rc2}`);
  console.log("RC2 SURFACES: PASS");

  // Checksums for bundle JSON artifacts
  const files = readdirSync(BUNDLE)
    .filter((f) => f.endsWith(".json") || f.endsWith(".md") || f.endsWith(".ts") || f.endsWith(".txt"))
    .sort();
  const checksums: Record<string, string> = {};
  for (const f of files) {
    if (f === "checksums.json" || f === "BUNDLE_SHA256.txt") continue;
    checksums[f] = sha256File(join(BUNDLE, f));
  }
  writeFileSync(join(BUNDLE, "checksums.json"), JSON.stringify(checksums, null, 2) + "\n");
  const bundleHash = createHash("sha256")
    .update(
      Object.keys(checksums)
        .sort()
        .map((k) => `${k}:${checksums[k]}`)
        .join("\n"),
    )
    .digest("hex");
  writeFileSync(join(BUNDLE, "BUNDLE_SHA256.txt"), bundleHash + "\n");

  mkdirSync(resolve("docs/artifacts"), { recursive: true });
  writeFileSync(
    resolve("docs/artifacts/messaging-support-appointments-rc3-verify.json"),
    JSON.stringify(
      {
        at: new Date().toISOString(),
        contractVersion: EXPECTED_CONTRACT,
        schemaVersion: EXPECTED_SCHEMA,
        dbVerifier: "PASS",
        rc2Surfaces: "PASS",
        bundleSha256: bundleHash,
        container: CONTAINER,
      },
      null,
      2,
    ) + "\n",
  );

  console.log(`BUNDLE_SHA256: ${bundleHash}`);
  console.log("CONTRACT VERIFY: PASS");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
