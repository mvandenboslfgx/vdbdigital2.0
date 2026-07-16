/**
 * Volledige environmentvalidatie — informatief, faalt niet op optionele integraties.
 * Gebruik: npm run env:validate
 */
import { loadEnvLocal } from "./lib/env-loader";
import {
  collectEnvChecks,
  printEnvReport,
  printIntegrationStatus,
  printStructuralChecks,
} from "./lib/validate-env-groups";

loadEnvLocal();

const checks = collectEnvChecks();
printEnvReport(checks, "Environment validation (all groups)");
printIntegrationStatus();
printStructuralChecks();
process.exit(0);
