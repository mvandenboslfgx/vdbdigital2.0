/**
 * Production Google auth hard-refresh check (Chromium).
 * Requires interactive Google account in the browser profile or saved session.
 */
import { test, expect } from "@playwright/test";

test.describe("production google auth persistence", () => {
  test.setTimeout(180_000);

  test("hard refresh keeps portal session", async ({ page, context }) => {
    // Clear any prior session via POST logout (GET must not mutate auth)
    await page.request.post("https://vdbdigital.nl/uitloggen", {
      maxRedirects: 0,
    }).catch(() => {});
    await page.goto("https://vdbdigital.nl/inloggen", {
      waitUntil: "networkidle",
    });

    await page.getByRole("button", { name: /Google/i }).click();

    // Wait for either Google or return to portal/callback.
    await page.waitForURL(
      /(accounts\.google\.com|vdbdigital\.nl\/(auth\/callback|portal))/,
      { timeout: 60_000 },
    );

    if (page.url().includes("accounts.google.com")) {
      // If a single account chooser appears, click the first account.
      const account = page.locator("[data-identifier], [data-email]").first();
      if (await account.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await account.click();
      }
      await page.waitForURL(/vdbdigital\.nl\/(auth\/callback|portal)/, {
        timeout: 90_000,
      });
    }

    // Finish callback → portal
    await page.waitForURL(/vdbdigital\.nl\/portal/, { timeout: 90_000 });
    await expect(page.getByRole("heading", { name: /Welkom/i })).toBeVisible({
      timeout: 30_000,
    });

    const cookiesAfterLogin = (await context.cookies("https://vdbdigital.nl")).filter(
      (c) => c.name.includes("auth-token"),
    );
    // eslint-disable-next-line no-console
    console.log("cookiesAfterLogin", cookiesAfterLogin.length);

    // HARD REFRESH
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Welkom/i })).toBeVisible({
      timeout: 30_000,
    });
    expect(page.url()).toContain("/portal");

    const cookiesAfterRefresh = (
      await context.cookies("https://vdbdigital.nl")
    ).filter((c) => c.name.includes("auth-token"));
    // eslint-disable-next-line no-console
    console.log("cookiesAfterRefresh", cookiesAfterRefresh.length);

    // Hard nav
    await page.goto("https://vdbdigital.nl/portal/projecten", {
      waitUntil: "domcontentloaded",
    });
    expect(page.url()).toContain("/portal/projecten");
    expect(page.url()).not.toContain("/inloggen");

    const cookiesAfterHardNav = (
      await context.cookies("https://vdbdigital.nl")
    ).filter((c) => c.name.includes("auth-token"));
    // eslint-disable-next-line no-console
    console.log("cookiesAfterHardNav", cookiesAfterHardNav.length);

    expect(cookiesAfterRefresh.length).toBeGreaterThan(0);
    expect(cookiesAfterHardNav.length).toBeGreaterThan(0);
  });
});
