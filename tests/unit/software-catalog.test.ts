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
import {
  PERMANENT_BLOCK_SOURCE_NRS,
  CURATED_PUBLIC_SOURCE_NRS,
} from "@/config/software-catalog/policies";

const EXPECTED_SHA =
  "242f18ef2719f3ed61c0a56eab673aa818980db1a70e6b9fef4f32353af43036";

describe("software catalog import integrity", () => {
  it("matches source SHA and 468/72/396 counts", () => {
    expect(SOFTWARE_CATALOG_SOURCE_SHA256).toBe(EXPECTED_SHA);
    expect(SOFTWARE_CATALOG_STATS.totalSourceRows).toBe(468);
    expect(SOFTWARE_CATALOG_STATS.greenCount).toBe(72);
    expect(SOFTWARE_CATALOG_STATS.redCount).toBe(396);
    const integrity = assertCatalogIntegrity();
    expect(integrity.ok, integrity.errors.join("; ")).toBe(true);
  });

  it("has unique slugs, disposition and verification for every green row", () => {
    const slugs = new Set(softwareCatalogItems.map((i) => i.slug));
    expect(slugs.size).toBe(72);
    for (const item of softwareCatalogItems) {
      expect(item.sourceLabel.length).toBeGreaterThan(0);
      expect(item.sourceRowNumber).toBeGreaterThan(0);
      expect(item.disposition).toBeTruthy();
      expect(item.verification).toBeTruthy();
    }
    expect(softwareCatalogBlockedRefs).toHaveLength(396);
    for (const ref of softwareCatalogBlockedRefs) {
      expect(ref.publicationStatus).toBe("BLOCKED");
      expect(ref.disposition).toBe("BLOCKED_RED_NOT_OFFERED");
    }
  });

  it("archives master-fixlist blocked SKUs without deleting rows", () => {
    for (const nr of PERMANENT_BLOCK_SOURCE_NRS) {
      const item = softwareCatalogItems.find((i) => i.sourceNr === nr);
      expect(item, `missing archived row ${nr}`).toBeTruthy();
      expect(item!.publicationStatus).toBe("BLOCKED");
      expect(item!.disposition).toBe("ARCHIVED_MASTER_FIXLIST");
      expect(isSoftwareItemPublic(item!)).toBe(false);
    }
  });

  it("hides Windows 10 from default public browse (legacy only)", () => {
    const win10 = softwareCatalogItems.filter((i) =>
      /windows 10/i.test(i.nameEn),
    );
    expect(win10.length).toBe(4);
    for (const item of win10) {
      expect(item.publicationStatus).toBe("LEGACY_REQUEST_ONLY");
      expect(isSoftwareItemPublic(item)).toBe(false);
    }
  });

  it("normalizes canonical names (no MAc, lpad, 1pc, Key)", () => {
    const affinity = softwareCatalogItems.find((i) => i.sourceNr === 57);
    expect(affinity?.nameEn).not.toContain("lpad");
    expect(affinity?.nameEn).not.toContain("MAc");
    expect(affinity?.nameEn).not.toMatch(/\bKey\b/);
    expect(affinity?.nameEn).toMatch(/Mac\+Windows\+iPad/);
    const norton = softwareCatalogItems.find((i) => i.sourceNr === 10);
    expect(norton?.nameEn).toMatch(/10 devices/i);
    expect(norton?.nameEn).not.toMatch(/10PC|1pc/i);
  });

  it("fail-closed: zero public SKUs until verification metadata is complete", () => {
    expect(SOFTWARE_CATALOG_STATS.publicEligibleCount).toBe(0);
    const page = querySoftwareCatalog("nl", { page: 1, pageSize: 12 });
    expect(page.total).toBe(0);
    expect(page.items).toHaveLength(0);
  });

  it("never exposes internal advice or Unknown/unspecified in public DTOs", () => {
    for (const item of softwareCatalogItems) {
      const dto = toPublicDto(item, "nl");
      if (!dto) continue;
      const json = JSON.stringify(dto);
      expect(json).not.toMatch(/internalSourceAdvice|inkoop|marge|purchase/i);
      expect(json).not.toMatch(/Unknown|unspecified/i);
    }
  });

  it("blocks PUBLIC_PRICE_VERIFIED without evidence", () => {
    const fake: SoftwareCatalogItem = {
      ...softwareCatalogItems[0]!,
      publicationStatus: "PUBLIC_PRICE_VERIFIED",
      publicPriceEur: 9.99,
      evidenceStatus: "MISSING_PRICE_SOURCE",
      disposition: "CURATED_PUBLIC_CANDIDATE",
      verification: {
        ...softwareCatalogItems[0]!.verification,
        manufacturer: "Microsoft",
        canonicalProductName: "Test",
        edition: "Retail",
        platform: "Windows",
        licenseType: "Retail",
        term: "Perpetual",
        region: "EU",
        activationMethod: "Key",
        supplier: "Verified",
        supplierAvailability: "Available",
        licenseProvenance: "Verified",
        supportResponsibility: "VDB",
        lastVerifiedAt: "2026-01-01",
        verifiedBy: "ops",
        version: null,
        deviceCount: 1,
        userCount: null,
        supplierProductReference: null,
        purchaseCostEur: null,
        vatHandling: null,
        refundEligibility: null,
      },
    };
    expect(isSoftwareItemPublic(fake)).toBe(false);
    expect(toPublicDto(fake, "nl")).toBeNull();
  });

  it("keeps red products out of softwareCatalogItems", () => {
    const redLabel = softwareCatalogBlockedRefs[0]!.sourceLabel;
    expect(softwareCatalogItems.some((i) => i.sourceLabel === redLabel)).toBe(
      false,
    );
  });

  it("curates at most 20 candidate SKUs for future publication", () => {
    expect(CURATED_PUBLIC_SOURCE_NRS.size).toBeGreaterThanOrEqual(12);
    expect(CURATED_PUBLIC_SOURCE_NRS.size).toBeLessThanOrEqual(20);
    for (const nr of CURATED_PUBLIC_SOURCE_NRS) {
      const item = softwareCatalogItems.find((i) => i.sourceNr === nr);
      expect(item?.disposition).toBe("CURATED_PUBLIC_CANDIDATE");
    }
  });

  it("does not resolve blocked slugs publicly", () => {
    const blocked = softwareCatalogItems.find((i) => i.sourceNr === 57)!;
    expect(getSoftwareBySlug(blocked.slug, "en")).toBeNull();
  });
});
