/**
 * Canonical offering resolution — thin SSOT layer over existing models.
 * Does NOT duplicate product rows; maps slugs/IDs to pillars and kinds.
 */
import {
  getCatalogItem,
  commercialCatalog,
  type CommercialCatalogItem,
} from "@/config/commercial/pricing";
import {
  resolvePillarForCategorySlug,
  resolvePillarForCommercialSlug,
  type CatalogPillar,
} from "@/config/catalog";
import { websitePackages } from "@/config/commercial/website-packages";
import { commercialBundles } from "@/config/commercial/bundles";
import { carePackages } from "@/config/commercial/care-packages";

export type CanonicalOfferingKind =
  | "commercial"
  | "website_package"
  | "bundle"
  | "care"
  | "db_product"
  | "software";

export interface CanonicalOfferingRef {
  kind: CanonicalOfferingKind;
  /** Stable ID from source model (commercial id, package id, sw-src-xxx, etc.) */
  id: string;
  slug: string;
  pillar: CatalogPillar;
  nameNl: string;
  nameEn: string;
}

export function getCommercialOfferingBySlug(
  slug: string,
): CommercialCatalogItem | undefined {
  return getCatalogItem(slug);
}

export function resolveCanonicalOfferingRef(
  slug: string,
): CanonicalOfferingRef | null {
  const commercial = getCatalogItem(slug);
  if (commercial) {
    const pillar =
      resolvePillarForCommercialSlug(slug) ??
      (commercial.category === "automation"
        ? "AUTOMATE"
        : commercial.category === "care" || commercial.category === "support"
          ? "GROW"
          : "BUILD");
    return {
      kind: "commercial",
      id: commercial.id,
      slug: commercial.slug,
      pillar,
      nameNl: commercial.nameNl,
      nameEn: commercial.nameEn,
    };
  }

  const pkg = websitePackages.find((p) => p.slug === slug || p.catalogSlug === slug);
  if (pkg) {
    const catalog = getCatalogItem(pkg.catalogSlug);
    return {
      kind: "website_package",
      id: pkg.id,
      slug: pkg.slug,
      pillar: "BUILD",
      nameNl: catalog?.nameNl ?? pkg.slug,
      nameEn: catalog?.nameEn ?? pkg.slug,
    };
  }

  const bundle = commercialBundles.find(
    (b) => b.slug === slug || b.catalogSlug === slug,
  );
  if (bundle) {
    const catalog = getCatalogItem(bundle.catalogSlug);
    const pillar =
      bundle.id === "automation"
        ? "AUTOMATE"
        : bundle.id === "digital-partner"
          ? "GROW"
          : "BUILD";
    return {
      kind: "bundle",
      id: bundle.id,
      slug: bundle.slug,
      pillar,
      nameNl: catalog?.nameNl ?? bundle.slug,
      nameEn: catalog?.nameEn ?? bundle.slug,
    };
  }

  const care = carePackages.find(
    (c) => c.slug === slug || c.catalogSlug === slug,
  );
  if (care) {
    const catalog = getCatalogItem(care.catalogSlug);
    return {
      kind: "care",
      id: care.id,
      slug: care.slug,
      pillar: "GROW",
      nameNl: catalog?.nameNl ?? care.slug,
      nameEn: catalog?.nameEn ?? care.slug,
    };
  }

  return null;
}

export function resolvePillarForProductCategory(
  categorySlug: string | null | undefined,
): CatalogPillar | null {
  return resolvePillarForCategorySlug(categorySlug);
}

export function listCommercialOfferingsByPillar(
  pillar: CatalogPillar,
): CanonicalOfferingRef[] {
  return commercialCatalog
    .map((item) => resolveCanonicalOfferingRef(item.slug))
    .filter((ref): ref is CanonicalOfferingRef => ref != null && ref.pillar === pillar);
}

/** Quote / lead metadata tag for admin */
export function formatOfferingRefForLead(ref: CanonicalOfferingRef): string {
  return `[${ref.pillar}/${ref.kind}] ${ref.slug} (${ref.id})`;
}
