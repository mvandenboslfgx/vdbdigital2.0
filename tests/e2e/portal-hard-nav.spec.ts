/**
 * Playwright regression: hard document navigations must not redirect
 * to /inloggen while a valid auth cookie jar is present.
 *
 * Uses storageState (pre-authenticated). Does NOT automate Google OAuth.
 */
import { test, expect } from "@playwright/test";
import fs from "node:fs";

const BASE = process.env.E2E_BASE_URL ?? "https://vdbdigital.nl";
const STORAGE = process.env.E2E_STORAGE_STATE;

test.describe("portal hard document navigation", () => {
  test.skip(!STORAGE || !fs.existsSync(STORAGE), "E2E_STORAGE_STATE required");

  test.use({
    storageState: STORAGE,
    baseURL: BASE,
  });

  test("paste/goto portal routes stay authenticated", async ({ page }) => {
    await page.goto("/portal", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/inloggen/);

    // Actual document navigation — not router.push
    await page.goto("/portal/projecten", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/inloggen/);
    await expect(page.locator("body")).not.toContainText("This page couldn’t load");

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/inloggen/);

    await page.goto("/portal/documenten", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/inloggen/);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/inloggen/);
  });

  test("logout then hard nav requires login", async ({ page, context }) => {
    await page.goto("/portal", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/inloggen/);

    // POST-only logout (GET must not sign out — Link prefetch footgun)
    await page.getByRole("button", { name: "Uitloggen" }).first().click();
    await page.waitForURL(/\/inloggen/, { timeout: 15000 });

    await page.goto("/portal/projecten", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/inloggen/);

    // Jar should not retain auth cookie names after logout (metadata only).
    const cookies = await context.cookies(BASE);
    const auth = cookies.filter(
      (c) =>
        c.name.startsWith("sb-") ||
        c.name.includes("auth-token") ||
        c.name.includes("code-verifier"),
    );
    const live = auth.filter((c) => c.value && c.value.length > 0);
    expect(live.length).toBe(0);
  });
});
