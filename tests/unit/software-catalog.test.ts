import { describe, expect, it } from "vitest";
import {
  SOFTWARE_CATALOG_SOURCE_SHA256,
  SOFTWARE_CATALOG_STATS,
  assertCatalogIntegrity,
  getSoftwareBySlug,
  isSoftwareItemPublic,
  querySoftwareCatalog,
  softwareCatalogBlockedRefs,
  softwareCatalogItems,
  toPublicDto,
} from "@/config/software-catalog";
import type { SoftwareCatalogItem } from "@/config/software-catalog";

const EXPECTED_SHA =
  "242f18ef2719f3ed61c0a56eab673aa818980db1a70e6b9fef4f32353af43036";

const ANCHORS: { match: RegExp; advice: number }[] = [
  { match: /^Win 11 Pro Retail$/i, advice: 44.99 },
  { match: /^Win 10 Pro Retail$/i, advice: 24.99 },
  { match: /^Win 11 Pro OEM$/i, advice: 39.99 },
  { match: /^win 11 home retail$/i, advice: 34.99 },
  { match: /^win 10 home retail$/i, advice: 19.99 },
  { match: /^Win 11 Home OEM$/i, advice: 29.99 },
  { match: /^Win 10 Pro OEM$/i, advice: 19.99 },
  { match: /^(Win|Windows) 10 Home OEM$/i, advice: 14.99 },
  { match: /McAfee Internet Security.*10/i, advice: 69.99 },
  { match: /Norton 360 Premium.*10\s*PC/i, advice: 69.99 },
  { match: /Norton 360 Premium.*5\s*PC/i, advice: 49.99 },
  { match: /Norton 360 Premium.*3\s*PC/i, advice: 39.99 },
  { match: /Norton 360 Premium.*(?<![\d])1\s*PC/i, advice: 34.99 },
  { match: /ESET NOD32 Antivirus.*1/i, advice: 24.99 },
  { match: /Acronis Cyber Protect Home Office/i, advice: 89.99 },
  { match: /IDM Internet Download Manager Lifetime/i, advice: 59.99 },
  { match: /CCleaner Pro Key 1 year 1pc/i, advice: 44.99 },
  { match: /Parallels Desktop 19/i, advice: 89.99 },
  { match: /Parallels Desktop 20/i, advice: 89.99 },
  { match: /Affinity V2 Full Set/i, advice: 124.99 },
];

describe("software catalog import integrity", () => {
  it("matches source SHA and 468/72/396 counts", () => {
    expect(SOFTWARE_CATALOG_SOURCE_SHA256).toBe(EXPECTED_SHA);
    expect(SOFTWARE_CATALOG_STATS.totalSourceRows).toBe(468);
    expect(SOFTWARE_CATALOG_STATS.greenCount).toBe(72);
    expect(SOFTWARE_CATALOG_STATS.redCount).toBe(396);
    expect(SOFTWARE_CATALOG_STATS.selectionPct).toBeCloseTo(15.384615, 4);
    const integrity = assertCatalogIntegrity();
    expect(integrity.ok, integrity.errors.join("; ")).toBe(true);
  });

  it("has unique slugs and dispositions for every green/red row", () => {
    const slugs = new Set(softwareCatalogItems.map((i) => i.slug));
    expect(slugs.size).toBe(72);
    for (const item of softwareCatalogItems) {
      expect(item.sourceLabel.length).toBeGreaterThan(0);
      expect(item.sourceRowNumber).toBeGreaterThan(0);
    }
    expect(softwareCatalogBlockedRefs).toHaveLength(396);
    for (const ref of softwareCatalogBlockedRefs) {
      expect(ref.publicationStatus).toBe("BLOCKED");
      expect(ref.disposition).toBe("BLOCKED_RED_NOT_OFFERED");
    }
  });

  it("includes known green anchors with historical advice only as internal", () => {
    for (const anchor of ANCHORS) {
      const hit = softwareCatalogItems.find((i) =>
        anchor.match.test(i.sourceLabel),
      );
      expect(hit, String(anchor.match)).toBeTruthy();
      expect(hit!.internalSourceAdviceEur).toBe(anchor.advice);
      expect(hit!.publicPriceEur).toBeNull();
      expect(hit!.publicationStatus).not.toBe("PUBLIC_PRICE_VERIFIED");
    }
  });

  it("never exposes internal advice or costs in public DTOs", () => {
    const page = querySoftwareCatalog("nl", { page: 1, pageSize: 12 });
    expect(page.items.length).toBeLessThanOrEqual(12);
    expect(page.total).toBe(72);
    for (const dto of page.items) {
      const json = JSON.stringify(dto);
      expect(json).not.toMatch(/internalSourceAdvice|inkoop|marge|purchase/i);
      expect(dto.publicPriceEur).toBeNull();
      expect(dto.priceLabel).toBe("on_request");
    }
  });

  it("blocks PUBLIC_PRICE_VERIFIED without evidence", () => {
    const fake: SoftwareCatalogItem = {
      ...softwareCatalogItems[0]!,
      publicationStatus: "PUBLIC_PRICE_VERIFIED",
      publicPriceEur: 9.99,
      evidenceStatus: "MISSING_PRICE_SOURCE",
    };
    expect(isSoftwareItemPublic(fake)).toBe(false);
    expect(toPublicDto(fake, "nl")).toBeNull();
  });

  it("keeps red products out of public query results", () => {
    const redLabel = softwareCatalogBlockedRefs[0]!.sourceLabel;
    const page = querySoftwareCatalog("en", { q: redLabel.slice(0, 12) });
    expect(
      page.items.every((i) => !i.name.toLowerCase().includes("github copilo")),
    ).toBe(true);
    expect(softwareCatalogItems.some((i) => i.sourceLabel === redLabel)).toBe(
      false,
    );
  });

  it("paginates all 72 public candidates", () => {
    const seen = new Set<string>();
    let page = 1;
    let totalPages = 1;
    do {
      const result = querySoftwareCatalog("nl", { page, pageSize: 12 });
      totalPages = result.totalPages;
      for (const item of result.items) seen.add(item.slug);
      page += 1;
    } while (page <= totalPages);
    expect(seen.size).toBe(72);
  });

  it("resolves detail by slug", () => {
    const first = softwareCatalogItems[0]!;
    const dto = getSoftwareBySlug(first.slug, "en");
    expect(dto?.slug).toBe(first.slug);
  });
});
