/**
 * Software catalog — import/policy module.
 * Public software routes consume via `@/server/repositories/software-public-catalog`.
 * DB shop products consume via `@/server/repositories/public-shop-catalog`.
 */export type {
  SoftwareCatalogBlockedRef,
  SoftwareCatalogGroup,
  SoftwareCatalogItem,
  SoftwareDisposition,
  SoftwareEvidenceStatus,
  SoftwarePublicDto,
  SoftwarePublicationStatus,
  SoftwareVerificationMeta,
} from "./types";
export type { SoftwareCatalogQuery, SoftwareCatalogPageResult } from "./query";
export { SOFTWARE_GROUP_LABELS, SOFTWARE_GROUP_ORDER } from "./types";
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
