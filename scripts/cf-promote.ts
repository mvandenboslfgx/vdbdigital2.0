/**
 * Promote a previously uploaded Worker version to 100% traffic.
 * Requires CF_CANDIDATE_VERSION_ID. Domains stay on vdbdigital-live-new.
 * Uses --version-id/--percentage (never @pct) to avoid PowerShell splat.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";

const WORKER = "vdbdigital-live-new";
const candidate = process.env.CF_CANDIDATE_VERSION_ID;
const message =
  process.env.CF_PROMOTE_MESSAGE ||
  "PROMOTE-binding-parity-OpenNext-candidate";

if (!candidate) {
  console.error("FAIL: set CF_CANDIDATE_VERSION_ID");
  process.exit(1);
}

const wranglerJs = path.join("node_modules", "wrangler", "bin", "wrangler.js");
const args = [
  wranglerJs,
  "versions",
  "deploy",
  "--name",
  WORKER,
  "--version-id",
  candidate,
  "--percentage",
  "100",
  "--message",
  message,
  "--yes",
];

console.log("Promoting", candidate);
const r = spawnSync(process.execPath, args, {
  encoding: "utf8",
  shell: false,
  stdio: "inherit",
});

if ((r.status ?? 1) !== 0) {
  process.exit(r.status ?? 1);
}

const indexNow = spawnSync(
  process.execPath,
  [path.join("node_modules", "tsx", "dist", "cli.mjs"), "scripts/submit-indexnow.ts"],
  { encoding: "utf8", shell: false, stdio: "inherit" },
);
if ((indexNow.status ?? 1) !== 0) {
  console.warn("IndexNow notify failed (non-blocking)");
}
