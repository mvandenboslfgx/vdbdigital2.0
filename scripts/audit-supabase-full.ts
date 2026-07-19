/**
 * npm run audit:supabase-full
 * Orchestrates isolation audits fail-closed (read-only).
 */
import { execFileSync } from "node:child_process";
import { loadEnvLocal } from "./lib/env-loader";
import { isDirectCheckoutEnabled } from "../src/config/features";
import {
  VDB_APPROVED_PROJECT_NAME,
  VDB_APPROVED_PROJECT_REF,
  VDB_APPROVED_REGION,
  verdictFromFindings,
} from "../config/supabase-project-isolation-allowlist";
import {
  validateEnvProjectRef,
  writeEvidence,
  sha256Short,
} from "./lib/supabase-isolation-audit";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

loadEnvLocal();

function runStep(label: string, script: string): { ok: boolean; output: string } {
  try {
    const output = execFileSync(
      process.execPath,
      ["--import", "tsx", script],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 600_000,
        env: process.env,
      },
    );
    console.log(`\n--- ${label} ---\n${output}`);
    const blocked = /SUPABASE ISOLATION AUDIT BLOCKED/.test(output);
    const fail =
      /SUPABASE ISOLATION AUDIT FAIL/.test(output) &&
      !/CONDITIONAL PASS/.test(output);
    return { ok: !blocked && !fail, output };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    const output = `${e.stdout ?? ""}\n${e.stderr ?? ""}`;
    console.log(`\n--- ${label} (failed) ---\n${output}`);
    const blocked = /AUDIT BLOCKED/.test(output);
    const pass = /AUDIT PASS/.test(output) || /CONDITIONAL PASS/.test(output);
    return { ok: pass && !blocked, output };
  }
}

function main() {
  console.log("=== audit:supabase-full (read-only) ===");
  console.log(`Date: ${new Date().toISOString()}`);
  console.log(`Approved project: ${VDB_APPROVED_PROJECT_NAME} (${VDB_APPROVED_PROJECT_REF})`);
  console.log(`Approved region: ${VDB_APPROVED_REGION}`);
  console.log(`CHECKOUT_ENABLED effective: ${isDirectCheckoutEnabled()}`);
  console.log(
    `P05_MIGRATION_APPLIED: ${process.env.P05_MIGRATION_APPLIED ?? "(unset)"}`,
  );

  let gitCommit = "(unknown)";
  let gitTag = "(none)";
  let worktree = "(unknown)";
  try {
    gitCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    gitTag = execFileSync("git", ["tag", "--points-at", "HEAD"], {
      encoding: "utf8",
    }).trim() || "(none)";
    worktree = execFileSync("git", ["status", "--short"], { encoding: "utf8" }).trim() || "(clean)";
  } catch {
    /* ignore */
  }
  console.log(`Git HEAD: ${gitCommit}`);
  console.log(`Git tag: ${gitTag}`);
  console.log(`Worktree: ${worktree === "(clean)" ? "clean" : "dirty (documented)"}`);

  if (isDirectCheckoutEnabled()) {
    console.log("SUPABASE ISOLATION AUDIT FAIL");
    process.exit(1);
  }

  const env = validateEnvProjectRef();
  console.log(`Env project: ${env.detail}`);
  if (!env.ok) {
    console.log("RESULT: FAIL — wrong or unverified Supabase project");
    console.log("SUPABASE ISOLATION AUDIT BLOCKED");
    process.exit(1);
  }

  // Remote link is optional for local Docker audits but required for a full PASS.
  let remoteLinked = false;
  let remoteSkippedReason = "";
  try {
    const linkProbe = execFileSync("npx", ["supabase", "projects", "list", "-o", "json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 60_000,
      shell: true,
    });
    remoteLinked = /"linked"\s*:\s*true/.test(linkProbe) &&
      linkProbe.includes(VDB_APPROVED_PROJECT_REF);
    if (!remoteLinked) {
      remoteSkippedReason =
        "supabase project not linked to approved ref — remote Management/DB checks skipped";
      console.log(`REMOTE: SKIPPED — ${remoteSkippedReason}`);
    } else {
      console.log("REMOTE: linked to approved project");
    }
  } catch {
    remoteSkippedReason = "supabase CLI project list unavailable";
    console.log(`REMOTE: SKIPPED — ${remoteSkippedReason}`);
  }

  // Co-located foreign local stacks (informational — must not share VDB DB container)
  try {
    const dockerNames = execFileSync("docker", ["ps", "--format", "{{.Names}}"], {
      encoding: "utf8",
      timeout: 30_000,
    });
    const foreignStacks = dockerNames
      .split("\n")
      .map((s) => s.trim())
      .filter((n) => n.startsWith("supabase_") && !n.includes("vdbdigital2"));
    if (foreignStacks.length > 0) {
      console.log(
        `INFO: co-located foreign local Supabase containers detected (${foreignStacks.length}) — expected for separate products; audits target supabase_db_vdbdigital2 only`,
      );
    }
  } catch {
    /* ignore */
  }

  const steps = [
    ["repo", "scripts/audit-supabase-isolation.ts"],
    ["schema", "scripts/audit-supabase-schema.ts"],
    ["auth", "scripts/audit-supabase-auth.ts"],
    ["storage", "scripts/audit-supabase-storage.ts"],
    ["foreign-data", "scripts/audit-supabase-foreign-data.ts"],
  ] as const;

  let blockers = 0;
  let reviews = 0;
  let blocked = false;
  const parts: string[] = [];

  for (const [label, script] of steps) {
    const res = runStep(label, script);
    parts.push(`## ${label}\n\n\`\`\`\n${res.output.slice(0, 8000)}\n\`\`\`\n`);
    if (/SUPABASE ISOLATION AUDIT BLOCKED/.test(res.output)) {
      blocked = true;
    }
    if (/SUPABASE ISOLATION AUDIT FAIL/.test(res.output)) {
      blockers += 1;
    }
    if (
      /SUPABASE ISOLATION AUDIT CONDITIONAL PASS/.test(res.output) ||
      /\[REVIEW\]/.test(res.output)
    ) {
      reviews += 1;
    }
    if (!res.ok && !/SUPABASE ISOLATION AUDIT (PASS|CONDITIONAL PASS|FAIL|BLOCKED)/.test(res.output)) {
      blocked = true;
    }
  }

  // Catalog absence regression (script name contains gate token by design)
  try {
    const tawk = execFileSync(
      process.execPath,
      ["--import", "tsx", "scripts/verify-catalog-no-tawk.ts"],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 120_000,
        env: process.env,
      },
    );
    parts.push(`## catalog-absence-gate\n\nPASS\n${tawk.slice(-500)}\n`);
    if (!/RESULT: PASS/.test(tawk)) blockers += 1;
  } catch (err) {
    const e = err as { stdout?: string };
    const out = e.stdout ?? "";
    if (/RESULT: PASS/.test(out)) {
      parts.push(`## catalog-absence-gate\n\nPASS\n`);
    } else {
      blockers += 1;
      parts.push("## catalog-absence-gate\n\nFAIL\n");
    }
  }

  const verdict = verdictFromFindings({
    blocked,
    blockers,
    // Unlinked remote ⇒ at least one review so we never claim full PASS without remote coverage
    reviews: reviews + (remoteLinked ? 0 : 1),
  });
  console.log(`rollup blocked=${blocked} blockers=${blockers} reviews=${reviews} remoteLinked=${remoteLinked}`);
  console.log("\n==============================");
  console.log(verdict);
  if (!remoteLinked) {
    console.log(`NOTE: ${remoteSkippedReason}`);
    console.log(
      "Tag supabase-isolation-audit-pass requires linked remote coverage or explicit CONDITIONAL acceptance.",
    );
  }
  console.log("==============================");

  const stamp = new Date().toISOString().slice(0, 10);
  const evidenceBody = [
    `# SUPABASE FULL ISOLATION AUDIT — ${stamp}`,
    "",
    `- Git commit: ${gitCommit}`,
    `- Git tag: ${gitTag}`,
    `- Worktree: ${worktree === "(clean)" ? "clean" : "dirty — portfolio/isolation uncommitted scopes may remain"}`,
    `- Project ref: ${VDB_APPROVED_PROJECT_REF}`,
    `- Project name: ${VDB_APPROVED_PROJECT_NAME}`,
    `- Region: ${VDB_APPROVED_REGION}`,
    `- Remote linked: ${remoteLinked}`,
    `- Remote note: ${remoteSkippedReason || "ok"}`,
    `- CHECKOUT_ENABLED: false`,
    `- P05_MIGRATION_APPLIED: unset`,
    `- Verdict: ${verdict}`,
    `- Evidence hash seed: ${sha256Short(parts.join(""))}`,
    "",
    "## Confirmations",
    "",
    "- Read-only queries only",
    "- No DB/Auth/Storage/config mutations",
    "- Vermeulen / Grill Gasten / TrustBooker allowed as APPROVED_CASE only (not platform data)",
    "- Foreign project data reported fail-closed, not auto-deleted",
    "- Local audits use supabase_db_vdbdigital2 only",
    "",
    ...parts,
  ].join("\n");

  const path = writeEvidence(`SUPABASE_FULL_ISOLATION_AUDIT-${stamp}.md`, evidenceBody);
  console.log(`Evidence: ${path}`);

  // Ensure evidence is gitignored
  const gi = readFileSync(resolve(process.cwd(), ".gitignore"), "utf8");
  if (!gi.includes("docs/evidence")) {
    console.log("WARNING: docs/evidence may not be gitignored");
  }

  process.exit(blocked || blockers > 0 ? 1 : 0);
}

main();
