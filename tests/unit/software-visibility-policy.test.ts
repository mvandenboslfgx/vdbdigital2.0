import { describe, expect, it } from "vitest";
import {
  querySoftwareCatalog,
  softwareCatalogItems,
} from "@/config/software-catalog";
import {
  isPublicVerifiedSoftwareItem,
  isSoftwareItemPublic,
} from "@/config/software-catalog/verification";
import { queryPublicSoftwareCatalog } from "@/server/repositories/software-public-catalog";

describe("software visibility policy", () => {
  it("never exposes BLOCKED, LEGACY_REQUEST_ONLY or CANDIDATE_REVIEW in browse", () => {
    const hidden = softwareCatalogItems.filter(
      (item) =>
        item.publicationStatus === "BLOCKED" ||
        item.publicationStatus === "LEGACY_REQUEST_ONLY" ||
        item.publicationStatus === "CANDIDATE_REVIEW" ||
        item.disposition === "ARCHIVED_MASTER_FIXLIST" ||
        item.disposition === "CANDIDATE_REVIEW",
    );
    expect(hidden.length).toBeGreaterThan(0);

    for (const item of hidden) {
      expect(isSoftwareItemPublic(item)).toBe(false);
      expect(isPublicVerifiedSoftwareItem(item)).toBe(false);
    }

    const page = querySoftwareCatalog("nl", { pageSize: 48 });
    const publicPage = queryPublicSoftwareCatalog("nl", { pageSize: 48 });
    expect(page.total).toBe(0);
    expect(publicPage.total).toBe(0);
    expect(page.items).toHaveLength(0);
  });

  it("returns empty browse for search queries against hidden inventory", () => {
    const affinity = softwareCatalogItems.find((i) => i.sourceNr === 57)!;
    const page = querySoftwareCatalog("en", { q: affinity.sourceLabel.slice(0, 8) });
    expect(page.items).toHaveLength(0);
  });

  it("treats only gate-passed PUBLIC_* statuses as public verified", () => {
    for (const item of softwareCatalogItems) {
      const isPublic = isPublicVerifiedSoftwareItem(item);
      if (isPublic) {
        expect(["PUBLIC_REQUEST_ONLY", "PUBLIC_PRICE_VERIFIED"]).toContain(
          item.publicationStatus,
        );
      }
    }
  });
});

describe("software empty catalog procurement state", () => {
  it("reports zero public verified SKUs for procurement UI", () => {
    const stats = softwareCatalogItems.filter(isPublicVerifiedSoftwareItem);
    expect(stats.length).toBe(0);
  });
});
