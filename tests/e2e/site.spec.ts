import { test, expect } from "@playwright/test";

const TRANSLATION_KEY_RE = /\b(?:nav|forms|checkout|shop|cart|common)\.[a-zA-Z0-9_.]+\b/;

async function dismissCookieBanner(page: import("@playwright/test").Page) {
  const accept = page.getByRole("button", { name: /Accept all|Alles accepteren/i });
  if (await accept.isVisible().catch(() => false)) {
    await accept.click();
  }
}

test.describe("Homepage (English default)", () => {
  test("loads with English hero headline", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(
      page.getByRole("heading", {
        level: 1,
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
        level: 1,
        name: /Professionele website laten maken voor jouw bedrijf/i,
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
  test("navigates to packages shop", async ({ page }) => {
    await page.goto("/");
    await dismissCookieBanner(page);
    await page
      .getByRole("navigation", { name: /Main navigation/i })
      .getByRole("link", { name: "Services & pricing", exact: true })
      .click();
    await expect(page).toHaveURL("/shop");
  });

  test("mobile menu opens in English", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await dismissCookieBanner(page);
    await page.getByRole("button", { name: /Open menu/i }).click();
    await expect(
      page
        .getByLabel(/Mobile navigation/i)
        .getByRole("link", { name: /Book intro/i }),
    ).toBeVisible();
  });

  test("language switcher usable at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/");
    await dismissCookieBanner(page);
    await page.getByRole("button", { name: /Open menu/i }).click();
    const switcher = page.getByRole("dialog").getByRole("group", { name: /Language/i });
    await expect(switcher).toBeVisible();
    const box = await switcher.boundingBox();
    expect(box?.width).toBeGreaterThan(40);
  });
});

test.describe("Shop", () => {
  test("shows website packages on BUILD pillar", async ({ page }) => {
    await page.goto("/shop");
    await expect(
      page.getByRole("heading", { name: "Website packages" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Onepage Website" }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Launch Website" }).first()).toBeVisible();
  });

  test("software procurement page when no verified SKUs", async ({ page }) => {
    await page.goto("/shop/software");
    await expect(
      page.getByRole("heading", { name: /Curated business software/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /License procurement on request/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Request a license/i }),
    ).toBeVisible();
  });

  test("blocks unverified legacy product slug", async ({ page }) => {
    const response = await page.goto("/shop/starter-website");
    expect(response?.status()).toBe(404);
  });

  test("Dutch software procurement page loads", async ({ page }) => {
    await page.goto("/nl/shop/software");
    await expect(page.locator("html")).toHaveAttribute("lang", "nl");
    await expect(
      page.getByRole("heading", { name: /Geselecteerde zakelijke software/i }),
    ).toBeVisible();
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
    await expect(page).toHaveURL(/\/(admin\/login|inloggen)/);
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
    await dismissCookieBanner(page);
    const fab = page.getByLabel("Contact", { exact: true });
    await expect(fab).toBeVisible();
    await expect(fab).toHaveAttribute("href", /contact/);
    await expect(page.getByText(/WhatsApp.*not configured/i)).toHaveCount(0);
  });
});

test.describe("Brand identity", () => {
  test("header logo is visible with natural dimensions", async ({ page }) => {
    await page.goto("/");
    const logoLink = page.getByRole("banner").getByRole("link", {
      name: /VDB Digital Software/i,
    });
    await expect(logoLink).toBeVisible();
    const img = logoLink.locator("img");
    await expect(img).toBeVisible();
    await expect(img).toHaveAttribute("src", /\/brand\/vdb-logo-header-light\.svg/);
    const box = await img.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.height).toBeGreaterThanOrEqual(32);
    expect(box!.height).toBeLessThanOrEqual(56);
    expect(box!.width).toBeGreaterThan(box!.height);
  });

  test("no horizontal overflow at key viewports", async ({ page }) => {
    for (const width of [320, 375, 430, 768, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await expect(
        page.getByRole("banner").getByRole("link", { name: /VDB Digital Software/i }),
      ).toBeVisible();
      await dismissCookieBanner(page);
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return doc.scrollWidth > doc.clientWidth + 1;
      });
      expect(overflow, `overflow at ${width}px`).toBe(false);
    }
  });

  test("favicon and manifest assets respond", async ({ request }) => {
    for (const path of [
      "/brand/favicon.ico",
      "/brand/favicon.svg",
      "/brand/favicon-32.png",
      "/brand/apple-touch-icon.png",
      "/brand/site.webmanifest",
      "/brand/opengraph-image.jpg",
      "/brand/twitter-image.jpg",
      "/favicon.ico",
    ]) {
      const res = await request.get(path);
      expect(res.ok(), path).toBeTruthy();
    }
  });
});
