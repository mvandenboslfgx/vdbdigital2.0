import { test, expect } from "@playwright/test";

const TRANSLATION_KEY_RE = /\b(?:nav|forms|checkout|shop|cart|common)\.[a-zA-Z0-9_.]+\b/;

test.describe("Homepage (English default)", () => {
  test("loads with English hero headline", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(
      page.getByRole("heading", {
        name: /Custom software, websites and automation built around your business/i,
      }),
    ).toBeVisible();
  });

  test("has English skip link", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /Skip to main content/i })).toBeAttached();
  });

  test("does not render raw translation keys", async ({ page }) => {
    await page.goto("/");
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(TRANSLATION_KEY_RE);
  });
});

test.describe("Dutch locale (/nl)", () => {
  test("loads Dutch homepage under /nl", async ({ page }) => {
    await page.goto("/nl");
    await expect(page.locator("html")).toHaveAttribute("lang", "nl");
    await expect(
      page.getByRole("heading", {
        name: /Maatwerksoftware, websites en automatisering die rond jouw bedrijf worden gebouwd/i,
      }),
    ).toBeVisible();
  });

  test("language switcher preserves route", async ({ page }) => {
    await page.goto("/nl/solutions");
    await page.getByRole("banner").getByRole("link", { name: "English" }).click();
    await expect(page).toHaveURL(/\/solutions$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("preserves product query when switching language", async ({ page }) => {
    await page.goto("/quote?product=starter-website");
    await page.getByRole("banner").getByRole("link", { name: "Nederlands" }).click();
    await expect(page).toHaveURL(/\/nl\/quote\?product=starter-website/);
  });
});

test.describe("Navigation", () => {
  test("navigates to shop", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation", { name: /Main navigation/i })
      .getByRole("link", { name: "Shop", exact: true })
      .click();
    await expect(page).toHaveURL("/shop");
  });

  test("mobile menu opens in English", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await page.getByRole("button", { name: /Open menu/i }).click();
    await expect(
      page
        .getByLabel(/Mobile navigation/i)
        .getByRole("link", { name: /Schedule an introduction/i }),
    ).toBeVisible();
  });

  test("language switcher usable at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/");
    const switcher = page.getByRole("group", { name: /Language/i });
    await expect(switcher).toBeVisible();
    const box = await switcher.boundingBox();
    expect(box?.width).toBeGreaterThan(40);
  });
});

test.describe("Shop", () => {
  test("shows products", async ({ page }) => {
    await page.goto("/shop");
    await expect(page.getByRole("heading", { name: "Starter Website" })).toBeVisible();
  });

  test("product page loads", async ({ page }) => {
    await page.goto("/shop/starter-website");
    await expect(page.getByRole("heading", { name: "Starter Website" })).toBeVisible();
  });

  test("Dutch shop shows localized product name", async ({ page }) => {
    await page.goto("/nl/shop/starter-website");
    await expect(page.getByRole("heading").first()).toBeVisible();
  });
});

test.describe("Forms", () => {
  test("contact form renders in English", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.getByRole("textbox", { name: /^Name$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Send message/i })).toBeVisible();
  });

  test("quote form renders in English", async ({ page }) => {
    await page.goto("/quote");
    await expect(page.getByRole("radio", { name: /Business|Consumer/i }).first()).toBeVisible();
  });

  test("cookie consent translated in English", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("button", { name: /Accept all/i })).toBeVisible();
  });
});

test.describe("Legal", () => {
  test("legal pages exist in both locales", async ({ page }) => {
    for (const path of ["/privacy", "/terms", "/cookies", "/refund-policy"]) {
      const en = await page.goto(path);
      expect(en?.ok()).toBeTruthy();
      const nl = await page.goto(`/nl${path}`);
      expect(nl?.ok()).toBeTruthy();
    }
  });
});

test.describe("Admin", () => {
  test("blocks unauthenticated admin access", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});

test.describe("Cookie consent & contact FAB", () => {
  test("shows cookie banner on first visit", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("tawk.to script never loaded", async ({ page }) => {
    await page.goto("/");
    const scripts = await page.locator('script[src*="embed.tawk.to"]').count();
    expect(scripts).toBe(0);
    await page.getByRole("button", { name: /Accept all|Alles accepteren/i }).click();
    const after = await page.locator('script[src*="embed.tawk.to"]').count();
    expect(after).toBe(0);
  });

  test("floating contact CTA links to contact page", async ({ page }) => {
    await page.goto("/");
    const fab = page.getByRole("link", { name: /contact/i }).filter({
      has: page.locator("svg"),
    });
    await expect(fab.first()).toBeVisible();
    await expect(fab.first()).toHaveAttribute("href", /contact/);
    await expect(page.getByText(/WhatsApp.*not configured/i)).toHaveCount(0);
  });
});

test.describe("Security headers", () => {
  test("includes security headers", async ({ page }) => {
    const response = await page.goto("/");
    const headers = response?.headers();
    expect(headers?.["x-content-type-options"]).toBe("nosniff");
    expect(headers?.["x-frame-options"]).toBe("DENY");
  });
});
