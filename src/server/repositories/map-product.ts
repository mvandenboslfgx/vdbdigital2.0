/**
 * Shared product row mapping for public + admin repositories.
 * Unknown/missing catalog-admin columns are treated as undefined (pre-migration safe).
 */
import type {
  BillingType,
  LegalApprovalStatus,
  PriceApprovalStatus,
  PriceMode,
  Product,
  ProductMedia,
  ProductStatus,
  ProductTranslation,
  ProductTranslationStatus,
} from "@/types";

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

export function mapDbProductRow(row: Record<string, unknown>): Product {
  const category = row.category as { id?: string; slug?: string; name?: string } | null;

  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    shortDescription: row.short_description as string,
    fullDescription: row.full_description as string,
    categoryId: (row.category_id as string | null) ?? category?.id ?? null,
    categorySlug: category?.slug ?? "",
    categoryName: category?.name ?? "",
    priceCents: row.price_cents as number | null,
    fromPriceCents: row.from_price_cents as number | null,
    billingType: row.billing_type as BillingType,
    deliveryTime: (row.delivery_time as string) ?? "",
    includedItems: asStringArray(row.included_items),
    excludedItems: asStringArray(row.excluded_items),
    extensions: asStringArray(row.extensions),
    faqs: [],
    status: row.status as ProductStatus,
    featured: Boolean(row.featured),
    sortOrder: (row.sort_order as number) ?? 0,
    seoTitle: (row.seo_title as string) ?? "",
    seoDescription: (row.seo_description as string) ?? "",
    targetAudience: row.target_audience as string | undefined,
    workflow: row.workflow as string | undefined,
    requiredInput: asStringArray(row.required_input),
    internalSku: (row.internal_sku as string | null | undefined) ?? null,
    priceMode: (row.price_mode as PriceMode | null | undefined) ?? null,
    currency: (row.currency as string | undefined) ?? "EUR",
    vatPercent: (row.vat_percent as number | undefined) ?? 21,
    priceIncludesVat: (row.price_includes_vat as boolean | undefined) ?? false,
    compareAtCents: (row.compare_at_cents as number | null | undefined) ?? null,
    priceLabel: (row.price_label as string | null | undefined) ?? null,
    costCents: (row.cost_cents as number | null | undefined) ?? null,
    badge: (row.badge as string | null | undefined) ?? null,
    tags: asStringArray(row.tags),
    audienceB2b: (row.audience_b2b as boolean | undefined) ?? true,
    audienceB2c: (row.audience_b2c as boolean | undefined) ?? false,
    priceStatus: row.price_status as PriceApprovalStatus | undefined,
    legalStatus: row.legal_status as LegalApprovalStatus | undefined,
    publicationReady: row.publication_ready as boolean | undefined,
    legalApprovedBy: (row.legal_approved_by as string | null | undefined) ?? null,
    legalApprovedAt: (row.legal_approved_at as string | null | undefined) ?? null,
    legalTermsVersion: (row.legal_terms_version as string | null | undefined) ?? null,
    legalInternalNote: (row.legal_internal_note as string | null | undefined) ?? null,
    benefits: asStringArray(row.benefits),
    ctaLabel: (row.cta_label as string | null | undefined) ?? null,
    quoteCtaLabel: (row.quote_cta_label as string | null | undefined) ?? null,
    warnings: (row.warnings as string | null | undefined) ?? null,
    version: (row.version as number | undefined) ?? 1,
    updatedBy: (row.updated_by as string | null | undefined) ?? null,
    updatedAt: row.updated_at as string | undefined,
    createdAt: row.created_at as string | undefined,
    primaryImagePath: (row.primary_image_path as string | null | undefined) ?? null,
    isConcept: (row.is_concept as boolean | undefined) ?? false,
    partnerEnabled: (row.partner_enabled as boolean | undefined) ?? false,
    partnerVisibility: (row.partner_visibility as string | undefined) ?? "none",
    partnerCommissionType:
      (row.partner_commission_type as string | undefined) ?? "bps",
    partnerCommissionValue:
      row.partner_commission_value == null
        ? null
        : Number(row.partner_commission_value),
    partnerCommissionCurrency:
      (row.partner_commission_currency as string | undefined) ?? "EUR",
    partnerCommissionStatus:
      (row.partner_commission_status as string | undefined) ?? "draft",
    partnerMinimumPriceCents:
      (row.partner_minimum_price_cents as number | null | undefined) ?? null,
    partnerMaximumDiscountBps:
      (row.partner_maximum_discount_bps as number | null | undefined) ?? null,
    partnerRequiresApproval:
      (row.partner_requires_approval as boolean | undefined) ?? true,
    partnerTerms: (row.partner_terms as string | null | undefined) ?? null,
    partnerSalesCopy:
      (row.partner_sales_copy as string | null | undefined) ?? null,
    partnerAvailability:
      (row.partner_availability as string | undefined) ?? "available",
    partnerPriority: (row.partner_priority as number | undefined) ?? 100,
    partnerFeatured: (row.partner_featured as boolean | undefined) ?? false,
  };
}

export function mapDbTranslationRow(row: Record<string, unknown>): ProductTranslation {
  return {
    locale: row.locale as "nl" | "en",
    name: (row.name as string) ?? "",
    slug: (row.slug as string | null) ?? null,
    shortDescription: (row.short_description as string) ?? "",
    fullDescription: (row.full_description as string) ?? "",
    benefits: asStringArray(row.benefits),
    includedItems: asStringArray(row.included_items),
    excludedItems: asStringArray(row.excluded_items),
    ctaLabel: (row.cta_label as string | null) ?? null,
    quoteCtaLabel: (row.quote_cta_label as string | null) ?? null,
    seoTitle: (row.seo_title as string | null) ?? null,
    seoDescription: (row.seo_description as string | null) ?? null,
    deliveryTime: (row.delivery_time as string | null) ?? null,
    targetAudience: (row.target_audience as string | null) ?? null,
    workflow: (row.workflow as string | null) ?? null,
    warnings: (row.warnings as string | null) ?? null,
    // Pre-migration rows (column missing) behave as 'draft' — never publishable.
    status: (row.status as ProductTranslationStatus | undefined) ?? "draft",
    sourceHash: (row.source_hash as string | null | undefined) ?? null,
    reviewedAt: (row.reviewed_at as string | null | undefined) ?? null,
    publishedAt: (row.published_at as string | null | undefined) ?? null,
  };
}

export function mapDbMediaRow(row: Record<string, unknown>): ProductMedia {
  return {
    id: row.id as string,
    storagePath: row.storage_path as string,
    mimeType: row.mime_type as string,
    byteSize: row.byte_size as number,
    width: (row.width as number | null) ?? null,
    height: (row.height as number | null) ?? null,
    sortOrder: (row.sort_order as number) ?? 0,
    isPrimary: Boolean(row.is_primary),
    altTextNl: (row.alt_text_nl as string | null) ?? null,
    altTextEn: (row.alt_text_en as string | null) ?? null,
  };
}

/** Detect missing-column / missing-relation errors from PostgREST */
export function isMissingSchemaError(error: { message?: string; code?: string } | null): boolean {
  if (!error?.message) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("does not exist") ||
    msg.includes("could not find") ||
    msg.includes("schema cache") ||
    error.code === "42703" ||
    error.code === "42P01"
  );
}
