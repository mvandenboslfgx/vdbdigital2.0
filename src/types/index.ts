export type BillingType =
  | "ONE_TIME"
  | "MONTHLY"
  | "YEARLY"
  | "QUOTE_ONLY"
  | "FREE";

export type ProductStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

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

export interface Product {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  fullDescription: string;
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
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
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
