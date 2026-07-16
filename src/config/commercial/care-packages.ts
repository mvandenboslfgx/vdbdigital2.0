import { getCatalogItem, type CommercialCatalogItem } from "@/config/commercial/pricing";

export type CarePackageId = "essential" | "business" | "growth" | "partner";

export interface CarePackageDefinition {
  id: CarePackageId;
  slug: string;
  i18nKey: CarePackageId;
  catalogSlug: string;
  changeHoursPerMonth: number;
  /** Unused hours may roll over max 1 month — never unlimited */
  rolloverMonths: number;
  quoteOnly: boolean;
  sortOrder: number;
}

export const carePackages: CarePackageDefinition[] = [
  {
    id: "essential",
    slug: "essential-care",
    i18nKey: "essential",
    catalogSlug: "essential-care",
    changeHoursPerMonth: 0,
    rolloverMonths: 0,
    quoteOnly: false,
    sortOrder: 1,
  },
  {
    id: "business",
    slug: "business-care",
    i18nKey: "business",
    catalogSlug: "business-care",
    changeHoursPerMonth: 1,
    rolloverMonths: 1,
    quoteOnly: false,
    sortOrder: 2,
  },
  {
    id: "growth",
    slug: "growth-care",
    i18nKey: "growth",
    catalogSlug: "growth-care",
    changeHoursPerMonth: 3,
    rolloverMonths: 1,
    quoteOnly: false,
    sortOrder: 3,
  },
  {
    id: "partner",
    slug: "digital-partner",
    i18nKey: "partner",
    catalogSlug: "digital-partner",
    changeHoursPerMonth: 0,
    rolloverMonths: 0,
    quoteOnly: true,
    sortOrder: 4,
  },
];

export function getCareCatalogItem(
  pkg: CarePackageDefinition,
): CommercialCatalogItem | undefined {
  return getCatalogItem(pkg.catalogSlug);
}
