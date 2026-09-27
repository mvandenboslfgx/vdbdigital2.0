/**
 * Regression: soft-nav must not wipe auth cookies before hard refresh.
 * Root cause (proven): Next.js Link prefetch of GET /uitloggen ran signOut
 * and cleared sb-*-auth-token during portal soft-nav.
 *
 * Requires E2E_STORAGE_STATE (pre-authenticated). Does not automate Google OAuth.
 */
import { test, expect } from "@playwright/test";
import fs from "node:fs";

const BASE = process.env.E2E_BASE_URL ?? "https://vdbdigital.nl";
const STORAGE = process.env.E2E_STORAGE_STATE;

function authCookies(
  cookies: Array<{ name: string; value: string; path?: string }>,
) {
  return cookies.filter(
    (c) =>
      (c.name.startsWith("sb-") && c.name.includes("auth-token")) ||
      c.name.includes("code-verifier"),
  );
}

function isAuthCookieName(name: string): boolean {
  return (
    (name.startsWith("sb-") && name.includes("auth-token")) ||
    name.includes("code-verifier")
  );
}

function parseSetCookieAction(raw: string): {
  name: string;
  clear: boolean;
} {
  const first = raw.split(";")[0] ?? "";
  const eq = first.indexOf("=");
  const name = eq >= 0 ? first.slice(0, eq) : first;
  const value = eq >= 0 ? first.slice(eq + 1) : "";
  const maxAgeZero = /(?:^|;\s*)Max-Age=0(?:;|$)/i.test(raw);
  return { name, clear: value.length === 0 || maxAgeZero };
}

test.describe("soft-nav must preserve auth cookie jar", () => {
  test.skip(!STORAGE || !fs.existsSync(STORAGE), "E2E_STORAGE_STATE required");

  test.use({
    storageState: STORAGE,
    baseURL: BASE,
  });

  test("Projecten + Documenten Link soft-nav keeps auth cookies; F5 stays authenticated", async ({
    page,
    context,
  }) => {
    const authClears: Array<{
      url: string;
      status: number;
      location: string | null;
      names: string[];
    }> = [];
    const uitloggenHits: string[] = [];

    page.on("response", async (response) => {
      const url = response.url();
      if (url.includes("/uitloggen")) {
        uitloggenHits.push(`${response.request().method()} ${url} → ${response.status()}`);
      }
      const headers = response.headers();
      const location = headers["location"] ?? null;
      const setCookieRaw = headers["set-cookie"] ?? "";
      const setCookies = setCookieRaw
        ? setCookieRaw.split(/\n/).filter(Boolean)
        : [];
      // Playwright may expose set-cookie as joined; also try allheaders
      let clears: string[] = [];
      try {
        const all = await response.allHeaders();
        const raw = all["set-cookie"] ?? "";
        const parts = raw ? raw.split(/\n/).filter(Boolean) : setCookies;
        clears = parts
          .map(parseSetCookieAction)
          .filter((c) => isAuthCookieName(c.name) && c.clear)
          .map((c) => c.name);
      } catch {
        clears = setCookies
          .map(parseSetCookieAction)
          .filter((c) => isAuthCookieName(c.name) && c.clear)
          .map((c) => c.name);
      }
      if (clears.length > 0 || (location && /\/inloggen/.test(location) && url.includes("/uitloggen"))) {
        authClears.push({
          url: url.split("?")[0],
          status: response.status(),
          location,
          names: clears,
        });
      }
    });

    await page.goto("/portal", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/inloggen/);

    const before = authCookies(await context.cookies(BASE));
    expect(before.length, "auth cookies present after /portal").toBeGreaterThan(
      0,
    );
    const beforeNames = before.map((c) => c.name).sort();

    // Real sidebar Link soft navigation (not page.goto)
    await page
      .locator('aside a[href="/portal/projecten"], nav a[href="/portal/projecten"]')
      .first()
      .click();
    await page.waitForURL(/\/portal\/projecten/, { timeout: 15000 });
    await expect(page).not.toHaveURL(/\/inloggen/);
    await page.waitForTimeout(1500);

    expect(
      uitloggenHits,
      "soft-nav must not hit /uitloggen (prefetch logout)",
    ).toEqual([]);
    expect(
      authClears.filter((c) => c.names.length > 0),
      "no auth-cookie clears during Projecten soft-nav",
    ).toEqual([]);

    const afterSoft = authCookies(await context.cookies(BASE));
    const afterNames = afterSoft.map((c) => c.name).sort();
    expect(
      afterSoft.filter((c) => c.value && c.value.length > 0).length,
      "auth cookies still present after soft-nav (before F5)",
    ).toBeGreaterThan(0);
    expect(afterNames, "auth cookie names after soft-nav").toEqual(beforeNames);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/inloggen/);
    await expect(page.locator("body")).not.toContainText(
      "This page couldn’t load",
    );

    const afterF5 = authCookies(await context.cookies(BASE)).filter(
      (c) => c.value && c.value.length > 0,
    );
    expect(afterF5.length, "auth cookies survive F5").toBeGreaterThan(0);

    // Documenten soft-nav + F5
    uitloggenHits.length = 0;
    authClears.length = 0;
    await page
      .locator('aside a[href="/portal/documenten"], nav a[href="/portal/documenten"]')
      .first()
      .click();
    await page.waitForURL(/\/portal\/documenten/, { timeout: 15000 });
    await expect(page).not.toHaveURL(/\/inloggen/);
    await page.waitForTimeout(1500);

    expect(uitloggenHits, "Documenten soft-nav must not hit /uitloggen").toEqual(
      [],
    );
    expect(
      authClears.filter((c) => c.names.length > 0),
      "no auth-cookie clears during Documenten soft-nav",
    ).toEqual([]);

    const afterDocSoft = authCookies(await context.cookies(BASE)).filter(
      (c) => c.value && c.value.length > 0,
    );
    expect(afterDocSoft.length).toBeGreaterThan(0);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/inloggen/);
    expect(
      authCookies(await context.cookies(BASE)).filter(
        (c) => c.value && c.value.length > 0,
      ).length,
    ).toBeGreaterThan(0);
  });

  test("portal sidebar Links do not prefetch-logout", async ({
    page,
    context,
  }) => {
    const bad: string[] = [];
    page.on("response", (response) => {
      const url = response.url();
      if (!url.includes("/uitloggen")) return;
      if (response.request().method() === "GET" && response.status() !== 405) {
        bad.push(`GET ${url} → ${response.status()}`);
      }
    });

    await page.goto("/portal", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/inloggen/);
    await page.waitForTimeout(2000);

    // Hover a few sidebar links only (full hover loop flaked under load)
    for (const href of [
      "/portal/projecten",
      "/portal/documenten",
      "/portal/support",
    ]) {
      const link = page.locator(`aside a[href="${href}"]`).first();
      if ((await link.count()) === 0) continue;
      await link.hover().catch(() => {});
    }
    await page.waitForTimeout(1500);

    expect(bad, "no mutating GET /uitloggen from Link prefetch").toEqual([]);
    expect(
      authCookies(await context.cookies(BASE)).filter(
        (c) => c.value && c.value.length > 0,
      ).length,
    ).toBeGreaterThan(0);
  });

  test("GET /uitloggen must not clear auth cookies", async ({ page, context }) => {
    await page.goto("/portal", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/inloggen/);
    const before = authCookies(await context.cookies(BASE)).filter(
      (c) => c.value && c.value.length > 0,
    );
    expect(before.length).toBeGreaterThan(0);

    const res = await page.request.get("/uitloggen", { maxRedirects: 0 });
    expect(res.status()).toBe(405);
    expect(res.headers()["allow"] ?? "").toMatch(/POST/i);

    const after = authCookies(await context.cookies(BASE)).filter(
      (c) => c.value && c.value.length > 0,
    );
    expect(after.map((c) => c.name).sort()).toEqual(
      before.map((c) => c.name).sort(),
    );
    await page.goto("/portal", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/inloggen/);
  });

  test("explicit POST logout clears auth cookies and denies portal", async ({
    page,
    context,
  }) => {
    await page.goto("/portal", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/inloggen/);

    await page.getByRole("button", { name: "Uitloggen" }).first().click();
    await page.waitForURL(/\/inloggen/, { timeout: 15000 });

    const live = authCookies(await context.cookies(BASE)).filter(
      (c) => c.value && c.value.length > 0,
    );
    expect(live.length).toBe(0);

    await page.goto("/portal/projecten", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/inloggen/);
  });
});
