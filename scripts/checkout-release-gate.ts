/**
 * Cloudflare production release gate.
 * Usage: npm run checkout:release-gate
 * This command only validates. It never deploys.
 */
import { evaluateCheckoutReleaseGate } from "../src/lib/checkout/release-gate";
import { loadEnvLocal } from "./lib/env-loader";

loadEnvLocal();

const report = evaluateCheckoutReleaseGate(process.env);

console.log("=== VDB Cloudflare Production Release Gate ===");
console.log(`Result: ${report.code}`);
console.log("Deploy performed: NO");
console.log("");
for (const check of report.checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"}  ${check.id}: ${check.detail}`);
}
console.log("");
console.log(
  report.readyForDeploy
    ? "Configuration is ready for a separately approved Cloudflare production deploy."
    : "Do not deploy yet; resolve the failed checks first.",
);

process.exit(report.readyForDeploy ? 0 : 2);
