export type BillingType =
  | "ONE_TIME"
  | "MONTHLY"
  | "YEARLY"
  | "QUOTE_ONLY"
  | "FREE";

/** Marketing / workflow status. REVIEW & HIDDEN require catalog admin migration. */
export type ProductStatus =
  | "DRAFT"
  | "REVIEW"
  | "PUBLISHED"
  | "HIDDEN"
  | "ARCHIVED";

export type PriceMode = "FIXED" | "STARTING_FROM" | "QUOTE_ONLY";

export type PriceApprovalStatus =
  | "DRAFT"
  | "INTERNAL_REVIEW"
  | "APPROVED"
  | "PUBLISHED"
  | "ARCHIVED";

export type LegalApprovalStatus =
  | "NOT_REVIEWED"
  | "INTERNAL_REVIEW"
  | "LEGAL_REVIEW_REQUIRED"
  | "APPROVED_FOR_B2B"
  | "APPROVED_FOR_B2C"
  | "APPROVED_FOR_BOTH";

export type CatalogLocale = "nl" | "en";

export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED"
  | "QUOTE_REQUESTED";

export type PaymentStatus =
  | "OPEN"
  | "PENDING"
  | "AUTHORIZED"
  | "PAID"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED"
  | "REFUNDED"
  | "CHARGED_BACK";

export type AdminRole = "OWNER" | "ADMIN" | "SUPPORT" | "CONTENT";

export type LeadType = "CONTACT" | "QUOTE" | "SUPPORT";

export type LeadStatus = "NEW" | "IN_PROGRESS" | "CLOSED";

export type ConsentCategory =
  | "necessary"
  | "functional"
  | "analytics"
  | "marketing";

export interface ProductFeature {
  id?: string;
  label: string;
  included: boolean;
  sortOrder: number;
}

export interface ProductFaq {
  id?: string;
  question: string;
  answer: string;
  sortOrder: number;
}

export interface ProductTranslation {
  locale: CatalogLocale;
  name: string;
  slug?: string | null;
  shortDescription: string;
  fullDescription: string;
  benefits: string[];
  includedItems: string[];
  excludedItems: string[];
  ctaLabel?: string | null;
  quoteCtaLabel?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  deliveryTime?: string | null;
  targetAudience?: string | null;
  workflow?: string | null;
  warnings?: string | null;
}

export interface ProductMedia {
  id: string;
  storagePath: string;
  mimeType: string;
  byteSize: number;
  width?: number | null;
  height?: number | null;
  sortOrder: number;
  isPrimary: boolean;
  altTextNl?: string | null;
  altTextEn?: string | null;
}

export interface ProductAddon {
  id: string;
  slug: string;
  name: string;
  description: string;
  nameNl?: string | null;
  descriptionNl?: string | null;
  priceCents: number | null;
  priceMode: PriceMode;
  billingType: BillingType;
  audienceB2b: boolean;
  audienceB2c: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  fullDescription: string;
  categoryId?: string | null;
  categorySlug: string;
  categoryName: string;
  priceCents: number | null;
  fromPriceCents: number | null;
  billingType: BillingType;
  deliveryTime: string;
  includedItems: string[];
  excludedItems: string[];
  extensions: string[];
  faqs: ProductFaq[];
  status: ProductStatus;
  featured: boolean;
  sortOrder: number;
  seoTitle: string;
  seoDescription: string;
  targetAudience?: string;
  workflow?: string;
  requiredInput?: string[];
  /** Optional catalog-admin fields (present after migration / admin load) */
  internalSku?: string | null;
  priceMode?: PriceMode | null;
  currency?: string;
  vatPercent?: number;
  priceIncludesVat?: boolean;
  compareAtCents?: number | null;
  priceLabel?: string | null;
  costCents?: number | null;
  badge?: string | null;
  tags?: string[];
  audienceB2b?: boolean;
  audienceB2c?: boolean;
  priceStatus?: PriceApprovalStatus;
  legalStatus?: LegalApprovalStatus;
  publicationReady?: boolean;
  legalApprovedBy?: string | null;
  legalApprovedAt?: string | null;
  legalTermsVersion?: string | null;
  legalInternalNote?: string | null;
  benefits?: string[];
  ctaLabel?: string | null;
  quoteCtaLabel?: string | null;
  warnings?: string | null;
  version?: number;
  updatedBy?: string | null;
  updatedAt?: string;
  createdAt?: string;
  primaryImagePath?: string | null;
  isConcept?: boolean;
  translations?: ProductTranslation[];
  media?: ProductMedia[];
  addons?: ProductAddon[];
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  nameNl?: string | null;
  descriptionNl?: string | null;
  imagePath?: string | null;
  isActive?: boolean;
  productCount?: number;
}

export interface CartItem {
  productId: string;
  productSlug: string;
  name: string;
  priceCents: number;
  billingType: BillingType;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  updatedAt: string;
}

export type CheckoutCustomerType = "B2B" | "B2C";

export interface CustomerInput {
  email: string;
  firstName: string;
  lastName: string;
  company?: string;
  phone?: string;
  vatNumber?: string;
  addressLine1?: string;
  postalCode?: string;
  city?: string;
  country: string;
  notes?: string;
  customerType: CheckoutCustomerType;
  /** Client-generated UUID to prevent duplicate order submits */
  idempotencyKey?: string;
}

export interface OrderLine {
  productId: string;
  productName: string;
  productSlug: string;
  quantity: number;
  unitPriceCents: number;
  billingType: BillingType;
  totalCents: number;
}

export interface OrderTotals {
  subtotalCents: number;
  vatCents: number;
  totalCents: number;
  vatRate: number;
}

export interface CaseStudy {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  solutionType: string;
  industry: string;
  published: boolean;
  sortOrder: number;
}

export interface SiteSettings {
  maintenanceMode: boolean;
  shopEnabled: boolean;
  quoteOnlyMode: boolean;
}

export interface AdminProfile {
  id: string;
  email: string;
  fullName: string | null;
  role: AdminRole;
}
