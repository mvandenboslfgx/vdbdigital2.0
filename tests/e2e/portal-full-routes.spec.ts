/**
 * Full customer portal E2E against production.
 * Requires E2E_STORAGE_STATE (pre-authenticated). Does not automate Google OAuth.
 *
 * Asserts real page content — not just HTTP 200.
 */
import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";

const BASE = process.env.E2E_BASE_URL ?? "https://vdbdigital.nl";
const STORAGE = process.env.E2E_STORAGE_STATE;

const SIDEBAR: Array<{ name: string; path: string; heading: RegExp }> = [
  { name: "Overzicht", path: "/portal", heading: /Welkom/i },
  { name: "Projecten", path: "/portal/projecten", heading: /Projecten/i },
  { name: "Intake", path: "/portal/intake", heading: /intake/i },
  { name: "Offertes", path: "/portal/offertes", heading: /Offertes/i },
  { name: "Bestellingen", path: "/portal/bestellingen", heading: /Bestellingen/i },
  { name: "Facturen", path: "/portal/facturen", heading: /Facturen/i },
  { name: "Betalingen", path: "/portal/betalingen", heading: /Betalingen/i },
  { name: "Afspraken", path: "/portal/afspraken", heading: /Afspraken/i },
  { name: "Documenten", path: "/portal/documenten", heading: /Documenten/i },
  { name: "Berichten", path: "/portal/berichten", heading: /Berichten/i },
  { name: "Support", path: "/portal/support", heading: /Support|Tickets/i },
  { name: "Meldingen", path: "/portal/meldingen", heading: /Meldingen/i },
  { name: "Profiel", path: "/portal/profiel", heading: /Profiel/i },
  { name: "Beveiliging", path: "/portal/beveiliging", heading: /Beveiliging/i },
  { name: "Instellingen", path: "/portal/instellingen", heading: /Instellingen/i },
];

const LOAD_FAIL =
  /This page couldn’t load|Deze pagina kon niet worden geladen|Application error/i;

async function assertPortalPage(page: Page, path: string, heading: RegExp) {
  await expect(page).toHaveURL(new RegExp(path.replace(/\//g, "\\/") + "($|\\?)"));
  await expect(page).not.toHaveURL(/\/inloggen/);
  await expect(page.locator("body")).not.toContainText(LOAD_FAIL);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(heading, {
    timeout: 20000,
  });
}

test.describe("customer portal full E2E", () => {
  test.skip(!STORAGE || !fs.existsSync(STORAGE), "E2E_STORAGE_STATE required");
  test.setTimeout(240_000);

  test.use({
    storageState: STORAGE,
    baseURL: BASE,
  });

  test("sidebar soft-nav + hard goto + F5 for all portal routes", async ({
    page,
  }) => {
    await page.goto("/portal", { waitUntil: "domcontentloaded" });
    await assertPortalPage(page, "/portal", /Welkom/i);

    for (const route of SIDEBAR) {
      // Soft-nav via sidebar Link
      await page.getByRole("link", { name: route.name, exact: true }).first().click();
      await page.waitForURL(new RegExp(route.path.replace(/\//g, "\\/")), {
        timeout: 20000,
      });
      await assertPortalPage(page, route.path, route.heading);

      // Hard document navigation
      await page.goto(route.path, { waitUntil: "domcontentloaded" });
      await assertPortalPage(page, route.path, route.heading);

      // Hard refresh
      await page.reload({ waitUntil: "domcontentloaded" });
      await assertPortalPage(page, route.path, route.heading);
    }
  });

  test("priority routes render empty-or-list content", async ({ page }) => {
    for (const path of [
      "/portal/projecten",
      "/portal/documenten",
      "/portal/support",
    ]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page).not.toHaveURL(/\/inloggen/);
      await expect(page.locator("body")).not.toContainText(LOAD_FAIL);
      // Must show list, empty state, or at least main content — not a blank shell
      const main = page.locator("main");
      await expect(main).toBeVisible();
      const text = (await main.innerText()).trim();
      expect(text.length, `${path} main content`).toBeGreaterThan(10);
    }
  });

  test("writes: support create form + berichten start form visible", async ({
    page,
  }) => {
    await page.goto("/portal/support", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).not.toContainText(LOAD_FAIL);
    // Create ticket UI (button or form) present
    const supportWrite = page
      .getByRole("button", { name: /ticket|aanmaken|nieuw|verstuur/i })
      .or(page.locator("form").filter({ hasText: /onderwerp|subject|bericht/i }))
      .first();
    await expect(supportWrite).toBeVisible({ timeout: 15000 });

    await page.goto("/portal/berichten", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).not.toContainText(LOAD_FAIL);
    const berichtenWrite = page
      .getByRole("button", { name: /gesprek|nieuw|start|verstuur/i })
      .or(page.locator("form").filter({ hasText: /onderwerp|bericht/i }))
      .first();
    await expect(berichtenWrite).toBeVisible({ timeout: 15000 });

    await page.goto("/portal/profiel", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: /opslaan|bewaar|save/i }).or(
      page.locator('button[type="submit"]'),
    ).first()).toBeVisible({ timeout: 15000 });
  });

  test("cross-customer denial: foreign UUIDs do not leak data", async ({
    page,
  }) => {
    const foreign = "00000000-0000-4000-8000-000000000001";
    for (const path of [
      `/portal/projecten/${foreign}`,
      `/portal/documenten/${foreign}`,
      `/portal/support/${foreign}`,
      `/portal/berichten/${foreign}`,
      `/portal/facturen/${foreign}`,
    ]) {
      const res = await page.goto(path, { waitUntil: "domcontentloaded" });
      const status = res?.status() ?? 0;
      const body = await page.locator("body").innerText();
      // Must not show another customer's content; 404/not-found/redirect OK
      expect(body).not.toMatch(/secret|confidential|other.?org/i);
      expect(
        status === 404 ||
          /niet gevonden|not found|404/i.test(body) ||
          page.url().includes("/portal") === false ||
          page.url().includes("/inloggen") ||
          page.url().includes("/geen-toegang") ||
          /kon niet|not found|404/i.test(body),
      ).toBeTruthy();
    }
  });

  test("mobile viewport: sidebar menu opens and routes", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/portal", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/inloggen/);

    const menuBtn = page.getByRole("button", {
      name: /menu openen|menu sluiten|open menu|close menu/i,
    });
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();
    await page.getByRole("link", { name: "Projecten", exact: true }).click();
    await page.waitForURL(/\/portal\/projecten/);
    await assertPortalPage(page, "/portal/projecten", /Projecten/i);

    await page.getByRole("button", { name: /menu openen/i }).click();
    await page.getByRole("link", { name: "Documenten", exact: true }).click();
    await page.waitForURL(/\/portal\/documenten/);
    await assertPortalPage(page, "/portal/documenten", /Documenten/i);
  });
});
