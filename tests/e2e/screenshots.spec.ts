/**
 * Screenshot capture for commercial mobile/desktop QA.
 * Artifacts: test-results/screenshots/
 * Visual PASS/FAIL must be recorded in docs/MOBILE_SCREENSHOT_QA.md after inspection.
 */
import { test } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const outDir = path.join("test-results", "screenshots");

const viewports = [
  { name: "360x800", width: 360, height: 800 },
  { name: "390x844", width: 390, height: 844 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1440x900", width: 1440, height: 900 },
] as const;

const routes = [
  { name: "home", path: "/" },
  { name: "home-nl", path: "/nl" },
  { name: "solutions", path: "/solutions" },
  { name: "websites", path: "/solutions/websites" },
  { name: "webshops", path: "/solutions/webshops" },
  { name: "shop", path: "/shop" },
  { name: "quote", path: "/quote" },
  { name: "contact", path: "/contact" },
  { name: "cases", path: "/cases" },
  { name: "demo-whatsapp", path: "/cases/demo-whatsapp-ai" },
  { name: "admin-login", path: "/admin/login" },
] as const;

test.beforeAll(() => {
  fs.mkdirSync(outDir, { recursive: true });
});

for (const vp of viewports) {
  for (const route of routes) {
    test(`screenshot ${route.name} @ ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(route.path, { waitUntil: "networkidle" });
      // Dismiss cookie dialog when present so CTA layouts are visible
      const accept = page.getByRole("button", { name: /Accept all|Alles accepteren/i });
      if (await accept.isVisible().catch(() => false)) {
        await accept.click();
      }
      await page.screenshot({
        path: path.join(outDir, `${vp.name}__${route.name}.png`),
        fullPage: true,
      });
    });
  }
}

test("screenshot mobile menu @ 360x800", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  const accept = page.getByRole("button", { name: /Accept all/i });
  if (await accept.isVisible().catch(() => false)) await accept.click();
  await page.getByRole("button", { name: /Open menu/i }).click();
  await page.screenshot({
    path: path.join(outDir, "360x800__mobile-menu.png"),
    fullPage: true,
  });
});
