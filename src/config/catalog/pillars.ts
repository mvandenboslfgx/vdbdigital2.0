import { paths } from "@/i18n/config";
import type { SoftwareCatalogGroup } from "@/config/software-catalog/types";
import type { CommercialCatalogItem } from "@/config/commercial/pricing";

/** Central product pillar taxonomy — presentation layer over existing models */
export type CatalogPillar = "BUILD" | "AUTOMATE" | "GROW" | "SOFTWARE";

export const CATALOG_PILLAR_ORDER: CatalogPillar[] = [
  "BUILD",
  "AUTOMATE",
  "GROW",
  "SOFTWARE",
];

export interface CatalogPillarDefinition {
  id: CatalogPillar;
  slug: string;
  i18nKey: Lowercase<CatalogPillar>;
  sortOrder: number;
  /** DB category slugs included in this pillar */
  productCategorySlugs: readonly string[];
  /** commercial/pricing.ts catalog slugs */
  commercialCatalogSlugs: readonly string[];
  /** Solution page paths for nav */
  solutionPaths: readonly string[];
  /** Software catalog groups (SOFTWARE pillar only) */
  softwareGroups?: readonly SoftwareCatalogGroup[];
  /** Shop anchor path */
  shopHref: string;
  secondary: boolean;
}

export const catalogPillars: CatalogPillarDefinition[] = [
  {
    id: "BUILD",
    slug: "build",
    i18nKey: "build",
    sortOrder: 1,
    productCategorySlugs: [
      "websites",
      "webshops",
      "maatwerk",
      "templates",
    ],
    commercialCatalogSlugs: [
      "onepage-website",
      "launch-website",
      "growth-website",
      "custom-website",
      "webshop-launch",
      "website-launch-system",
      "webshop-launch-system",
      "business-growth-system",
    ],
    solutionPaths: [
      paths.websites,
      paths.webshops,
      paths.customSoftware,
      paths.customWebsites,
    ],
    shopHref: `${paths.shop}?pillar=build`,
    secondary: false,
  },
  {
    id: "AUTOMATE",
    slug: "automate",
    i18nKey: "automate",
    sortOrder: 2,
    productCategorySlugs: [
      "ai-automatisering",
      "whatsapp-oplossingen",
      "reviewflows",
    ],
    commercialCatalogSlugs: ["automation-system"],
    solutionPaths: [
      paths.aiAutomation,
      paths.whatsappAi,
      paths.appointmentAutomation,
      paths.reviewflows,
      paths.reviewFlows,
    ],
    shopHref: `${paths.shop}?pillar=automate`,
    secondary: false,
  },
  {
    id: "GROW",
    slug: "grow",
    i18nKey: "grow",
    sortOrder: 3,
    productCategorySlugs: ["onderhoud", "support", "hosting"],
    commercialCatalogSlugs: [
      "essential-care",
      "business-care",
      "growth-care",
      "digital-partner",
    ],
    solutionPaths: [
      paths.websiteMaintenance,
      paths.technicalSupport,
      paths.conversionOptimisation,
    ],
    shopHref: `${paths.shop}?pillar=grow`,
    secondary: false,
  },
  {
    id: "SOFTWARE",
    slug: "software",
    i18nKey: "software",
    sortOrder: 4,
    productCategorySlugs: [],
    commercialCatalogSlugs: [],
    solutionPaths: [],
    softwareGroups: ["windows", "security", "tools", "professional"],
    shopHref: paths.shopSoftware,
    secondary: true,
  },
];

export function getPillarById(id: CatalogPillar): CatalogPillarDefinition {
  const pillar = catalogPillars.find((p) => p.id === id);
  if (!pillar) throw new Error(`Unknown pillar: ${id}`);
  return pillar;
}

export function getPillarBySlug(slug: string): CatalogPillarDefinition | undefined {
  return catalogPillars.find((p) => p.slug === slug.toLowerCase());
}

export function resolvePillarForCategorySlug(
  categorySlug: string | null | undefined,
): CatalogPillar | null {
  if (!categorySlug) return null;
  for (const pillar of catalogPillars) {
    if (pillar.productCategorySlugs.includes(categorySlug)) return pillar.id;
  }
  return null;
}

export function resolvePillarForCommercialSlug(
  catalogSlug: string,
): CatalogPillar | null {
  for (const pillar of catalogPillars) {
    if (pillar.commercialCatalogSlugs.includes(catalogSlug)) return pillar.id;
  }
  return null;
}

export function categorySlugsForPillar(pillar: CatalogPillar): string[] {
  return [...getPillarById(pillar).productCategorySlugs];
}

export function isCommercialInPillar(
  item: Pick<CommercialCatalogItem, "slug" | "category">,
  pillar: CatalogPillar,
): boolean {
  const def = getPillarById(pillar);
  if (def.commercialCatalogSlugs.includes(item.slug)) return true;
  if (pillar === "BUILD") {
    return item.category === "website" || item.category === "webshop" || item.category === "custom" || item.category === "bundle";
  }
  if (pillar === "AUTOMATE") return item.category === "automation";
  if (pillar === "GROW") {
    return item.category === "care" || item.category === "support";
  }
  return false;
}
