export type CaseType = "real" | "internal" | "demonstration";
export type CaseStatus =
  | "DRAFT"
  | "AWAITING_CLIENT_APPROVAL"
  | "APPROVED"
  | "PUBLISHED"
  | "ARCHIVED";

/** Public presentation status for portfolio cases (manual only — never auto-flip). */
export type CaseLaunchStatus =
  | "LIVE"
  | "COMING_SOON"
  | "IN_DEVELOPMENT"
  | "ARCHIVED";

export interface CasePermissions {
  permissionConfirmed: boolean;
  screenshotPermission: boolean;
  logoPermission: boolean;
  testimonialPermission: boolean;
  metricsVerified: boolean;
  clientApprovalDate: string | null;
}

export interface CaseDefinition {
  slug: string;
  type: CaseType;
  status: CaseStatus;
  /** Presentation status for badges, live links, and SEO. */
  launchStatus: CaseLaunchStatus;
  sector: string;
  /** i18n prefix under commercial.cases.{slug} */
  i18nKey: string;
  /** HTTPS live site URL when launchStatus is LIVE and liveLinkActive. */
  externalUrl: string | null;
  /** When true, UI may show an external live-website control. */
  liveLinkActive: boolean;
  /** Browser chrome address label (no protocol). */
  domainLabel: string | null;
  /** Local assets under public/cases/{assetDir}/ */
  assetDir: string | null;
  featured: boolean;
  sortOrder: number;
  permissions: CasePermissions;
  /** Only PUBLISHED + APPROVED cases render on public site */
  publicVisible: boolean;
}

function httpsUrl(url: string | null): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Server-side rules for live links. COMING_SOON / IN_DEVELOPMENT must never
 * expose an active external live link. LIVE requires a valid HTTPS URL when
 * the live link is enabled.
 */
export function assertCaseLiveLinkRules(c: CaseDefinition): void {
  const nonLive =
    c.launchStatus === "COMING_SOON" ||
    c.launchStatus === "IN_DEVELOPMENT" ||
    c.launchStatus === "ARCHIVED";

  if (nonLive && c.liveLinkActive) {
    throw new Error(
      `Case "${c.slug}": liveLinkActive is not allowed when launchStatus is ${c.launchStatus}`,
    );
  }

  if (c.liveLinkActive) {
    if (c.launchStatus !== "LIVE") {
      throw new Error(
        `Case "${c.slug}": liveLinkActive requires launchStatus LIVE`,
      );
    }
    if (!httpsUrl(c.externalUrl)) {
      throw new Error(
        `Case "${c.slug}": LIVE with liveLinkActive requires a valid HTTPS externalUrl`,
      );
    }
  }
}

export function getCaseLiveUrl(c: CaseDefinition): string | null {
  assertCaseLiveLinkRules(c);
  if (!c.liveLinkActive || c.launchStatus !== "LIVE") return null;
  return c.externalUrl;
}

export function isCaseSearchIndexable(c: CaseDefinition): boolean {
  return (
    isCasePubliclyVisible(c.slug) &&
    c.launchStatus === "LIVE" &&
    c.type !== "demonstration"
  );
}

function launchRank(c: CaseDefinition): number {
  if (c.launchStatus === "LIVE" && c.featured) return 0;
  if (c.launchStatus === "LIVE") return 1;
  if (
    c.launchStatus === "COMING_SOON" ||
    c.launchStatus === "IN_DEVELOPMENT"
  ) {
    return 2;
  }
  return 3;
}

export const caseCatalog: CaseDefinition[] = [
  {
    slug: "vermeulen-bouwservice",
    type: "real",
    status: "PUBLISHED",
    launchStatus: "LIVE",
    sector: "construction",
    i18nKey: "vermeulen",
    externalUrl: "https://www.vermeulenbouwservice.nl/",
    liveLinkActive: true,
    domainLabel: "vermeulenbouwservice.nl",
    assetDir: "vermeulen-bouwservice",
    featured: true,
    sortOrder: 10,
    permissions: {
      permissionConfirmed: true,
      screenshotPermission: true,
      logoPermission: true,
      testimonialPermission: false,
      metricsVerified: true,
      clientApprovalDate: "2026-07-16",
    },
    publicVisible: true,
  },
  {
    slug: "grill-gasten",
    type: "real",
    status: "PUBLISHED",
    launchStatus: "LIVE",
    sector: "hospitality",
    i18nKey: "grillGasten",
    externalUrl: "https://www.grillgasten.eu/",
    liveLinkActive: true,
    domainLabel: "grillgasten.eu",
    assetDir: "grill-gasten",
    featured: true,
    sortOrder: 20,
    permissions: {
      permissionConfirmed: true,
      screenshotPermission: true,
      logoPermission: true,
      testimonialPermission: false,
      metricsVerified: false,
      clientApprovalDate: "2026-07-19",
    },
    publicVisible: true,
  },
  {
    slug: "trustbooker",
    type: "internal",
    status: "APPROVED",
    launchStatus: "COMING_SOON",
    sector: "software",
    i18nKey: "trustbooker",
    externalUrl: null,
    liveLinkActive: false,
    domainLabel: "TrustBooker",
    assetDir: "trustbooker",
    featured: true,
    sortOrder: 100,
    permissions: {
      permissionConfirmed: true,
      screenshotPermission: true,
      logoPermission: true,
      testimonialPermission: false,
      metricsVerified: false,
      clientApprovalDate: null,
    },
    publicVisible: true,
  },
  {
    slug: "vdb-digital-platform",
    type: "internal",
    status: "APPROVED",
    launchStatus: "LIVE",
    sector: "software",
    i18nKey: "platform",
    externalUrl: "https://vdbdigital.nl",
    liveLinkActive: true,
    domainLabel: "vdbdigital.nl",
    assetDir: null,
    featured: false,
    sortOrder: 200,
    permissions: {
      permissionConfirmed: true,
      screenshotPermission: true,
      logoPermission: true,
      testimonialPermission: false,
      metricsVerified: false,
      clientApprovalDate: null,
    },
    publicVisible: true,
  },
  {
    slug: "demo-whatsapp-ai",
    type: "demonstration",
    status: "PUBLISHED",
    launchStatus: "LIVE",
    sector: "automation",
    i18nKey: "demoWhatsapp",
    externalUrl: null,
    liveLinkActive: false,
    domainLabel: null,
    assetDir: null,
    featured: false,
    sortOrder: 300,
    permissions: {
      permissionConfirmed: true,
      screenshotPermission: true,
      logoPermission: false,
      testimonialPermission: false,
      metricsVerified: false,
      clientApprovalDate: null,
    },
    publicVisible: true,
  },
  {
    slug: "demo-webshop",
    type: "demonstration",
    status: "PUBLISHED",
    launchStatus: "LIVE",
    sector: "ecommerce",
    i18nKey: "demoWebshop",
    externalUrl: null,
    liveLinkActive: false,
    domainLabel: null,
    assetDir: null,
    featured: false,
    sortOrder: 310,
    permissions: {
      permissionConfirmed: true,
      screenshotPermission: true,
      logoPermission: false,
      testimonialPermission: false,
      metricsVerified: false,
      clientApprovalDate: null,
    },
    publicVisible: true,
  },
  {
    slug: "demo-review-flow",
    type: "demonstration",
    status: "PUBLISHED",
    launchStatus: "LIVE",
    sector: "automation",
    i18nKey: "demoReview",
    externalUrl: null,
    liveLinkActive: false,
    domainLabel: null,
    assetDir: null,
    featured: false,
    sortOrder: 320,
    permissions: {
      permissionConfirmed: true,
      screenshotPermission: true,
      logoPermission: false,
      testimonialPermission: false,
      metricsVerified: false,
      clientApprovalDate: null,
    },
    publicVisible: true,
  },
];

// Validate catalog invariants at module load (fail fast in tests/build).
for (const entry of caseCatalog) {
  assertCaseLiveLinkRules(entry);
}

/** Public marketing cases — includes published real client cases (no invented metrics). */
export function getPublicCases(): CaseDefinition[] {
  return caseCatalog
    .filter(
      (c) =>
        c.publicVisible &&
        (c.status === "PUBLISHED" || c.status === "APPROVED"),
    )
    .sort((a, b) => {
      const rank = launchRank(a) - launchRank(b);
      if (rank !== 0) return rank;
      return a.sortOrder - b.sortOrder;
    });
}

/** Featured portfolio cases for homepage / overview (live before coming soon). */
export function getFeaturedPortfolioCases(): CaseDefinition[] {
  return getPublicCases().filter(
    (c) =>
      c.featured &&
      (c.launchStatus === "LIVE" ||
        c.launchStatus === "COMING_SOON" ||
        c.launchStatus === "IN_DEVELOPMENT") &&
      c.assetDir !== null,
  );
}

export function getCaseBySlug(slug: string): CaseDefinition | undefined {
  return caseCatalog.find((c) => c.slug === slug);
}

export function isCasePubliclyVisible(slug: string): boolean {
  const c = getCaseBySlug(slug);
  if (!c) return false;
  if (c.type === "real" && c.status !== "PUBLISHED") return false;
  return c.publicVisible && (c.status === "PUBLISHED" || c.status === "APPROVED");
}

/** Manual promotion helper — requires valid HTTPS URL. Never auto-called. */
export function promoteCaseToLive(
  slug: string,
  httpsLiveUrl: string,
): CaseDefinition {
  const current = getCaseBySlug(slug);
  if (!current) {
    throw new Error(`Unknown case: ${slug}`);
  }
  if (!httpsUrl(httpsLiveUrl)) {
    throw new Error(
      `Cannot promote "${slug}" to LIVE without a valid HTTPS URL`,
    );
  }
  const next: CaseDefinition = {
    ...current,
    launchStatus: "LIVE",
    liveLinkActive: true,
    externalUrl: httpsLiveUrl,
  };
  assertCaseLiveLinkRules(next);
  return next;
}
