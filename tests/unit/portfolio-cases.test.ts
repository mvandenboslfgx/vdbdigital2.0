import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  assertCaseLiveLinkRules,
  getCaseBySlug,
  getCaseLiveUrl,
  getFeaturedPortfolioCases,
  getPublicCases,
  isCasePubliclyVisible,
  isCaseSearchIndexable,
  promoteCaseToLive,
  type CaseDefinition,
} from "@/config/commercial/cases";
import { getCommercialContent } from "@/i18n/content/commercial";
import { isDirectCheckoutEnabled } from "@/config/features";

describe("Vermeulen Bouwservice remains a live case", () => {
  it("stays published LIVE with HTTPS live link", () => {
    const c = getCaseBySlug("vermeulen-bouwservice");
    expect(c).toBeDefined();
    expect(c!.type).toBe("real");
    expect(c!.status).toBe("PUBLISHED");
    expect(c!.launchStatus).toBe("LIVE");
    expect(c!.liveLinkActive).toBe(true);
    expect(getCaseLiveUrl(c!)).toBe("https://www.vermeulenbouwservice.nl/");
    expect(isCasePubliclyVisible("vermeulen-bouwservice")).toBe(true);
    expect(isCaseSearchIndexable(c!)).toBe(true);
  });

  it("keeps local screenshot assets", () => {
    const dir = path.join(
      process.cwd(),
      "public",
      "cases",
      "vermeulen-bouwservice",
    );
    for (const f of ["desktop-home.webp", "mobile-home.webp", "full-page.webp"]) {
      expect(fs.existsSync(path.join(dir, f)), `missing ${f}`).toBe(true);
    }
  });
});

describe("Grill Gasten live case", () => {
  it("is published as a real LIVE client case", () => {
    const c = getCaseBySlug("grill-gasten");
    expect(c).toBeDefined();
    expect(c!.type).toBe("real");
    expect(c!.status).toBe("PUBLISHED");
    expect(c!.launchStatus).toBe("LIVE");
    expect(c!.liveLinkActive).toBe(true);
    expect(c!.externalUrl).toBe("https://www.grillgasten.eu/");
    expect(getCaseLiveUrl(c!)).toBe("https://www.grillgasten.eu/");
    expect(isCasePubliclyVisible("grill-gasten")).toBe(true);
    expect(isCaseSearchIndexable(c!)).toBe(true);
  });

  it("has local screenshot assets including menu preview", () => {
    const dir = path.join(process.cwd(), "public", "cases", "grill-gasten");
    for (const f of [
      "desktop-home.webp",
      "mobile-home.webp",
      "menu-preview.webp",
      "full-page.webp",
    ]) {
      expect(fs.existsSync(path.join(dir, f)), `missing ${f}`).toBe(true);
    }
  });

  it("uses honest NL/EN badges without fabricated metrics", () => {
    const en = getCommercialContent("en").grillGasten;
    const nl = getCommercialContent("nl").grillGasten;
    expect(en.label.toLowerCase()).toContain("live");
    expect(nl.label.toLowerCase()).toContain("live");
    const blob = `${en.summary} ${en.about} ${en.solutions.join(" ")} ${nl.summary}`;
    expect(blob).not.toMatch(/\d+\s*%/);
    expect(blob.toLowerCase()).not.toMatch(/omzetstijging|guaranteed|gegarandeerd/);
  });
});

describe("TrustBooker coming-soon case", () => {
  it("is COMING_SOON without a live link", () => {
    const c = getCaseBySlug("trustbooker");
    expect(c).toBeDefined();
    expect(c!.launchStatus).toBe("COMING_SOON");
    expect(c!.liveLinkActive).toBe(false);
    expect(c!.externalUrl).toBeNull();
    expect(getCaseLiveUrl(c!)).toBeNull();
    expect(isCasePubliclyVisible("trustbooker")).toBe(true);
    expect(isCaseSearchIndexable(c!)).toBe(false);
  });

  it("rejects COMING_SOON with an active live link", () => {
    const bad: CaseDefinition = {
      ...getCaseBySlug("trustbooker")!,
      liveLinkActive: true,
      externalUrl: "https://example.com",
    };
    expect(() => assertCaseLiveLinkRules(bad)).toThrow(/liveLinkActive/);
  });

  it("requires HTTPS URL to promote to LIVE", () => {
    expect(() =>
      promoteCaseToLive("trustbooker", "http://insecure.example"),
    ).toThrow(/HTTPS/);
    const next = promoteCaseToLive(
      "trustbooker",
      "https://trustbooker.example/",
    );
    expect(next.launchStatus).toBe("LIVE");
    expect(next.liveLinkActive).toBe(true);
    expect(next.externalUrl).toBe("https://trustbooker.example/");
  });

  it("has local preview assets and coming-soon copy", () => {
    const dir = path.join(process.cwd(), "public", "cases", "trustbooker");
    for (const f of [
      "desktop-dashboard.webp",
      "mobile-preview.webp",
      "platform-preview.webp",
    ]) {
      expect(fs.existsSync(path.join(dir, f)), `missing ${f}`).toBe(true);
    }
    const en = getCommercialContent("en").trustbooker;
    const nl = getCommercialContent("nl").trustbooker;
    expect(en.openLive).toBe("");
    expect(nl.openLive).toBe("");
    expect(en.seoTitle.toLowerCase()).toMatch(/coming soon|in development/);
    expect(nl.seoTitle.toLowerCase()).toMatch(/binnenkort|ontwikkeling/);
    expect(en.label.toLowerCase()).toMatch(/coming soon|in development/);
    expect(nl.label.toLowerCase()).toMatch(/binnenkort|ontwikkeling/);
  });

  it("does not present TrustBooker as live in detail page source", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "src/components/cases/trustbooker-case-page.tsx"),
      "utf8",
    );
    expect(src).toMatch(/COMING_SOON/);
    expect(src).toMatch(/showLiveButtons=\{false\}/);
    expect(src).toMatch(/liveUrl=\{null\}/);
    expect(src).not.toMatch(/https?:\/\/[^\s"']*trustbooker/i);
  });
});

describe("Portfolio case ordering", () => {
  it("keeps Vermeulen and sorts live before coming soon", () => {
    const featured = getFeaturedPortfolioCases();
    expect(featured.some((c) => c.slug === "vermeulen-bouwservice")).toBe(true);
    expect(featured.some((c) => c.slug === "grill-gasten")).toBe(true);
    expect(featured.some((c) => c.slug === "trustbooker")).toBe(true);

    const liveIndexes = featured
      .map((c, i) => (c.launchStatus === "LIVE" ? i : -1))
      .filter((i) => i >= 0);
    const soonIndexes = featured
      .map((c, i) =>
        c.launchStatus === "COMING_SOON" || c.launchStatus === "IN_DEVELOPMENT"
          ? i
          : -1,
      )
      .filter((i) => i >= 0);

    expect(Math.max(...liveIndexes)).toBeLessThan(Math.min(...soonIndexes));
  });

  it("includes all three in public cases", () => {
    const slugs = getPublicCases().map((c) => c.slug);
    expect(slugs).toContain("vermeulen-bouwservice");
    expect(slugs).toContain("grill-gasten");
    expect(slugs).toContain("trustbooker");
  });
});

describe("Portfolio safety invariants", () => {
  it("does not use iframe embeds in case preview component source", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "src/components/visuals/site-browser-preview.tsx"),
      "utf8",
    );
    expect(src.toLowerCase()).not.toMatch(/<iframe/);
  });

  it("keeps external LinkButton noopener on shared link button", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "src/components/ui/link-button.tsx"),
      "utf8",
    );
    expect(src).toMatch(/noopener noreferrer/);
  });

  it("keeps checkout off and P05 unset", () => {
    expect(isDirectCheckoutEnabled()).toBe(false);
    expect(process.env.CHECKOUT_ENABLED === "true").toBe(false);
    expect(process.env.P05_MIGRATION_APPLIED).toBeFalsy();
  });

  it("excludes TrustBooker from sitemap indexability helper", () => {
    const trust = getCaseBySlug("trustbooker")!;
    const grill = getCaseBySlug("grill-gasten")!;
    expect(isCaseSearchIndexable(trust)).toBe(false);
    expect(isCaseSearchIndexable(grill)).toBe(true);
  });
});
