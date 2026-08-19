import { describe, expect, it } from "vitest";
import {
  CATALOG_PILLAR_ORDER,
  catalogPillars,
  categorySlugsForPillar,
  getPillarBySlug,
  resolvePillarForCategorySlug,
} from "@/config/catalog";
import { resolveCanonicalOfferingRef } from "@/lib/commerce/catalog-ssot";
import { paths } from "@/i18n/config";

describe("catalog pillars", () => {
  it("orders BUILD → AUTOMATE → GROW → SOFTWARE", () => {
    expect(CATALOG_PILLAR_ORDER).toEqual([
      "BUILD",
      "AUTOMATE",
      "GROW",
      "SOFTWARE",
    ]);
  });

  it("marks SOFTWARE as secondary with dedicated shop route", () => {
    const software = catalogPillars.find((p) => p.id === "SOFTWARE")!;
    expect(software.secondary).toBe(true);
    expect(software.shopHref).toBe(paths.shopSoftware);
  });

  it("maps website category to BUILD pillar", () => {
    expect(resolvePillarForCategorySlug("websites")).toBe("BUILD");
    expect(categorySlugsForPillar("BUILD")).toContain("websites");
  });

  it("maps AI category to AUTOMATE pillar", () => {
    expect(resolvePillarForCategorySlug("ai-automatisering")).toBe("AUTOMATE");
  });

  it("resolves canonical offering refs without duplicating models", () => {
    const launch = resolveCanonicalOfferingRef("launch-website");
    expect(launch?.kind).toBe("commercial");
    expect(launch?.pillar).toBe("BUILD");
    expect(launch?.id).toBe("pkg-launch");
  });

  it("defaults unknown pillar slug to BUILD lookup undefined", () => {
    expect(getPillarBySlug("unknown")).toBeUndefined();
    expect(getPillarBySlug("build")?.id).toBe("BUILD");
  });
});
