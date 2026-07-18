/**
 * Verify catalog admin database contracts (fail-closed).
 *
 * Usage:
 *   npm run db:verify-catalog-admin
 *
 * Does not enable checkout. Never prints secrets.
 * Exit: 0 PASS | 1 FAIL | 2 SKIPPED (no credentials)
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./lib/env-loader";
import { getSupabaseSecretKey } from "./lib/supabase-secret";
import {
  CATALOG_ADMIN_MIGRATION_FILES,
  evaluateCatalogContractResults,
  formatCatalogEvidenceBlock,
  type CatalogVerifyCheck,
} from "./lib/catalog-admin-contracts";

loadEnvLocal();

type RpcRow = { check_name: string; ok: boolean; detail: string | null };

function envLabel(): string {
  return (
    process.env.CATALOG_VERIFY_ENV_LABEL ||
    process.env.VERCEL_ENV ||
    process.env.NODE_ENV ||
    "local"
  );
}

function sha256File(path: string): string {
  const buf = readFileSync(path);
  return createHash("sha256").update(buf).digest("hex");
}

function verifyRepoMigrations(): CatalogVerifyCheck[] {
  const checks: CatalogVerifyCheck[] = [];
  for (const file of CATALOG_ADMIN_MIGRATION_FILES) {
    const full = resolve(process.cwd(), file);
    const present = existsSync(full);
    checks.push({
      name: `repo:${file.split("/").pop()}`,
      ok: present,
      detail: present ? `sha256=${sha256File(full).slice(0, 16)}…` : "missing from repository",
    });
  }
  return checks;
}

async function probeVerifyRpc(
  supabase: SupabaseClient,
): Promise<{ rows: CatalogVerifyCheck[]; rpcAvailable: boolean }> {
  const { data, error } = await supabase.rpc("catalog_verify_admin_contracts");

  if (error) {
    const msg = error.message.toLowerCase();
    const missing =
      msg.includes("could not find") ||
      msg.includes("not find the function") ||
      msg.includes("catalog_verify_admin_contracts");
    return {
      rpcAvailable: false,
      rows: [
        {
          name: "rpc:catalog_verify_admin_contracts",
          ok: false,
          detail: missing
            ? "verification RPC missing — apply catalog admin migrations (not yet applied in hygiene step)"
            : error.message,
        },
      ],
    };
  }

  const rows: CatalogVerifyCheck[] = ((data as RpcRow[]) ?? []).map((r) => ({
    name: r.check_name,
    ok: Boolean(r.ok),
    detail: r.detail ?? undefined,
  }));

  rows.unshift({
    name: "rpc:catalog_verify_admin_contracts",
    ok: true,
    detail: "invoked",
  });

  return { rows, rpcAvailable: true };
}

async function anonCannotCallVerifier(
  url: string,
  publicKey: string | undefined,
): Promise<CatalogVerifyCheck> {
  if (!publicKey) {
    return {
      name: "security:anon_cannot_execute_catalog_verifier",
      ok: false,
      detail: "public Supabase key missing — cannot prove anon is denied",
    };
  }
  const anon = createClient(url, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await anon.rpc("catalog_verify_admin_contracts");
  const denied = Boolean(error);
  return {
    name: "security:anon_cannot_execute_catalog_verifier",
    ok: denied,
    detail: denied
      ? `anon denied (${error?.message?.slice(0, 80) ?? "error"})`
      : "anon executed catalog_verify_admin_contracts — FAIL",
  };
}

function writeEvidence(summary: ReturnType<typeof evaluateCatalogContractResults>): void {
  if (process.env.CATALOG_VERIFY_WRITE_EVIDENCE !== "1") return;
  const dir = resolve(process.cwd(), "docs/evidence");
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const path = resolve(dir, `catalog-admin-verify-${stamp}.md`);
  writeFileSync(
    path,
    formatCatalogEvidenceBlock(summary, {
      environment: envLabel(),
      runAt: new Date().toISOString(),
      gitCommit: process.env.VERCEL_GIT_COMMIT_SHA,
    }),
    "utf8",
  );
  console.log(`Evidence written: ${path}`);
}

async function main(): Promise<void> {
  console.log("=== Catalog Admin Contract Verifier ===");
  console.log(`Environment: ${envLabel()}`);
  console.log("CHECKOUT_ENABLED is not modified.");
  console.log("P05_MIGRATION_APPLIED is not modified.");
  console.log("");

  const repoChecks = verifyRepoMigrations();
  for (const c of repoChecks) {
    console.log(`${c.ok ? "PASS" : "FAIL"} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
  }
  if (repoChecks.some((c) => !c.ok)) {
    console.log("\nRESULT: FAIL — repository migration files incomplete");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getSupabaseSecretKey();

  if (!url || !key) {
    console.log("\nRESULT: SKIPPED — Supabase credentials not configured");
    console.log("Repo migration files + checksums OK. Connect a dry-run DB to complete RPC verification.");
    process.exit(2);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { rows, rpcAvailable } = await probeVerifyRpc(supabase);

  if (!rpcAvailable) {
    for (const c of rows) {
      console.log(`${c.ok ? "PASS" : "FAIL"} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
    }
    console.log("\nRESULT: FAIL — catalog verification RPC missing");
    console.log("Do NOT claim schema PASS. Apply catalog migrations on a dry-run DB first.");
    writeEvidence(evaluateCatalogContractResults(rows));
    process.exit(1);
  }

  const allRows = [...rows];
  allRows.push(
    await anonCannotCallVerifier(
      url,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
  );

  const summary = evaluateCatalogContractResults(allRows);
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
    writeEvidence(summary);
    process.exit(1);
  }

  console.log("RESULT: PASS — catalog admin contracts verified");
  writeEvidence(summary);
  process.exit(0);
}

main().catch((err) => {
  console.error("RESULT: FAIL — unexpected verifier error");
  console.error(err instanceof Error ? err.message : "unknown");
  process.exit(1);
});
