import { describe, it, expect } from "vitest";
import {
  isAppBannerAllowedOnRoute,
  isGloballyExcluded,
  isPlacementAllowedOnRoute,
  matchesRouteList,
  stripLocaleFromPathname,
  GLOBALLY_EXCLUDED_ROUTES,
} from "@/config/promotion-policy";

// ---------------------------------------------------------------------------
// stripLocaleFromPathname
// ---------------------------------------------------------------------------

describe("stripLocaleFromPathname", () => {
  it("strips /nl prefix", () => {
    expect(stripLocaleFromPathname("/nl/solutions")).toBe("/solutions");
  });
  it("handles /nl root", () => {
    expect(stripLocaleFromPathname("/nl")).toBe("/");
  });
  it("leaves English paths unchanged", () => {
    expect(stripLocaleFromPathname("/solutions")).toBe("/solutions");
  });
});

// ---------------------------------------------------------------------------
// matchesRouteList
// ---------------------------------------------------------------------------

describe("matchesRouteList", () => {
  it("matches exact route", () => {
    expect(matchesRouteList("/contact", ["/contact"])).toBe(true);
  });
  it("matches prefix route", () => {
    expect(matchesRouteList("/checkout/betaling", ["/checkout/"])).toBe(true);
  });
  it("does not over-match /check against /checkout/", () => {
    expect(matchesRouteList("/check", ["/checkout/"])).toBe(false);
  });
  it("does not match wrong prefix", () => {
    expect(matchesRouteList("/solutions", ["/admin/"])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isGloballyExcluded
// ---------------------------------------------------------------------------

describe("isGloballyExcluded", () => {
  const excluded = [
    "/inloggen",
    "/account-aanmaken",
    "/checkout",
    "/checkout/success",
    "/portal/facturen",
    "/admin/dashboard",
    "/api/payments",
    "/privacy",
    "/cookies",
    "/terms",
    "/refund-policy",
  ];
  excluded.forEach((path) => {
    it(`excludes ${path}`, () => {
      expect(isGloballyExcluded(path)).toBe(true);
    });
  });

  const notExcluded = [
    "/",
    "/solutions",
    "/about",
    "/cases",
    "/packages",
    "/process",
  ];
  notExcluded.forEach((path) => {
    it(`allows ${path}`, () => {
      expect(isGloballyExcluded(path)).toBe(false);
    });
  });

  it("excludes Dutch /nl/inloggen", () => {
    expect(isGloballyExcluded("/nl/inloggen")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isAppBannerAllowedOnRoute
// ---------------------------------------------------------------------------

describe("isAppBannerAllowedOnRoute", () => {
  const bannerExcluded = [
    "/inloggen",
    "/checkout",
    "/checkout/success",
    "/portal/facturen",
    "/admin/settings",
    "/privacy",
    "/quote",
    "/support",
    "/contact",
  ];
  bannerExcluded.forEach((path) => {
    it(`banner not allowed on ${path}`, () => {
      expect(isAppBannerAllowedOnRoute(path)).toBe(false);
    });
  });

  const bannerAllowed = [
    "/",
    "/solutions",
    "/solutions/websites",
    "/cases",
    "/about",
    "/packages",
    "/process",
  ];
  bannerAllowed.forEach((path) => {
    it(`banner allowed on ${path}`, () => {
      expect(isAppBannerAllowedOnRoute(path)).toBe(true);
    });
  });

  it("excludes Dutch /nl/contact", () => {
    expect(isAppBannerAllowedOnRoute("/nl/contact")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isPlacementAllowedOnRoute
// ---------------------------------------------------------------------------

describe("isPlacementAllowedOnRoute — knowledge_article_end", () => {
  it("allowed on /support/article", () => {
    expect(isPlacementAllowedOnRoute("knowledge_article_end", "/support/article")).toBe(true);
  });
  it("not allowed on /admin/", () => {
    expect(isPlacementAllowedOnRoute("knowledge_article_end", "/admin/settings")).toBe(false);
  });
  it("not allowed on /portal/", () => {
    expect(isPlacementAllowedOnRoute("knowledge_article_end", "/portal/facturen")).toBe(false);
  });
  it("not allowed on /checkout", () => {
    expect(isPlacementAllowedOnRoute("knowledge_article_end", "/checkout")).toBe(false);
  });
  it("not allowed on unrelated routes (no allowedRoutes match)", () => {
    // knowledge_article_end only allows /support/ and /solutions/
    expect(isPlacementAllowedOnRoute("knowledge_article_end", "/cases/grill-gasten")).toBe(false);
  });
});

describe("isPlacementAllowedOnRoute — case_study_end", () => {
  it("allowed on /cases/my-case", () => {
    expect(isPlacementAllowedOnRoute("case_study_end", "/cases/my-case")).toBe(true);
  });
  it("not allowed on /admin/", () => {
    expect(isPlacementAllowedOnRoute("case_study_end", "/admin/")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// GLOBALLY_EXCLUDED_ROUTES completeness
// ---------------------------------------------------------------------------

describe("GLOBALLY_EXCLUDED_ROUTES completeness", () => {
  const criticalExclusions = [
    "/checkout",
    "/portal/",
    "/admin/",
    "/api/",
    "/inloggen",
    "/privacy",
    "/cookies",
  ];
  criticalExclusions.forEach((route) => {
    it(`contains ${route}`, () => {
      const found = GLOBALLY_EXCLUDED_ROUTES.some(
        (r) => r === route || route.startsWith(r) || r.startsWith(route),
      );
      expect(found).toBe(true);
    });
  });
});
