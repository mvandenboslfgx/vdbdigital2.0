/**
 * Checkout release gate CLI — report only; never enables checkout.
 * Usage: npm run checkout:release-gate
 */
import { evaluateCheckoutReleaseGate } from "../src/lib/checkout/release-gate";
import { loadEnvLocal } from "./lib/env-loader";

loadEnvLocal();

const report = evaluateCheckoutReleaseGate(process.env);

console.log("=== P0.5 Checkout Release Gate ===");
console.log(`Result: ${report.code}`);
console.log("CHECKOUT_ENABLED remains OFF (gate never enables checkout)");
console.log("");
for (const check of report.checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"}  ${check.id}: ${check.detail}`);
}
console.log("");
console.log(
  report.readyForManualEnablement
    ? "Manual enablement may be considered AFTER operator review. Flag still OFF."
    : "Do not set CHECKOUT_ENABLED=true.",
);

process.exit(report.readyForManualEnablement ? 0 : 2);
