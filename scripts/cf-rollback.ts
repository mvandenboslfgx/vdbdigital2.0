/**
 * Instant rollback to the frozen working production version.
 * Uses --version-id/--percentage (never @pct) to avoid PowerShell splat.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";

const WORKER = "vdbdigital-live-new";
const rollback =
  process.env.CF_ROLLBACK_VERSION_ID ||
  "f84ffd2e-b118-402e-9b06-37a9f7fc804f";
const message =
  process.env.CF_ROLLBACK_MESSAGE ||
  "AUTO-ROLLBACK-restore-pre-deploy-working-version";

const wranglerJs = path.join("node_modules", "wrangler", "bin", "wrangler.js");
const args = [
  wranglerJs,
  "versions",
  "deploy",
  "--name",
  WORKER,
  "--version-id",
  rollback,
  "--percentage",
  "100",
  "--message",
  message,
  "--yes",
];

console.log("Rolling back to", rollback);
const r = spawnSync(process.execPath, args, {
  encoding: "utf8",
  shell: false,
  stdio: "inherit",
});
process.exit(r.status ?? 1);
