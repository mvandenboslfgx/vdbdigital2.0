import { getCatalogItem, type CommercialCatalogItem } from "@/config/commercial/pricing";

export type BundleId =
  | "website-launch"
  | "business-growth"
  | "automation"
  | "webshop-launch"
  | "digital-partner";

export type BillingModel =
  | "one_time"
  | "recurring"
  | "one_time_plus_recurring"
  | "proposal_only";

export interface BundleDefinition {
  id: BundleId;
  slug: string;
  i18nKey: BundleId;
  catalogSlug: string;
  billingModel: BillingModel;
  b2b: boolean;
  b2c: boolean;
  foundingEligible: boolean;
  sortOrder: number;
  featureCount: number;
  includedRefs: string[];
}

export const commercialBundles: BundleDefinition[] = [
  {
    id: "website-launch",
    slug: "website-launch-system",
    i18nKey: "website-launch",
    catalogSlug: "website-launch-system",
    billingModel: "one_time_plus_recurring",
    b2b: true,
    b2c: true,
    foundingEligible: true,
    sortOrder: 1,
    featureCount: 5,
    includedRefs: ["launch-website", "essential-care"],
  },
  {
    id: "business-growth",
    slug: "business-growth-system",
    i18nKey: "business-growth",
    catalogSlug: "business-growth-system",
    billingModel: "one_time_plus_recurring",
    b2b: true,
    b2c: false,
    foundingEligible: true,
    sortOrder: 2,
    featureCount: 6,
    includedRefs: ["growth-website", "business-care"],
  },
  {
    id: "webshop-launch",
    slug: "webshop-launch-system",
    i18nKey: "webshop-launch",
    catalogSlug: "webshop-launch-system",
    billingModel: "one_time",
    b2b: true,
    b2c: true,
    foundingEligible: true,
    sortOrder: 3,
    featureCount: 5,
    includedRefs: ["webshop-launch"],
  },
  {
    id: "automation",
    slug: "automation-system",
    i18nKey: "automation",
    catalogSlug: "automation-system",
    billingModel: "proposal_only",
    b2b: true,
    b2c: false,
    foundingEligible: true,
    sortOrder: 4,
    featureCount: 6,
    includedRefs: [],
  },
  {
    id: "digital-partner",
    slug: "digital-partner-system",
    i18nKey: "digital-partner",
    catalogSlug: "digital-partner-system",
    billingModel: "proposal_only",
    b2b: true,
    b2c: false,
    foundingEligible: false,
    sortOrder: 5,
    featureCount: 6,
    includedRefs: ["digital-partner"],
  },
];

export function getBundleCatalogItem(
  bundle: BundleDefinition,
): CommercialCatalogItem | undefined {
  return getCatalogItem(bundle.catalogSlug);
}
