/**
 * Verify P0/P0.5 payment integrity database contracts (fail-closed).
 *
 * Usage:
 *   npm run db:verify-p0-payments
 *   P05_VERIFY_BEHAVIORAL=1 npm run db:verify-p0-payments
 *
 * Does not enable checkout. Never prints secrets.
 * Exit codes: 0 PASS | 1 FAIL | 2 SKIPPED (no credentials)
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./lib/env-loader";
import { getSupabaseSecretKey } from "./lib/supabase-secret";
import {
  BEHAVIORAL_CONTRACT_CHECKS,
  evaluateContractResults,
  formatEvidenceBlock,
  P0_PAYMENT_MIGRATION_FILES,
  REQUIRED_CONTRACT_CHECKS,
  type VerifyCheck,
} from "./lib/p0-payment-contracts";

loadEnvLocal();

type RpcRow = { check_name: string; ok: boolean; detail: string | null };

function envLabel(): string {
  return (
    process.env.P05_VERIFY_ENV_LABEL ||
    process.env.VERCEL_ENV ||
    process.env.NODE_ENV ||
    "local"
  );
}

function requireBehavioral(): boolean {
  return process.env.P05_VERIFY_BEHAVIORAL === "1";
}

function writeEvidence(summary: ReturnType<typeof evaluateContractResults>): void {
  if (process.env.P05_VERIFY_WRITE_EVIDENCE !== "1") return;
  const dir = resolve(process.cwd(), "docs/evidence");
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const path = resolve(dir, `p05-migration-verify-${stamp}.md`);
  const body = formatEvidenceBlock(summary, {
    environment: envLabel(),
    runAt: new Date().toISOString(),
    behavioral: requireBehavioral(),
  });
  writeFileSync(path, body, "utf8");
  console.log(`Evidence written: ${path}`);
}

function verifyRepoMigrations(): VerifyCheck[] {
  const checks: VerifyCheck[] = [];
  for (const file of P0_PAYMENT_MIGRATION_FILES) {
    const full = resolve(process.cwd(), file);
    checks.push({
      name: `repo:${file.split("/").pop()}`,
      ok: existsSync(full),
      detail: existsSync(full) ? "present" : "missing from repository",
    });
  }
  return checks;
}

async function probeVerifyRpc(
  supabase: SupabaseClient,
  behavioral: boolean,
): Promise<{ rows: VerifyCheck[]; rpcAvailable: boolean }> {
  const { data, error } = await supabase.rpc("p05_verify_payment_contracts", {
    p_run_behavioral: behavioral,
  });

  if (error) {
    const msg = error.message.toLowerCase();
    const missing =
      msg.includes("could not find") ||
      msg.includes("not find the function") ||
      msg.includes("p05_verify_payment_contracts");
    return {
      rpcAvailable: !missing,
      rows: [
        {
          name: "rpc:p05_verify_payment_contracts",
          ok: false,
          detail: missing
            ? "verification RPC missing — apply 20260716020000_p05_verify_payment_contracts.sql (and prior P0 migrations)"
            : error.message,
        },
      ],
    };
  }

  const rows: VerifyCheck[] = ((data as RpcRow[]) ?? []).map((r) => ({
    name: r.check_name,
    ok: Boolean(r.ok),
    detail: r.detail ?? undefined,
  }));

  rows.unshift({
    name: "rpc:p05_verify_payment_contracts",
    ok: true,
    detail: behavioral ? "schema+behavioral" : "schema-only",
  });

  return { rows, rpcAvailable: true };
}

/** Client-side concurrency smoke when SQL behavioral is on and RPC exists */
async function clientConcurrencySmoke(
  supabase: SupabaseClient,
): Promise<VerifyCheck> {
  const key = `p05-client-concurrency-${Date.now()}`;
  const limit = 5;
  const requests = 20;
  const results = await Promise.all(
    Array.from({ length: requests }, () =>
      supabase.rpc("check_rate_limit", {
        p_key: key,
        p_limit: limit,
        p_window_seconds: 60,
      }),
    ),
  );

  let allowed = 0;
  let denied = 0;
  let errors = 0;
  for (const r of results) {
    if (r.error) {
      errors += 1;
      continue;
    }
    const row = Array.isArray(r.data) ? r.data[0] : r.data;
    if (row && typeof row === "object" && "allowed" in row) {
      if ((row as { allowed: boolean }).allowed) allowed += 1;
      else denied += 1;
    } else {
      errors += 1;
    }
  }

  // Under advisory lock, allowed must equal limit (not exceed)
  const ok = errors === 0 && allowed === limit && denied === requests - limit;
  return {
    name: "behavioral:client_rate_limit_concurrency",
    ok,
    detail: `allowed=${allowed} denied=${denied} errors=${errors} (expect allowed=${limit})`,
  };
}

async function anonCannotCallLimiter(
  url: string,
  publicKey: string | undefined,
): Promise<VerifyCheck> {
  if (!publicKey) {
    return {
      name: "security:anon_cannot_execute_check_rate_limit",
      ok: false,
      detail: "public Supabase key missing — cannot prove anon is denied",
    };
  }
  const anon = createClient(url, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await anon.rpc("check_rate_limit", {
    p_key: "p05-anon-probe",
    p_limit: 1,
    p_window_seconds: 60,
  });
  // Expect permission denied / not found for anon
  const denied = Boolean(error);
  return {
    name: "security:anon_cannot_execute_check_rate_limit",
    ok: denied,
    detail: denied
      ? `anon denied (${error?.message?.slice(0, 80) ?? "error"})`
      : "anon was able to execute check_rate_limit — FAIL",
  };
}

async function main(): Promise<void> {
  const repoChecks = verifyRepoMigrations();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getSupabaseSecretKey();
  const behavioral = requireBehavioral();

  console.log("=== P0.5 Payment Integrity Contract Verifier ===");
  console.log(`Environment: ${envLabel()}`);
  console.log(`Behavioral: ${behavioral ? "ON" : "OFF (set P05_VERIFY_BEHAVIORAL=1 for full gate)"}`);
  console.log("CHECKOUT_ENABLED is not modified by this script.");
  console.log("");

  for (const c of repoChecks) {
    console.log(`${c.ok ? "PASS" : "FAIL"} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
  }

  if (repoChecks.some((c) => !c.ok)) {
    console.log("\nRESULT: FAIL — repository migration files incomplete");
    process.exit(1);
  }

  if (!url || !key) {
    console.log("\nRESULT: SKIPPED — Supabase credentials not configured");
    console.log("Configure NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY to verify a database.");
    process.exit(2);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { rows, rpcAvailable } = await probeVerifyRpc(supabase, behavioral);
  const allRows = [...rows];

  if (!rpcAvailable) {
    const summary = evaluateContractResults(allRows, { requireBehavioral: behavioral });
    for (const c of allRows) {
      console.log(`${c.ok ? "PASS" : "FAIL"} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
    }
    console.log("\nRESULT: FAIL — cannot verify contracts without p05_verify_payment_contracts RPC");
    console.log("Apply migrations in order:");
    for (const f of P0_PAYMENT_MIGRATION_FILES) console.log(`  - ${f}`);
    writeEvidence(summary);
    process.exit(1);
  }

  // Extra TS-side checks (not substitutes for SQL contracts)
  allRows.push(
    await anonCannotCallLimiter(
      url,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
  );

  if (behavioral) {
    allRows.push(await clientConcurrencySmoke(supabase));
  }

  const summary = evaluateContractResults(allRows, { requireBehavioral: behavioral });

  // Print SQL + extra checks
  for (const c of allRows) {
    console.log(`${c.ok ? "PASS" : "FAIL"} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
  }

  if (summary.missingRequired.length > 0) {
    console.log("\nMissing required contract checks:");
    for (const name of summary.missingRequired) console.log(`  - ${name}`);
  }

  console.log("");
  if (!summary.ok) {
    console.log(`RESULT: FAIL (${summary.failed.length} failing checks)`);
    console.log("Do NOT set P05_MIGRATION_APPLIED=1.");
    writeEvidence(summary);
    process.exit(1);
  }

  if (!behavioral) {
    console.log("RESULT: PASS (schema contracts)");
    console.log("Schema OK, but full gate still requires:");
    console.log("  P05_VERIFY_BEHAVIORAL=1 npm run db:verify-p0-payments");
    console.log("Do NOT set P05_MIGRATION_APPLIED=1 until behavioral PASS.");
    writeEvidence(summary);
    process.exit(0);
  }

  // Ensure all behavioral names present
  const behavioralMissing = BEHAVIORAL_CONTRACT_CHECKS.filter(
    (n) => !allRows.some((r) => r.name === n && r.ok),
  );
  if (behavioralMissing.length > 0) {
    console.log(`RESULT: FAIL — behavioral incomplete: ${behavioralMissing.join(", ")}`);
    writeEvidence({
      ...summary,
      ok: false,
      failed: [
        ...summary.failed,
        ...behavioralMissing.map((name) => ({
          name,
          ok: false,
          detail: "missing or failed",
        })),
      ],
    });
    process.exit(1);
  }

  console.log("RESULT: PASS — schema + behavioral contracts verified");
  console.log("Operator may now set P05_MIGRATION_APPLIED=1 after archiving this output.");
  console.log(`Required schema checks covered: ${REQUIRED_CONTRACT_CHECKS.length}`);
  writeEvidence(summary);
  process.exit(0);
}

main().catch((err) => {
  console.error("RESULT: FAIL — unexpected verifier error");
  console.error(err instanceof Error ? err.message : "unknown");
  process.exit(1);
});
