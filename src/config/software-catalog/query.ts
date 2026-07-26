import type { Locale } from "@/i18n/config";
import {
  softwareCatalogBlockedRefs,
  softwareCatalogItems,
  SOFTWARE_CATALOG_STATS,
} from "./generated-inventory";
import {
  SOFTWARE_GROUP_LABELS,
  SOFTWARE_GROUP_ORDER,
  type SoftwareCatalogGroup,
  type SoftwareCatalogItem,
  type SoftwarePublicDto,
} from "./types";

const PAGE_SIZE = 12;

/** Fail-closed public visibility */
export function isSoftwareItemPublic(item: SoftwareCatalogItem): boolean {
  if (item.publicationStatus === "BLOCKED") return false;
  if (item.publicationStatus === "CANDIDATE_REVIEW") return false;
  if (item.publicationStatus === "PUBLIC_REQUEST_ONLY") return true;
  if (item.publicationStatus === "PUBLIC_PRICE_VERIFIED") {
    return (
      item.publicPriceEur != null &&
      item.publicPriceEur > 0 &&
      item.evidenceStatus === "PRICE_VERIFIED"
    );
  }
  return false;
}

export function toPublicDto(
  item: SoftwareCatalogItem,
  locale: Locale,
): SoftwarePublicDto | null {
  if (!isSoftwareItemPublic(item)) return null;
  if (item.publicationStatus === "PUBLIC_PRICE_VERIFIED") {
    // Belt-and-suspenders: never emit verified price without evidence
    if (
      item.publicPriceEur == null ||
      item.evidenceStatus !== "PRICE_VERIFIED"
    ) {
      return null;
    }
  }

  const name = locale === "nl" ? item.nameNl : item.nameEn;
  const shortDescription = locale === "nl" ? item.shortNl : item.shortEn;
  const groupLabels = SOFTWARE_GROUP_LABELS[locale];

  const specs: { label: string; value: string }[] = [
    {
      label: locale === "nl" ? "Platform / type" : "Platform / type",
      value: item.licenseType,
    },
    {
      label: locale === "nl" ? "Looptijd" : "Term",
      value: item.term,
    },
  ];
  if (item.devices != null) {
    specs.push({
      label: locale === "nl" ? "Apparaten" : "Devices",
      value: String(item.devices),
    });
  }

  return {
    id: item.id,
    slug: item.slug,
    name,
    shortDescription,
    group: item.group,
    brand: item.brand,
    licenseType: item.licenseType,
    devices: item.devices,
    term: item.term,
    publicationStatus: item.publicationStatus as SoftwarePublicDto["publicationStatus"],
    priceLabel:
      item.publicationStatus === "PUBLIC_PRICE_VERIFIED" ? "verified" : "on_request",
    publicPriceEur:
      item.publicationStatus === "PUBLIC_PRICE_VERIFIED" ? item.publicPriceEur : null,
    specs: [
      {
        label: locale === "nl" ? "Categorie" : "Category",
        value: groupLabels[item.group],
      },
      ...specs,
    ],
  };
}

export interface SoftwareCatalogQuery {
  q?: string;
  group?: SoftwareCatalogGroup | "all";
  page?: number;
  pageSize?: number;
}

export interface SoftwareCatalogPageResult {
  items: SoftwarePublicDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  groupCounts: Record<SoftwareCatalogGroup | "all", number>;
}

function publicItems(): SoftwareCatalogItem[] {
  return softwareCatalogItems
    .filter(isSoftwareItemPublic)
    .sort((a, b) => b.sourcePriority - a.sourcePriority || a.sourceNr - b.sourceNr);
}

export function querySoftwareCatalog(
  locale: Locale,
  query: SoftwareCatalogQuery = {},
): SoftwareCatalogPageResult {
  const pageSize = Math.min(Math.max(query.pageSize ?? PAGE_SIZE, 1), PAGE_SIZE);
  const page = Math.max(query.page ?? 1, 1);
  const q = (query.q ?? "").trim().toLowerCase();
  const group = query.group ?? "all";

  let filtered = publicItems();
  const groupCounts = {
    all: filtered.length,
    windows: 0,
    security: 0,
    tools: 0,
    professional: 0,
  } as Record<SoftwareCatalogGroup | "all", number>;

  for (const item of filtered) {
    groupCounts[item.group] += 1;
  }

  if (group !== "all") {
    filtered = filtered.filter((item) => item.group === group);
  }
  if (q) {
    filtered = filtered.filter((item) => {
      const hay = `${item.nameNl} ${item.nameEn} ${item.brand} ${item.sourceLabel}`.toLowerCase();
      return hay.includes(q);
    });
  }

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const slice = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const items = slice
    .map((item) => toPublicDto(item, locale))
    .filter((x): x is SoftwarePublicDto => x != null);

  return {
    items,
    total,
    page: safePage,
    pageSize,
    totalPages,
    groupCounts,
  };
}

export function getSoftwareBySlug(
  slug: string,
  locale: Locale,
): SoftwarePublicDto | null {
  const item = softwareCatalogItems.find((p) => p.slug === slug);
  if (!item) return null;
  return toPublicDto(item, locale);
}

export function getAllPublicSoftwareSlugs(): string[] {
  return publicItems().map((i) => i.slug);
}

export function assertCatalogIntegrity(): {
  ok: boolean;
  errors: string[];
  stats: typeof SOFTWARE_CATALOG_STATS;
} {
  const errors: string[] = [];
  const { totalSourceRows, greenCount, redCount } = SOFTWARE_CATALOG_STATS;
  if (totalSourceRows !== 468) errors.push(`totalSourceRows=${totalSourceRows}`);
  if (greenCount !== 72) errors.push(`greenCount=${greenCount}`);
  if (redCount !== 396) errors.push(`redCount=${redCount}`);
  if (softwareCatalogItems.length !== 72) {
    errors.push(`items length ${softwareCatalogItems.length}`);
  }
  if (softwareCatalogBlockedRefs.length !== 396) {
    errors.push(`blocked length ${softwareCatalogBlockedRefs.length}`);
  }
  const slugs = new Set<string>();
  for (const item of softwareCatalogItems) {
    if (slugs.has(item.slug)) errors.push(`duplicate slug ${item.slug}`);
    slugs.add(item.slug);
    if (item.publicationStatus === "PUBLIC_PRICE_VERIFIED" && item.publicPriceEur == null) {
      errors.push(`verified without price ${item.slug}`);
    }
  }
  for (const ref of softwareCatalogBlockedRefs) {
    if (ref.publicationStatus !== "BLOCKED") {
      errors.push(`red not blocked ${ref.id}`);
    }
  }
  return { ok: errors.length === 0, errors, stats: SOFTWARE_CATALOG_STATS };
}

export function groupLabel(group: SoftwareCatalogGroup, locale: Locale): string {
  return SOFTWARE_GROUP_LABELS[locale][group];
}

export { SOFTWARE_GROUP_ORDER, SOFTWARE_CATALOG_STATS, PAGE_SIZE };
