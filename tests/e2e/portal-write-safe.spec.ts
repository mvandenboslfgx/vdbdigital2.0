/**
 * Safe non-destructive portal write E2E (production).
 * Requires E2E_STORAGE_STATE. Does not submit irreversible financial/legal actions.
 */
import { test, expect } from "@playwright/test";
import fs from "node:fs";

const BASE = process.env.E2E_BASE_URL ?? "https://vdbdigital.nl";
const STORAGE = process.env.E2E_STORAGE_STATE;

test.describe("portal write E2E (safe)", () => {
  test.skip(!STORAGE || !fs.existsSync(STORAGE), "E2E_STORAGE_STATE required");
  test.setTimeout(180_000);

  test.use({ storageState: STORAGE, baseURL: BASE });

  test("profile save round-trip", async ({ page }) => {
    await page.goto("/portal/profiel", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/inloggen/);
    const nameInput = page.locator('input[name="fullName"], input[name="full_name"], input[name="name"]').first();
    await expect(nameInput).toBeVisible({ timeout: 15000 });
    const before = await nameInput.inputValue();
    const marker = `E2E ${Date.now().toString().slice(-6)}`;
    await nameInput.fill(marker);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(2000);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(nameInput).toHaveValue(marker, { timeout: 15000 });
    // Restore prior name when it was non-empty
    if (before.trim()) {
      await nameInput.fill(before);
      await page.locator('button[type="submit"]').first().click();
      await page.waitForTimeout(1500);
    }
  });

  test("instellingen newsletter preference toggles safely", async ({ page }) => {
    await page.goto("/portal/instellingen", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/inloggen/);
    const checkbox = page.locator('input[type="checkbox"]').first();
    if ((await checkbox.count()) === 0) {
      test.skip(true, "no preference checkbox on instellingen");
      return;
    }
    const wasChecked = await checkbox.isChecked();
    await checkbox.click();
    const submit = page.locator('button[type="submit"]').first();
    if (await submit.count()) {
      await submit.click();
      await page.waitForTimeout(1500);
    }
    await page.reload({ waitUntil: "domcontentloaded" });
    // Toggle back to original
    const after = page.locator('input[type="checkbox"]').first();
    if ((await after.isChecked()) === wasChecked) {
      await after.click();
      const submit2 = page.locator('button[type="submit"]').first();
      if (await submit2.count()) await submit2.click();
    } else {
      await after.click();
      const submit2 = page.locator('button[type="submit"]').first();
      if (await submit2.count()) await submit2.click();
    }
  });

  test("meldingen mark-read control is usable", async ({ page }) => {
    await page.goto("/portal/meldingen", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/inloggen/);
    const mark = page.getByRole("button", {
      name: /gelezen|mark.*read|alles/i,
    });
    if ((await mark.count()) === 0) {
      // Empty state is acceptable
      await expect(page.locator("main")).toBeVisible();
      return;
    }
    await mark.first().click();
    await page.waitForTimeout(1000);
    await expect(page).not.toHaveURL(/\/inloggen/);
  });

  test("support ticket form accepts draft fields without requiring live spam", async ({
    page,
  }) => {
    await page.goto("/portal/support", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/inloggen/);
    const subject = page.locator('input[name="subject"], input[name="onderwerp"]').first();
    const body = page.locator('textarea[name="body"], textarea[name="message"], textarea[name="bericht"]').first();
    if ((await subject.count()) === 0 || (await body.count()) === 0) {
      // UI may use a dialog — open create button first
      await page.getByRole("button", { name: /ticket|nieuw|aanmaken/i }).first().click().catch(() => {});
    }
    if ((await subject.count()) > 0) {
      await subject.fill(`E2E draft ${Date.now()}`);
      await body.fill("Non-submitted draft validation only.");
      // Do not click submit — avoid ticket spam in production
      await expect(subject).toHaveValue(/E2E draft/);
    } else {
      await expect(page.locator("main")).toBeVisible();
    }
  });
});
