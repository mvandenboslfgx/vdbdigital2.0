import { test, expect } from "@playwright/test";

test.describe("header polish", () => {
  test("desktop 1440 keeps one-row nav with single primary CTA", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const accept = page.getByRole("button", { name: /Accept all|Alles accepteren/i });
    if (await accept.isVisible({ timeout: 2000 }).catch(() => false)) {
      await accept.click();
    }

    const desktopNav = page.getByTestId("desktop-nav");
    await expect(desktopNav).toBeVisible();
    await expect(page.getByTestId("header-primary-cta")).toBeVisible();
    await expect(page.getByTestId("mobile-menu-button")).toBeHidden();

    const wraps = await desktopNav.evaluate((el) => {
      const links = Array.from(el.querySelectorAll("a, button"));
      return links.some((node) => {
        const styles = window.getComputedStyle(node);
        return styles.whiteSpace !== "nowrap" && node.getBoundingClientRect().height > 40;
      });
    });
    expect(wraps).toBe(false);

    // Exactly one primary CTA in the sticky header bar (quote lives in drawer only)
    await expect(page.locator("header").getByTestId("header-primary-cta")).toHaveCount(1);
  });

  test("1024px activates mobile menu before overflow", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const accept = page.getByRole("button", { name: /Accept all|Alles accepteren/i });
    if (await accept.isVisible({ timeout: 2000 }).catch(() => false)) {
      await accept.click();
    }

    await expect(page.getByTestId("desktop-nav")).toBeHidden();
    const menuButton = page.getByTestId("mobile-menu-button");
    await expect(menuButton).toBeVisible();
    await menuButton.click();
    const drawer = page.getByTestId("mobile-nav-drawer");
    await expect(drawer).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
  });
});
