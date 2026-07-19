/**
 * Capture Grill Gasten + TrustBooker portfolio screenshots (local WebP assets).
 * Usage: npx tsx scripts/capture-portfolio-case-screenshots.ts
 *
 * Grill Gasten: live https://www.grillgasten.eu/
 * TrustBooker: local preview (TRUSTBOOKER_URL, default http://127.0.0.1:3000)
 *   — no iframe, no hotlink; anonymise by dismissing cookies only.
 */
import { chromium, devices } from "playwright";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

async function toWebp(pngPath: string, webpPath: string, quality = 82) {
  await sharp(pngPath).webp({ quality, effort: 4 }).toFile(webpPath);
  fs.unlinkSync(pngPath);
}

async function dismissCookies(page: import("playwright").Page) {
  for (const label of [
    /alles accepteren/i,
    /accept all/i,
    /akkoord/i,
    /accepteer/i,
    /accept/i,
    /agree/i,
  ]) {
    const btn = page.getByRole("button", { name: label });
    if (await btn.isVisible().catch(() => false)) {
      await btn.click().catch(() => undefined);
      await page.waitForTimeout(400);
      break;
    }
  }
}

async function captureViewport(
  browser: import("playwright").Browser,
  target: string,
  outDir: string,
  fileBase: string,
  opts: { width: number; height: number; mobile?: boolean },
) {
  const contextOpts = opts.mobile
    ? {
        ...devices["iPhone 13"],
        viewport: { width: opts.width, height: opts.height },
      }
    : {
        viewport: { width: opts.width, height: opts.height },
        deviceScaleFactor: 1,
      };
  const page = await browser.newPage(contextOpts);
  await page.goto(target, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(1600);
  await dismissCookies(page);
  const png = path.join(outDir, `_${fileBase}.png`);
  await page.screenshot({ path: png, fullPage: false });
  await toWebp(png, path.join(outDir, `${fileBase}.webp`));
  await page.close();
}

async function captureFullPage(
  browser: import("playwright").Browser,
  target: string,
  outDir: string,
  fileBase: string,
  maxH = 2200,
) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  await page.goto(target, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(1600);
  await dismissCookies(page);
  const png = path.join(outDir, `_${fileBase}.png`);
  await page.screenshot({ path: png, fullPage: true });
  const meta = await sharp(png).metadata();
  const pipeline =
    meta.height && meta.height > maxH
      ? sharp(png).extract({
          left: 0,
          top: 0,
          width: meta.width!,
          height: maxH,
        })
      : sharp(png);
  await pipeline
    .webp({ quality: 78, effort: 4 })
    .toFile(path.join(outDir, `${fileBase}.webp`));
  fs.unlinkSync(png);
  await page.close();
}

async function captureGrill(browser: import("playwright").Browser) {
  const OUT = path.join("public", "cases", "grill-gasten");
  fs.mkdirSync(OUT, { recursive: true });
  const TARGET = "https://www.grillgasten.eu/";

  await captureViewport(browser, TARGET, OUT, "desktop-home", {
    width: 1440,
    height: 1000,
  });
  await captureViewport(browser, TARGET, OUT, "mobile-home", {
    width: 390,
    height: 844,
    mobile: true,
  });

  // Menu / ordering section — try common paths, fall back to homepage crop
  const menuCandidates = [
    "https://www.grillgasten.eu/menu",
    "https://www.grillgasten.eu/bestellen",
    "https://www.grillgasten.eu/#menu",
    TARGET,
  ];
  let menuOk = false;
  for (const url of menuCandidates) {
    try {
      await captureViewport(browser, url, OUT, "menu-preview", {
        width: 1440,
        height: 1000,
      });
      menuOk = true;
      break;
    } catch {
      // try next
    }
  }
  if (!menuOk) {
    throw new Error("Could not capture Grill Gasten menu preview");
  }

  await captureFullPage(browser, TARGET, OUT, "full-page");

  for (const f of [
    "desktop-home.webp",
    "mobile-home.webp",
    "menu-preview.webp",
    "full-page.webp",
  ]) {
    const full = path.join(OUT, f);
    const stat = fs.statSync(full);
    console.log(`OK grill-gasten/${f} (${Math.round(stat.size / 1024)} KB)`);
  }
}

async function captureTrustbooker(browser: import("playwright").Browser) {
  const OUT = path.join("public", "cases", "trustbooker");
  fs.mkdirSync(OUT, { recursive: true });
  const base =
    process.env.TRUSTBOOKER_URL?.replace(/\/$/, "") || "http://127.0.0.1:3000";

  const desktopCandidates = [
    `${base}/`,
    `${base}/categories`,
    `${base}/auth/sign-in`,
  ];
  let desktopCaptured = false;
  for (const url of desktopCandidates) {
    try {
      await captureViewport(browser, url, OUT, "desktop-dashboard", {
        width: 1440,
        height: 1000,
      });
      desktopCaptured = true;
      console.log(`TrustBooker desktop from ${url}`);
      break;
    } catch (err) {
      console.warn(`Skip ${url}:`, (err as Error).message);
    }
  }

  if (!desktopCaptured) {
    throw new Error(
      `TrustBooker local preview unreachable at ${base}. Start the TrustBooker app (npm run dev) then re-run.`,
    );
  }

  await captureViewport(browser, base + "/", OUT, "mobile-preview", {
    width: 390,
    height: 844,
    mobile: true,
  });

  try {
    await captureFullPage(browser, base + "/", OUT, "platform-preview", 1600);
  } catch {
    // Duplicate desktop as platform preview if full page fails
    fs.copyFileSync(
      path.join(OUT, "desktop-dashboard.webp"),
      path.join(OUT, "platform-preview.webp"),
    );
  }

  for (const f of [
    "desktop-dashboard.webp",
    "mobile-preview.webp",
    "platform-preview.webp",
  ]) {
    const full = path.join(OUT, f);
    const stat = fs.statSync(full);
    console.log(`OK trustbooker/${f} (${Math.round(stat.size / 1024)} KB)`);
  }
}

async function main() {
  const only = process.argv[2]; // grill | trustbooker | all
  const browser = await chromium.launch({ headless: true });
  try {
    if (!only || only === "all" || only === "grill") {
      await captureGrill(browser);
    }
    if (!only || only === "all" || only === "trustbooker") {
      await captureTrustbooker(browser);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
