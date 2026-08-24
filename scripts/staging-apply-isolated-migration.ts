/**
 * Apply exactly one local migration to staging (qzekuvmgfekzsowdecyk).
 * Never uses db push. Never targets production.
 *
 * Usage:
 *   npx tsx scripts/staging-apply-isolated-migration.ts --version 20260824160000 --dry-run
 *   npx tsx scripts/staging-apply-isolated-migration.ts --version 20260824160000 --apply
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  PRODUCTION_SUPABASE_PROJECT_REF,
  STAGING_SUPABASE_PROJECT_REF,
} from "../src/lib/security/supabase-target";

const ROOT = process.cwd();
const MIGRATIONS_DIR = path.join(ROOT, "supabase/migrations");
function linkedRefFile(): string {
  const candidates = [
    path.join(ROOT, "supabase", ".temp", "project-ref"),
    path.join(ROOT, "supabase", ".temp", "project-ref"),
  ];
  const found = candidates.find((fp) => fs.existsSync(fp));
  if (!found) {
    throw new Error("supabase/.temp/project-ref ontbreekt — CLI is niet gelinkt");
  }
  return found;
}
const CATALOG_WIP_VERSIONS = new Set([
  "20260820164821",
  "20260820224500",
]);

type Mode = "dry-run" | "apply";

function arg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function sha256File(fp: string): string {
  return createHash("sha256").update(fs.readFileSync(fp)).digest("hex");
}

function linkedRef(): string {
  return fs.readFileSync(linkedRefFile(), "utf8").trim();
}

function assertStagingLink(): string {
  const ref = linkedRef();
  if (ref === PRODUCTION_SUPABASE_PROJECT_REF) {
    throw new Error("REFUSING production project link");
  }
  if (ref !== STAGING_SUPABASE_PROJECT_REF) {
    throw new Error(`Linked ref ${ref} is not staging ${STAGING_SUPABASE_PROJECT_REF}`);
  }
  return ref;
}

function listLocalMigrations(): Array<{ version: string; filename: string; sha256: string }> {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .map((filename) => {
      const version = filename.slice(0, 14);
      return {
        version,
        filename,
        sha256: sha256File(path.join(MIGRATIONS_DIR, filename)),
      };
    })
    .sort((a, b) => a.version.localeCompare(b.version));
}

function supabase(args: string[], opts?: { input?: string }): string {
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  return execFileSync(npx, ["--yes", "supabase", ...args], {
    encoding: "utf8",
    cwd: ROOT,
    windowsHide: true,
    input: opts?.input,
    stdio: ["pipe", "pipe", "pipe"],
    maxBuffer: 20 * 1024 * 1024,
  });
}

function parseMigrationList(output: string): {
  local: string[];
  remote: string[];
  pending: string[];
} {
  const local: string[] = [];
  const remote: string[] = [];
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^\s*(\d{14})\s+\|\s+(\S*)\s+\|\s+(\S*)/);
    if (!match) continue;
    const version = match[1];
    const localTime = match[2];
    const remoteTime = match[3];
    if (localTime && localTime !== "") local.push(version);
    if (remoteTime && remoteTime !== "") remote.push(version);
  }
  const remoteSet = new Set(remote);
  const pending = local.filter((v) => !remoteSet.has(v));
  return { local, remote, pending };
}

function findFile(version: string) {
  const files = listLocalMigrations();
  const found = files.find((f) => f.version === version);
  if (!found) throw new Error(`Migration file not found for ${version}`);
  return found;
}

async function main() {
  const version = arg("--version");
  const mode: Mode = hasFlag("--apply") ? "apply" : "dry-run";
  if (!version || !/^\d{14}$/.test(version)) {
    throw new Error("Pass --version YYYYMMDDHHMMSS");
  }
  if (CATALOG_WIP_VERSIONS.has(version)) {
    throw new Error(`Refusing catalog-WIP version ${version}`);
  }

  const ref = assertStagingLink();
  const localFiles = listLocalMigrations();
  const target = findFile(version);
  if (CATALOG_WIP_VERSIONS.has(target.version)) {
    throw new Error("Refusing catalog-WIP file");
  }

  const listOut = supabase(["migration", "list", "--linked"]);
  const listed = parseMigrationList(listOut);
  const catalogPending = listed.pending.filter((v) => CATALOG_WIP_VERSIONS.has(v));
  const otherPending = listed.pending.filter((v) => v !== version);

  const report = {
    mode,
    linkedRef: ref,
    stagingRef: STAGING_SUPABASE_PROJECT_REF,
    productionRefDenied: PRODUCTION_SUPABASE_PROJECT_REF,
    target: {
      version: target.version,
      filename: target.filename,
      sha256: target.sha256,
    },
    localMigrationCount: localFiles.length,
    remoteCount: listed.remote.length,
    pendingIfDbPush: listed.pending,
    catalogWipWouldBePushed: catalogPending,
    otherPendingWouldBePushed: otherPending,
    isolated: otherPending.length > 0 || catalogPending.length > 0,
    note:
      "db push is forbidden here. This script applies only the target SQL file, then repairs that version.",
  };

  console.log(JSON.stringify(report, null, 2));

  if (listed.remote.includes(version)) {
    console.log(`ALREADY_APPLIED ${version}`);
    return;
  }

  if (mode === "dry-run") {
    console.log("DRY_RUN_OK — no SQL executed");
    return;
  }

  const sqlPath = path.join(MIGRATIONS_DIR, target.filename);
  const sql = fs.readFileSync(sqlPath, "utf8");
  supabase(["db", "query", "--linked"], { input: sql });

  supabase([
    "migration",
    "repair",
    "--linked",
    "--status",
    "applied",
    "--yes",
    version,
  ]);

  const after = parseMigrationList(supabase(["migration", "list", "--linked"]));
  const afterCatalog = after.remote.filter((v) => CATALOG_WIP_VERSIONS.has(v));
  if (afterCatalog.length > 0) {
    throw new Error("Catalog-WIP version appeared on remote — abort");
  }
  if (!after.remote.includes(version)) {
    throw new Error("Target version missing from remote after repair");
  }
  console.log(
    JSON.stringify(
      {
        applied: true,
        version,
        sha256: target.sha256,
        catalogWipOnRemote: afterCatalog,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
