import { defineConfig, devices } from "@playwright/test";

/**
 * Production portal E2E — no local webServer (hits live vdbdigital.nl).
 * Requires E2E_STORAGE_STATE.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: [
    "portal-full-routes.spec.ts",
    "portal-hard-nav.spec.ts",
    "portal-soft-nav-cookie-jar.spec.ts",
    "portal-write-safe.spec.ts",
  ],
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "list",
  timeout: 240_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "https://vdbdigital.nl",
    storageState: process.env.E2E_STORAGE_STATE,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
