/**
 * Software catalog public surface.
 * Import ONLY from `(shop)` routes — never from marketing layouts/homepage.
 */
export type {
  SoftwareCatalogBlockedRef,
  SoftwareCatalogGroup,
  SoftwareCatalogItem,
  SoftwareEvidenceStatus,
  SoftwarePublicDto,
  SoftwarePublicationStatus,
} from "./types";
export {
  SOFTWARE_GROUP_LABELS,
  SOFTWARE_GROUP_ORDER,
} from "./types";
export {
  SOFTWARE_CATALOG_SOURCE_SHA256,
  SOFTWARE_CATALOG_STATS,
  softwareCatalogBlockedRefs,
  softwareCatalogItems,
} from "./generated-inventory";
export {
  PAGE_SIZE,
  assertCatalogIntegrity,
  getAllPublicSoftwareSlugs,
  getSoftwareBySlug,
  groupLabel,
  isSoftwareItemPublic,
  querySoftwareCatalog,
  toPublicDto,
} from "./query";
