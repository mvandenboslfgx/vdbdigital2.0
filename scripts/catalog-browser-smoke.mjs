import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = (process.env.CATALOG_SMOKE_BASE_URL ?? "http://127.0.0.1:3000").replace(
  /\/$/,
  "",
);
const screenshotDir = process.env.CATALOG_SMOKE_SCREENSHOTS
  ? resolve(process.env.CATALOG_SMOKE_SCREENSHOTS)
  : null;

if (screenshotDir) await mkdir(screenshotDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const checks = [];
let failed = false;

try {
  for (const scenario of [
    { name: "shop-desktop", path: "/shop", width: 1440, height: 1000 },
    { name: "shop-mobile", path: "/shop", width: 375, height: 812 },
    { name: "software-mobile", path: "/shop/software", width: 375, height: 812 },
    { name: "shop-nl-mobile", path: "/nl/shop", width: 375, height: 812 },
  ]) {
    const page = await browser.newPage({
      viewport: { width: scenario.width, height: scenario.height },
    });
    const consoleErrors = [];
    const pageErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    const response = await page.goto(`${baseUrl}${scenario.path}`, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    const state = await page.evaluate(() => ({
      textLength: document.body.innerText.trim().length,
      hasOldPlaceholder:
        document.body.innerText.includes("0 verified public") ||
        document.body.innerText.includes("12 candidates in review") ||
        document.body.innerText.includes("0 geverifieerd publiek") ||
        document.body.innerText.includes("12 kandidaten in review"),
      hasErrorOverlay: Boolean(
        document.querySelector(
          "[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay",
        ),
      ),
      searchInputs: document.querySelectorAll('input[type="search"]').length,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      lang: document.documentElement.lang,
    }));

    if (screenshotDir) {
      await page.screenshot({
        path: resolve(screenshotDir, `${scenario.name}.png`),
        fullPage: true,
      });
    }

    const result = {
      scenario: scenario.name,
      status: response?.status() ?? null,
      ...state,
      consoleErrors,
      pageErrors,
    };
    checks.push(result);

    if (
      !response?.ok() ||
      state.textLength < 100 ||
      state.hasOldPlaceholder ||
      state.hasErrorOverlay ||
      state.searchInputs < 1 ||
      state.horizontalOverflow ||
      consoleErrors.length > 0 ||
      pageErrors.length > 0
    ) {
      failed = true;
    }
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({ ok: !failed, baseUrl, checks }, null, 2));
if (failed) process.exitCode = 1;
