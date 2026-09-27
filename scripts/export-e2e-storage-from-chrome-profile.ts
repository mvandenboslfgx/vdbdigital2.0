/**
 * Export Playwright storageState from a Chrome forensics profile that already
 * completed Google login (cookies present for vdbdigital.nl).
 *
 * Usage:
 *   npx tsx scripts/export-e2e-storage-from-chrome-profile.ts <profileDir> [out.json]
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = "https://vdbdigital.nl";
const profileDir = process.argv[2];
const out =
  process.argv[3] ||
  path.join(process.cwd(), "tests", "e2e", ".auth", "portal-storage.json");

async function main() {
  if (!profileDir || !fs.existsSync(profileDir)) {
    console.error("Usage: tsx scripts/export-e2e-storage-from-chrome-profile.ts <chrome-profile-dir> [out.json]");
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(out), { recursive: true });

  const context = await chromium.launchPersistentContext(profileDir, {
    channel: "chrome",
    headless: true,
  });
  const page = context.pages()[0] || (await context.newPage());
  await page.goto(`${BASE}/portal`, { waitUntil: "domcontentloaded" });
  if (page.url().includes("/inloggen")) {
    console.error("FAIL: profile is not authenticated (landed on /inloggen)");
    await context.close();
    process.exit(1);
  }
  await context.storageState({ path: out });
  const cookies = await context.cookies(BASE);
  const auth = cookies.filter(
    (c) => c.name.startsWith("sb-") && c.name.includes("auth-token"),
  );
  console.log(
    JSON.stringify({
      ok: true,
      out,
      url: page.url(),
      authCookieCount: auth.length,
    }),
  );
  await context.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
