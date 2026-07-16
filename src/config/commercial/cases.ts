export type CaseType = "real" | "internal" | "demonstration";
export type CaseStatus =
  | "DRAFT"
  | "AWAITING_CLIENT_APPROVAL"
  | "APPROVED"
  | "PUBLISHED"
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
  sector: string;
  /** i18n prefix under commercial.cases.{slug} */
  i18nKey: string;
  externalUrl: string | null;
  permissions: CasePermissions;
  /** Only PUBLISHED + APPROVED cases render on public site */
  publicVisible: boolean;
}

export const caseCatalog: CaseDefinition[] = [
  {
    slug: "vermeulen-bouwservice",
    type: "real",
    status: "DRAFT",
    sector: "construction",
    i18nKey: "vermeulen",
    externalUrl: null,
    permissions: {
      permissionConfirmed: false,
      screenshotPermission: false,
      logoPermission: false,
      testimonialPermission: false,
      metricsVerified: false,
      clientApprovalDate: null,
    },
    publicVisible: false,
  },
  {
    slug: "vdb-digital-platform",
    type: "internal",
    status: "APPROVED",
    sector: "software",
    i18nKey: "platform",
    externalUrl: "https://vdbdigital.nl",
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
    sector: "automation",
    i18nKey: "demoWhatsapp",
    externalUrl: null,
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
    sector: "ecommerce",
    i18nKey: "demoWebshop",
    externalUrl: null,
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
    sector: "automation",
    i18nKey: "demoReview",
    externalUrl: null,
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

export function getPublicCases(): CaseDefinition[] {
  return caseCatalog.filter(
    (c) =>
      c.publicVisible &&
      (c.status === "PUBLISHED" || c.status === "APPROVED") &&
      c.type !== "real",
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
