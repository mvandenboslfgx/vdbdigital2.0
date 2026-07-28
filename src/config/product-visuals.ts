/**
 * Public product visuals — self-made brand abstracts (no third-party stock).
 * Map software groups and commercial package categories to local assets.
 */
import type { SoftwareCatalogGroup } from "@/config/software-catalog";

export const SOFTWARE_GROUP_VISUAL: Record<
  SoftwareCatalogGroup,
  { src: string; altEn: string; altNl: string; width: number; height: number }
> = {
  windows: {
    src: "/products/groups/windows.svg",
    altEn: "Abstract Windows license visual — VDB Digital",
    altNl: "Abstracte Windows-licentievisual — VDB Digital",
    width: 1200,
    height: 750,
  },
  security: {
    src: "/products/groups/security.svg",
    altEn: "Abstract security software visual — VDB Digital",
    altNl: "Abstracte beveiligingssoftwarevisual — VDB Digital",
    width: 1200,
    height: 750,
  },
  tools: {
    src: "/products/groups/tools.svg",
    altEn: "Abstract tools and apps visual — VDB Digital",
    altNl: "Abstracte tools- en appsvisual — VDB Digital",
    width: 1200,
    height: 750,
  },
  professional: {
    src: "/products/groups/professional.svg",
    altEn: "Abstract professional software visual — VDB Digital",
    altNl: "Abstracte professionele softwarevisual — VDB Digital",
    width: 1200,
    height: 750,
  },
};

export type CommercialVisualKey =
  | "website"
  | "webshop"
  | "care"
  | "bundle"
  | "custom";

export const COMMERCIAL_VISUAL: Record<
  CommercialVisualKey,
  { src: string; altEn: string; altNl: string; width: number; height: number }
> = {
  website: {
    src: "/products/packages/website.svg",
    altEn: "Abstract website package visual — VDB Digital",
    altNl: "Abstracte websitepakketvisual — VDB Digital",
    width: 1200,
    height: 750,
  },
  webshop: {
    src: "/products/packages/webshop.svg",
    altEn: "Abstract webshop package visual — VDB Digital",
    altNl: "Abstracte webshoppakketvisual — VDB Digital",
    width: 1200,
    height: 750,
  },
  care: {
    src: "/products/packages/care.svg",
    altEn: "Abstract care and hosting visual — VDB Digital",
    altNl: "Abstracte hosting- en onderhoudsvisual — VDB Digital",
    width: 1200,
    height: 750,
  },
  bundle: {
    src: "/products/packages/bundle.svg",
    altEn: "Abstract digital system bundle visual — VDB Digital",
    altNl: "Abstracte digitaal-systeembundelvisual — VDB Digital",
    width: 1200,
    height: 750,
  },
  custom: {
    src: "/products/packages/custom.svg",
    altEn: "Abstract custom software visual — VDB Digital",
    altNl: "Abstracte maatwerksoftwarevisual — VDB Digital",
    width: 1200,
    height: 750,
  },
};

export function commercialVisualForSlug(slug: string): CommercialVisualKey {
  if (slug.includes("webshop")) return "webshop";
  if (slug.includes("care") || slug.includes("partner")) return "care";
  if (slug.includes("system") || slug.includes("bundle")) return "bundle";
  if (slug.includes("custom") || slug.includes("automation")) return "custom";
  return "website";
}
