import { test, expect } from "@playwright/test";

function isPreviewOrStagingBaseUrl(baseURL: string | undefined): boolean {
  if (!baseURL) return false;
  try {
    const host = new URL(baseURL).hostname.toLowerCase();
    if (host.endsWith(".vercel.app") || host.endsWith(".now.sh")) return true;
  } catch {
    /* ignore */
  }
  return (
    process.env.STAGING_APP_URL === baseURL ||
    process.env.VERCEL_ENV === "preview" ||
    process.env.APP_ENV === "staging"
  );
}

test.describe("SEO alias redirects", () => {
  for (const [alias, canonical] of [
    ["/solutions/live-chat", "/solutions/livechat"],
    ["/solutions/review-flows", "/solutions/reviewflows"],
    ["/solutions/custom-websites", "/solutions/websites"],
  ] as const) {
    test(`redirects ${alias} to ${canonical}`, async ({ page }) => {
      await page.goto(alias);
      await expect(page).toHaveURL(new RegExp(`${canonical.replace(/\//g, "\\/")}$`));
    });
  }

  test("preserves Dutch locale on alias redirect", async ({ page }) => {
    await page.goto("/nl/solutions/live-chat");
    await expect(page).toHaveURL(/\/nl\/solutions\/livechat$/);
  });
});

test.describe("Checkout blocked by default", () => {
  test("redirects /checkout to shop when CHECKOUT_ENABLED is off", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page).toHaveURL(/\/shop$/);
  });
});

test.describe("Sitemap and robots", () => {
  test("sitemap lists canonical solutions and excludes aliases", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.ok()).toBeTruthy();
    const body = await res.text();
    expect(body).toContain("/solutions/livechat");
    expect(body).not.toContain("/solutions/live-chat");
    expect(body).not.toContain("/admin/");
    expect(body).not.toContain("/checkout/");
  });

  test("robots matches environment contract", async ({ request, baseURL }) => {
    const res = await request.get("/robots.txt");
    expect(res.ok()).toBeTruthy();
    const body = await res.text();
    expect(body).toMatch(/User-Agent:\s*\*/i);

    if (isPreviewOrStagingBaseUrl(baseURL)) {
      // Preview/staging: Disallow:/ is desired crawl-block, not alone a noindex guarantee.
      expect(body).toMatch(/Disallow:\s*\/\s*$/m);
      expect(body).not.toMatch(/Allow:\s*\/\s*$/m);
      expect(body.toLowerCase()).not.toContain("vdbdigital.nl");

      const home = await request.get("/");
      expect(home.ok()).toBeTruthy();
      const xrobots = (home.headers()["x-robots-tag"] || "").toLowerCase();
      expect(xrobots).toContain("noindex");
      expect(xrobots).toContain("nofollow");
    } else {
      expect(body).toContain("Disallow: /admin/");
      expect(body).toContain("Disallow: /api/");
      expect(body).toContain("Disallow: /checkout/");
      expect(body).toContain("Sitemap:");
    }
  });
});

test.describe("Mobile menu keyboard", () => {
  test("opens mobile nav with keyboard activation", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    const menuButton = page.getByRole("button", { name: /Open menu/i });
    await menuButton.focus();
    await page.keyboard.press("Enter");

    await expect(page.getByRole("dialog", { name: /Mobile navigation/i })).toBeVisible();
    await expect(
      page
        .getByRole("dialog", { name: /Mobile navigation/i })
        .getByRole("link", { name: /Packages & pricing|Shop|Pakketten/i }),
    ).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: /Mobile navigation/i })).toHaveCount(0);
    await expect(menuButton).toBeFocused();
  });
});
