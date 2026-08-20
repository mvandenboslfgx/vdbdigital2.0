/**
 * Production live smoke — vdbdigital.nl
 * Artifacts: test-results/prod-smoke/
 */
import { test, expect, type Page, type ConsoleMessage, type Response } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.PROD_SMOKE_BASE_URL ?? "https://vdbdigital.nl";
const outDir = path.join("test-results", "prod-smoke");
const stamp = Date.now().toString(36);
const marker = `VDB-SMOKE-${stamp}`;

fs.mkdirSync(outDir, { recursive: true });

type RouteResult = {
  path: string;
  status: number;
  ok: boolean;
  title?: string;
  h1?: string;
  consoleErrors: string[];
  networkFails: string[];
};

async function collectPageErrors(page: Page) {
  const consoleErrors: string[] = [];
  const networkFails: string[] = [];
  const onConsole = (msg: ConsoleMessage) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  };
  const onResponse = (res: Response) => {
    if (res.status() >= 400 && !res.url().includes("favicon")) {
      networkFails.push(`${res.status()} ${res.url()}`);
    }
  };
  page.on("console", onConsole);
  page.on("response", onResponse);
  return {
    consoleErrors,
    networkFails,
    dispose: () => {
      page.off("console", onConsole);
      page.off("response", onResponse);
    },
  };
}

async function dismissCookies(page: Page) {
  const accept = page.getByRole("button", { name: /Accept all|Alles accepteren/i });
  if (await accept.isVisible().catch(() => false)) await accept.click();
}

const routes = [
  { path: "/", expect: /Custom software|Websites and digital/i },
  { path: "/nl", expect: /website laten maken|Professionele/i },
  { path: "/solutions", expect: /./ },
  { path: "/nl/solutions", expect: /./ },
  { path: "/shop", expect: /Digital products|producten|Packages|pakket/i },
  { path: "/nl/shop", expect: /./ },
  { path: "/shop?pillar=build", expect: /./ },
  { path: "/shop?pillar=automate", expect: /./ },
  { path: "/shop?pillar=grow", expect: /./ },
  { path: "/shop/software", expect: /Curated business software|License procurement|software/i },
  { path: "/nl/shop/software", expect: /zakelijke software|Licentie|software/i },
  { path: "/cases", expect: /./ },
  { path: "/nl/cases", expect: /./ },
  { path: "/contact", expect: /./ },
  { path: "/nl/contact", expect: /./ },
  { path: "/quote", expect: /./ },
  { path: "/nl/quote", expect: /./ },
  { path: "/support", expect: /./ },
  { path: "/nl/support", expect: /./ },
  { path: "/website-laten-maken", expect: /./ },
];

test.describe.configure({ mode: "parallel" });

test("production route crawl NL/EN + pillars", async ({ page, request }) => {
  const results: RouteResult[] = [];

  for (const route of routes) {
    const collectors = await collectPageErrors(page);
    const res = await page.goto(`${BASE}${route.path}`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await dismissCookies(page);
    await page.waitForTimeout(400);
    const status = res?.status() ?? 0;
    const h1 = (await page.locator("h1").first().innerText().catch(() => "")).trim();
    const title = await page.title();
    collectors.dispose();
    const entry: RouteResult = {
      path: route.path,
      status,
      ok: status >= 200 && status < 400,
      title,
      h1,
      consoleErrors: [...collectors.consoleErrors],
      networkFails: [...collectors.networkFails].filter(
        (u) => !u.includes("/admin") && !u.includes("chrome-extension"),
      ),
    };
    results.push(entry);
    expect(entry.ok, `${route.path} status ${status}`).toBeTruthy();
    if (route.expect) {
      await expect(page.locator("body")).toContainText(route.expect);
    }
  }

  const robots = await request.get(`${BASE}/robots.txt`);
  expect(robots.ok()).toBeTruthy();
  const robotsBody = await robots.text();
  expect(robotsBody.toLowerCase()).toMatch(/sitemap/i);

  const sitemap = await request.get(`${BASE}/sitemap.xml`);
  expect(sitemap.ok()).toBeTruthy();
  const sitemapBody = await sitemap.text();
  expect(sitemapBody).toContain("vdbdigital.nl");

  fs.writeFileSync(path.join(outDir, "route-crawl.json"), JSON.stringify(results, null, 2));
  fs.writeFileSync(
    path.join(outDir, "seo-assets.json"),
    JSON.stringify(
      {
        robotsStatus: robots.status(),
        sitemapStatus: sitemap.status(),
        robotsHasSitemap: /sitemap/i.test(robotsBody),
        sitemapHasHost: sitemapBody.includes("vdbdigital.nl"),
      },
      null,
      2,
    ),
  );
});

test("desktop + mobile homepage screenshots and console clean", async ({ page }) => {
  for (const vp of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    const collectors = await collectPageErrors(page);
    await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 45000 });
    await dismissCookies(page);
    await page.screenshot({
      path: path.join(outDir, `home-${vp.name}.png`),
      fullPage: true,
    });
    collectors.dispose();
    const severe = collectors.consoleErrors.filter(
      (e) => !/favicon|hydration|third-party|ResizeObserver/i.test(e),
    );
    fs.writeFileSync(
      path.join(outDir, `console-${vp.name}.json`),
      JSON.stringify({ errors: collectors.consoleErrors, severe, networkFails: collectors.networkFails }, null, 2),
    );
    expect(severe, `severe console on ${vp.name}`).toEqual([]);
  }
});

test("form smoke contact", async ({ page }) => {
  await page.goto(`${BASE}/contact`, { waitUntil: "domcontentloaded" });
  await dismissCookies(page);
  const email = `smoke+contact.${stamp}@vdbdigital.nl`;
  await page.locator('input[name="name"]').fill(`Smoke Contact ${marker}`);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="subject"]').fill(`Prod smoke ${marker}`);
  await page.locator('textarea[name="message"]').fill(
    `Automated production smoke ${marker}. Safe to archive.`,
  );
  await page.getByRole("button", { name: /Send message|Verstuur bericht/i }).click();
  await expect(page.getByText(/thank|bedankt|received|ontvangen|success|gelukt/i).first()).toBeVisible({
    timeout: 30000,
  });
  fs.writeFileSync(
    path.join(outDir, "form-contact.json"),
    JSON.stringify({ marker, email, path: "/contact", submittedAt: new Date().toISOString() }, null, 2),
  );
});

async function completeQuoteWizard(
  page: Page,
  opts: { name: string; email: string; company: string; goals: string; projectType: string },
) {
  await page.getByRole("radio", { name: /Business|Zakelijk/i }).first().check();
  await page.getByRole("button", { name: /Continue|Volgende|Doorgaan/i }).click();

  await page.locator('input[name="name"]').fill(opts.name);
  await page.locator('input[name="email"]').fill(opts.email);
  await page.getByRole("button", { name: /Continue|Volgende|Doorgaan/i }).click();

  await page.locator('input[name="company"]').fill(opts.company);
  await page.getByRole("button", { name: /Continue|Volgende|Doorgaan/i }).click();

  await page.locator('input[name="projectType"]').fill(opts.projectType);
  await page.locator('textarea[name="goals"]').fill(opts.goals);
  await page.getByRole("button", { name: /Continue|Volgende|Doorgaan/i }).click();

  await page.locator('input[name="meetingPreference"][value="online"]').check();
  await page.getByRole("button", { name: /Continue|Volgende|Doorgaan/i }).click();

  await page.locator('input[name="privacyConsent"]').check();
  await page.locator('button[type="submit"]').click();
}

test("form smoke quote", async ({ page }) => {
  await page.goto(`${BASE}/quote`, { waitUntil: "domcontentloaded" });
  await dismissCookies(page);
  const email = `smoke+quote.${stamp}@vdbdigital.nl`;
  await completeQuoteWizard(page, {
    name: `Smoke Quote ${marker}`,
    email,
    company: "VDB Smoke Co",
    projectType: "Website",
    goals: `Automated quote smoke ${marker}. Need a conversion-focused website. Safe to archive.`,
  });
  await expect(page.getByText(/thank|bedankt|received|ontvangen|success|gelukt|proposal|kennismaking/i).first()).toBeVisible({
    timeout: 30000,
  });
  fs.writeFileSync(
    path.join(outDir, "form-quote.json"),
    JSON.stringify({ marker, email, path: "/quote", submittedAt: new Date().toISOString() }, null, 2),
  );
});

test("form smoke software request", async ({ page }) => {
  await page.goto(`${BASE}/quote?intent=software-license`, { waitUntil: "domcontentloaded" });
  await dismissCookies(page);
  const email = `smoke+software.${stamp}@vdbdigital.nl`;
  await completeQuoteWizard(page, {
    name: `Smoke Software ${marker}`,
    email,
    company: "VDB Smoke Software",
    projectType: "Software license",
    goals: `Software license request smoke ${marker}. Need verified business license procurement. Safe to archive.`,
  });
  await expect(page.getByText(/thank|bedankt|received|ontvangen|success|gelukt|proposal|kennismaking/i).first()).toBeVisible({
    timeout: 30000,
  });
  fs.writeFileSync(
    path.join(outDir, "form-software.json"),
    JSON.stringify({
      marker,
      email,
      path: "/quote?intent=software-license",
      submittedAt: new Date().toISOString(),
    }, null, 2),
  );
});
