import { describe, it, expect, vi, beforeEach } from "vitest";
import { paths } from "@/i18n/config";
import { getCaseBySlug, isCaseSearchIndexable } from "@/config/commercial/cases";

vi.mock("@/server/repositories/products", () => ({
  getAllProducts: vi.fn().mockResolvedValue([{ slug: "starter-website" }]),
}));

describe("SEO-002 sitemap", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  async function loadSitemapUrls(): Promise<string[]> {
    const sitemap = (await import("@/app/sitemap")).default;
    const entries = await sitemap();
    return entries.map((entry) => entry.url);
  }

  it("includes canonical solution routes in both locales", async () => {
    const urls = await loadSitemapUrls();
    for (const route of [
      paths.livechat,
      paths.reviewflows,
      paths.websites,
      paths.webshops,
    ]) {
      expect(urls.some((url) => url.endsWith(route))).toBe(true);
      expect(urls.some((url) => url.endsWith(`/nl${route}`))).toBe(true);
    }
  });

  it("excludes legacy alias paths", async () => {
    const urls = await loadSitemapUrls();
    const banned = [
      "/solutions/live-chat",
      "/solutions/review-flows",
      "/solutions/custom-websites",
    ];
    for (const alias of banned) {
      expect(urls.some((url) => url.includes(alias))).toBe(false);
    }
  });

  it("excludes admin, portal, auth, and checkout areas", async () => {
    const urls = await loadSitemapUrls();
    const blocked = ["/admin", "/portal", "/inloggen", "/checkout", "/auth"];
    for (const segment of blocked) {
      expect(urls.some((url) => url.includes(segment))).toBe(false);
    }
  });

  it("keeps TrustBooker noindex and excludes it from sitemap URLs", async () => {
    const trust = getCaseBySlug("trustbooker")!;
    expect(isCaseSearchIndexable(trust)).toBe(false);

    const urls = await loadSitemapUrls();
    expect(urls.some((url) => url.includes("trustbooker"))).toBe(false);
  });

  it("returns unique URLs only", async () => {
    const urls = await loadSitemapUrls();
    expect(new Set(urls).size).toBe(urls.length);
  });
});
