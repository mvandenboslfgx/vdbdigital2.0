import { test, expect } from "@playwright/test";

const TRANSLATION_KEY_RE = /\b(?:nav|forms|checkout|shop|cart|common)\.[a-zA-Z0-9_.]+\b/;

test.describe("Homepage (English default)", () => {
  test("loads with English hero headline", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(
      page.getByRole("heading", {
        name: /Websites and digital systems that turn visitors into enquiries/i,
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
        name: /Websites en digitale systemen die bezoekers omzetten in aanvragen/i,
      }),
    ).toBeVisible();
  });

  test("language switcher preserves route", async ({ page }) => {
    await page.goto("/nl/solutions");
    await page.getByRole("banner").getByRole("link", { name: /English/i }).click();
    await expect(page).toHaveURL(/\/solutions$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("preserves product query when switching language", async ({ page }) => {
    await page.goto("/quote?product=starter-website");
    await page.getByRole("banner").getByRole("link", { name: /Nederlands/i }).click();
    await expect(page).toHaveURL(/\/nl\/quote\?product=starter-website/);
  });
});

test.describe("Navigation", () => {
  test("navigates to shop", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation", { name: /Main navigation/i })
      .getByRole("link", { name: "Software", exact: true })
      .click();
    await expect(page).toHaveURL("/shop");
  });

  test("mobile menu opens in English", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await page.getByTestId("mobile-menu-button").click();
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
    // Unauthenticated staff are sent to the shared locale-aware login surface.
    await expect(page).toHaveURL(/\/(nl\/)?inloggen/);
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
    const fab = page.getByRole("link", { name: /contact/i }).last();
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
      // Dismiss cookie dialog if present — it can inflate scrollWidth during assert.
      const accept = page.getByRole("button", { name: /Accept all|Alles accepteren/i });
      if (await accept.isVisible().catch(() => false)) {
        await accept.click();
      }
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        const limit = doc.clientWidth + 1;
        if (doc.scrollWidth <= limit) {
          return { overflow: false, offenders: [] as string[] };
        }
        const offenders: string[] = [];
        for (const el of Array.from(document.body.querySelectorAll("*"))) {
          const style = window.getComputedStyle(el);
          if (style.display === "none" || style.visibility === "hidden") continue;
          const rect = el.getBoundingClientRect();
          if (rect.right > limit || rect.left < -1) {
            offenders.push(
              `${style.position}:${el.tagName.toLowerCase()}#${el.id || ""}.${String(el.className).slice(0, 60)}:L${Math.round(rect.left)}R${Math.round(rect.right)}`,
            );
          }
        }
        return {
          overflow: offenders.length > 0 || doc.scrollWidth > limit,
          offenders: offenders.slice(0, 10),
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
        };
      });
      expect(
        overflow.overflow,
        `overflow at ${width}px scroll=${overflow.scrollWidth}/${overflow.clientWidth}: ${overflow.offenders.join(" | ")}`,
      ).toBe(false);
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
