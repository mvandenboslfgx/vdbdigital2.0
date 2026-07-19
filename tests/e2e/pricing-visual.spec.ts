/**
 * Pricing visual acceptance — computed styles, not class-name source checks.
 * Screenshots: test-results/visual-system/ (gitignored via /test-results/)
 */
import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const outDir = path.join("test-results", "visual-system");

const viewports = [
  { name: "320x800", width: 320, height: 800 },
  { name: "390x844", width: 390, height: 844 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1024x768", width: 1024, height: 768 },
  { name: "1440x900", width: 1440, height: 900 },
] as const;

function luminance(rgb: string): number {
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/i);
  if (!m) return 0;
  const alpha = m[4] === undefined ? 1 : Number(m[4]);
  if (alpha < 0.05) return -1;
  const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(fg: string, bg: string): number {
  const L1 = luminance(fg);
  const L2 = luminance(bg);
  if (L1 < 0 || L2 < 0) return 0;
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

async function dismissCookies(page: Page) {
  const accept = page.getByRole("button", {
    name: /Accept all|Alles accepteren/i,
  });
  if (await accept.isVisible().catch(() => false)) {
    await accept.click();
  }
}

test.beforeAll(() => {
  fs.mkdirSync(outDir, { recursive: true });
});

for (const vp of viewports) {
  test(`pricing packages computed styles @ ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("/nl", { waitUntil: "networkidle" });
    await dismissCookies(page);

    const section = page.locator('[data-pricing-section="packages"]');
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible();

    const cards = section.locator("[data-pricing-card]");
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThanOrEqual(3);

    const docOverflow = await page.evaluate(() => {
      const el = document.documentElement;
      return el.scrollWidth - el.clientWidth;
    });
    expect(docOverflow).toBeLessThanOrEqual(1);

    for (let i = 0; i < cardCount; i++) {
      const card = cards.nth(i);
      await expect(card).toBeVisible();

      const cta = card.locator("[data-pricing-cta] a").first();
      await cta.scrollIntoViewIfNeeded();
      await expect(cta).toBeVisible();

      const metrics = await cta.evaluate((el) => {
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        const cardEl = el.closest("[data-pricing-card]");
        const cardRect = cardEl?.getBoundingClientRect();

        const isTransparent = (rgb: string) => {
          const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/i);
          if (!m) return true;
          const alpha = m[4] === undefined ? 1 : Number(m[4]);
          return alpha < 0.05;
        };

        let bg = style.backgroundColor;
        let node: Element | null = el;
        while (node && isTransparent(bg)) {
          node = node.parentElement;
          if (!node) break;
          bg = getComputedStyle(node).backgroundColor;
        }
        if (isTransparent(bg)) bg = "rgb(255, 255, 255)";

        return {
          color: style.color,
          backgroundColor: bg,
          borderTopColor: style.borderTopColor,
          opacity: style.opacity,
          visibility: style.visibility,
          display: style.display,
          height: rect.height,
          width: rect.width,
          top: rect.top,
          bottom: rect.bottom,
          left: rect.left,
          right: rect.right,
          inCard:
            !!cardRect &&
            rect.top >= cardRect.top - 1 &&
            rect.bottom <= cardRect.bottom + 1 &&
            rect.left >= cardRect.left - 1 &&
            rect.right <= cardRect.right + 1,
        };
      });

      expect(metrics.opacity).toBe("1");
      expect(metrics.visibility).toBe("visible");
      expect(metrics.display).not.toBe("none");
      expect(metrics.height).toBeGreaterThanOrEqual(44);
      expect(metrics.width).toBeGreaterThan(40);
      expect(metrics.inCard).toBe(true);

      const viewport = page.viewportSize()!;
      expect(metrics.bottom).toBeLessThanOrEqual(viewport.height + 2);
      expect(metrics.top).toBeGreaterThanOrEqual(-2);
      expect(metrics.left).toBeGreaterThanOrEqual(-1);
      expect(metrics.right).toBeLessThanOrEqual(viewport.width + 1);

      const borderLum = luminance(metrics.borderTopColor);
      const bgLum = luminance(metrics.backgroundColor);
      expect(borderLum).toBeGreaterThanOrEqual(0);
      expect(bgLum).toBeGreaterThanOrEqual(0);
      expect(Math.abs(borderLum - bgLum)).toBeGreaterThan(0.02);

      const textContrast = contrastRatio(metrics.color, metrics.backgroundColor);
      expect(textContrast).toBeGreaterThan(3);
    }

    if (vp.width >= 1024 && cardCount >= 2) {
      await section.scrollIntoViewIfNeeded();
      const alignedTops = await cards.evaluateAll((nodes) =>
        nodes.map((card) => {
          const cta = card.querySelector("[data-pricing-cta] a");
          return cta?.getBoundingClientRect().top ?? 0;
        }),
      );
      const firstRow = alignedTops.slice(0, Math.min(4, alignedTops.length));
      const min = Math.min(...firstRow);
      const max = Math.max(...firstRow);
      expect(max - min).toBeLessThanOrEqual(4);
    }

    await section.scrollIntoViewIfNeeded();
    const box = await section.boundingBox();
    if (box) {
      await page.screenshot({
        path: path.join(outDir, `pricing-${vp.name}.png`),
        clip: {
          x: Math.max(0, box.x),
          y: Math.max(0, box.y),
          width: Math.min(box.width, vp.width),
          height: Math.min(box.height, vp.height),
        },
      });
    }
  });
}

test("visual system shell screenshots", async ({ page }) => {
  const shots: { name: string; path: string }[] = [
    { name: "home", path: "/nl" },
    { name: "cases", path: "/nl/cases" },
    { name: "admin-login", path: "/admin/login" },
    { name: "portal-login", path: "/inloggen" },
  ];

  await page.setViewportSize({ width: 1440, height: 900 });

  for (const shot of shots) {
    await page.goto(shot.path, { waitUntil: "networkidle" });
    await dismissCookies(page);
    await page.screenshot({
      path: path.join(outDir, `shell-${shot.name}-1440.png`),
      fullPage: true,
    });
  }

  await page.goto("/", { waitUntil: "networkidle" });
  await dismissCookies(page);
  const section = page.locator('[data-pricing-section="packages"]');
  await section.scrollIntoViewIfNeeded();
  const box = await section.boundingBox();
  if (box) {
    await page.screenshot({
      path: path.join(outDir, "pricing-en-1440.png"),
      clip: {
        x: Math.max(0, box.x),
        y: Math.max(0, box.y),
        width: Math.min(box.width, 1440),
        height: Math.min(box.height, 900),
      },
    });
  }
});
