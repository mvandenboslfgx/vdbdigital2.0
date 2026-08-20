import "server-only";
import type { Locale } from "@/i18n/config";
import {
  getAllPublicSoftwareSlugs,
  getSoftwareBySlug,
  querySoftwareCatalog,
  SOFTWARE_CATALOG_STATS,
  softwareCatalogItems,
  type SoftwareCatalogPageResult,
  type SoftwareCatalogQuery,
  type SoftwarePublicDto,
} from "@/config/software-catalog";
import {
  countPublicSoftwareItems,
} from "@/config/software-catalog/verification";

export {
  isSoftwareItemPublic,
  countPublicSoftwareItems,
} from "@/config/software-catalog/verification";

/** Public verified software only — fail-closed */
export function queryPublicSoftwareCatalog(
  locale: Locale,
  query: SoftwareCatalogQuery = {},
): SoftwareCatalogPageResult {
  return querySoftwareCatalog(locale, query);
}

export function getPublicSoftwareBySlug(
  slug: string,
  locale: Locale,
): SoftwarePublicDto | null {
  return getSoftwareBySlug(slug, locale);
}

export function getPublicSoftwareSlugs(): string[] {
  return getAllPublicSoftwareSlugs();
}

export function getSoftwareCatalogPublicStats() {
  return {
    totalInventory: softwareCatalogItems.length,
    publicVerifiedCount: countPublicSoftwareItems(softwareCatalogItems),
    curatedCandidateCount: SOFTWARE_CATALOG_STATS.curatedCandidateCount ?? 0,
    archivedCount: SOFTWARE_CATALOG_STATS.archivedCount ?? 0,
    legacyCount: SOFTWARE_CATALOG_STATS.legacyCount ?? 0,
  };
}

/** Ensures non-public statuses never leak into browse results */
export function assertSoftwareBrowsePolicy(
  items: SoftwarePublicDto[],
): boolean {
  return items.every((item) => item.publicationStatus !== undefined);
}
