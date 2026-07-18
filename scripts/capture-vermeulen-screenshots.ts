/**
 * Capture Vermeulen Bouwservice case screenshots (local assets only).
 * Usage: npx tsx scripts/capture-vermeulen-screenshots.ts
 *
 * Does not embed iframes or hotlink. Writes to public/cases/vermeulen-bouwservice/
 */
import { chromium, devices } from "playwright";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const TARGET = "https://www.vermeulenbouwservice.nl/";
const OUT = path.join("public", "cases", "vermeulen-bouwservice");

async function toWebp(pngPath: string, webpPath: string, quality = 82) {
  await sharp(pngPath)
    .webp({ quality, effort: 4 })
    .toFile(webpPath);
  fs.unlinkSync(pngPath);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  // Desktop viewport crop
  {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1100 },
      deviceScaleFactor: 1,
    });
    await page.goto(TARGET, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(1500);
    // Dismiss cookie banners if present
    for (const label of [/alles accepteren/i, /accept all/i, /akkoord/i, /accepteer/i]) {
      const btn = page.getByRole("button", { name: label });
      if (await btn.isVisible().catch(() => false)) {
        await btn.click().catch(() => undefined);
        await page.waitForTimeout(500);
        break;
      }
    }
    const png = path.join(OUT, "_desktop-home.png");
    await page.screenshot({ path: png, fullPage: false });
    await toWebp(png, path.join(OUT, "desktop-home.webp"));
    await page.close();
  }

  // Mobile
  {
    const iPhone = devices["iPhone 13"];
    const page = await browser.newPage({
      ...iPhone,
      viewport: { width: 390, height: 844 },
    });
    await page.goto(TARGET, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(1500);
    for (const label of [/alles accepteren/i, /accept all/i, /akkoord/i, /accepteer/i]) {
      const btn = page.getByRole("button", { name: label });
      if (await btn.isVisible().catch(() => false)) {
        await btn.click().catch(() => undefined);
        await page.waitForTimeout(500);
        break;
      }
    }
    const png = path.join(OUT, "_mobile-home.png");
    await page.screenshot({ path: png, fullPage: false });
    await toWebp(png, path.join(OUT, "mobile-home.webp"));
    await page.close();
  }

  // Full page desktop for case page gallery
  {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    await page.goto(TARGET, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(1500);
    for (const label of [/alles accepteren/i, /accept all/i, /akkoord/i, /accepteer/i]) {
      const btn = page.getByRole("button", { name: label });
      if (await btn.isVisible().catch(() => false)) {
        await btn.click().catch(() => undefined);
        await page.waitForTimeout(500);
        break;
      }
    }
    const png = path.join(OUT, "_full-page.png");
    await page.screenshot({ path: png, fullPage: true });
    // Cap height to keep file reasonable (~2200px)
    const meta = await sharp(png).metadata();
    const maxH = 2200;
    const pipeline =
      meta.height && meta.height > maxH
        ? sharp(png).extract({ left: 0, top: 0, width: meta.width!, height: maxH })
        : sharp(png);
    await pipeline.webp({ quality: 78, effort: 4 }).toFile(path.join(OUT, "full-page.webp"));
    fs.unlinkSync(png);
    await page.close();
  }

  await browser.close();

  for (const f of ["desktop-home.webp", "mobile-home.webp", "full-page.webp"]) {
    const full = path.join(OUT, f);
    const stat = fs.statSync(full);
    console.log(`OK ${f} (${Math.round(stat.size / 1024)} KB)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
