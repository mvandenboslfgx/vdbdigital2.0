/**
 * Preview-omgeving env — core + checkout + e-mail (geen Upstash/tawk widget verplicht).
 * Gebruik: npm run env:validate:preview
 */
import { loadEnvLocal } from "./lib/env-loader";
import {
  collectEnvChecks,
  invalidInGroup,
  isMollieLiveKey,
  missingInGroup,
  printEnvReport,
  printIntegrationStatus,
  printStructuralChecks,
} from "./lib/validate-env-groups";

loadEnvLocal();

const checks = collectEnvChecks();
printEnvReport(checks, "Environment validation — preview");

const groups = [
  "core/database",
  "preview/checkout",
  "transactional/email",
] as const;

let failed = false;
for (const group of groups) {
  const missing = missingInGroup(checks, group);
  const invalid = invalidInGroup(checks, group);
  if (missing.length > 0 || invalid.length > 0) {
    console.error(`FAIL ${group}`);
    failed = true;
  } else {
    console.log(`PASS ${group}`);
  }
}

printIntegrationStatus();

if (isMollieLiveKey(process.env.MOLLIE_API_KEY)) {
  console.error("FAIL MOLLIE_API_KEY: live key gedetecteerd — deployment geblokkeerd");
  failed = true;
}

if (!printStructuralChecks()) failed = true;

process.exit(failed ? 1 : 0);
