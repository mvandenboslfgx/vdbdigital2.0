/**
 * Mobile nav visual evidence — screenshots for QA report.
 */
import { test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const outDir = path.join("test-results", "mobile-nav");
fs.mkdirSync(outDir, { recursive: true });

async function dismissCookies(page: import("@playwright/test").Page) {
  const accept = page.getByRole("button", { name: /Accept all|Alles accepteren/i });
  try {
    if (await accept.isVisible({ timeout: 1500 })) {
      await accept.click({ timeout: 3000 });
    }
  } catch {
    /* ignore */
  }
}

const viewports = [
  { name: "360x800", width: 360, height: 800 },
  { name: "390x844", width: 390, height: 844 },
  { name: "412x915", width: 412, height: 915 },
  { name: "430x932", width: 430, height: 932 },
  { name: "s25-eq", width: 412, height: 915 },
] as const;

test.describe("mobile nav screenshots", () => {
  test("NL + EN menu states @ 390", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto("/nl");
    await dismissCookies(page);
    await page.getByRole("button", { name: /Menu openen/i }).click();
    const nlDialog = page.getByRole("dialog", { name: /Mobiele navigatie/i });
    await nlDialog.waitFor({ state: "visible" });
    await page.screenshot({
      path: path.join(outDir, "nl-closed.png"),
      fullPage: false,
    });

    await nlDialog.getByRole("button", { name: /^Oplossingen$/i }).click();
    await page.screenshot({
      path: path.join(outDir, "nl-solutions-open.png"),
      fullPage: false,
    });

    await nlDialog.getByRole("button", { name: /Diensten & prijzen/i }).click();
    await page.screenshot({
      path: path.join(outDir, "nl-pricing-open.png"),
      fullPage: false,
    });

    await page.goto("/");
    await dismissCookies(page);
    await page.getByRole("button", { name: /Open menu/i }).click();
    await page.getByRole("dialog", { name: /Mobile navigation/i }).waitFor({
      state: "visible",
    });
    await page.screenshot({
      path: path.join(outDir, "en-default.png"),
      fullPage: false,
    });
  });

  for (const vp of viewports) {
    test(`no horizontal overflow @ ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/nl");
      await dismissCookies(page);
      await page.getByRole("button", { name: /Menu openen/i }).click();
      const dialog = page.getByRole("dialog", { name: /Mobiele navigatie/i });
      await dialog.waitFor({ state: "visible" });
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
        };
      });
      if (overflow.scrollWidth > overflow.clientWidth + 1) {
        throw new Error(
          `Horizontal overflow at ${vp.name}: ${overflow.scrollWidth} > ${overflow.clientWidth}`,
        );
      }
      await page.screenshot({
        path: path.join(outDir, `viewport-${vp.name}.png`),
        fullPage: false,
      });
    });
  }
});
