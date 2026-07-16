/**
 * Database/core Supabase env — faalt alleen op ontbrekende core/database vars.
 * Gebruik: npm run env:validate:database
 */
import { loadEnvLocal } from "./lib/env-loader";
import {
  collectEnvChecks,
  invalidInGroup,
  missingInGroup,
  printEnvReport,
  printStructuralChecks,
} from "./lib/validate-env-groups";

loadEnvLocal();

const checks = collectEnvChecks();
printEnvReport(checks, "Environment validation — database/core");

const structuralOk = printStructuralChecks();
const missing = missingInGroup(checks, "core/database");
const invalid = invalidInGroup(checks, "core/database");

if (missing.length > 0 || invalid.length > 0 || !structuralOk) {
  console.error("FAIL database/core environment validation");
  process.exit(1);
}

console.log("PASS database/core environment validation");
process.exit(0);
