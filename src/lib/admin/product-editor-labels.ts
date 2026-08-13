import type { TranslateFn } from "@/i18n/create-t";
import type { Locale } from "@/i18n/config";

/**
 * Copy for the product editor, resolved on the server and passed in as one
 * prop — the editor is a client component and cannot call `getDictionary()`.
 *
 * `locale` travels with the labels so the editor can format the legal
 * approval timestamp with `formatDateTime()` instead of the hardcoded `nl-NL`
 * tag it used before.
 */
export interface ProductEditorLabels {
  locale: Locale;
  breadcrumbProducts: string;
  breadcrumbNew: string;
  breadcrumbEdit: string;
  createTitle: string;
  preview: string;
  duplicate: string;
  legacyBlockedNote: string;
  checkoutDisabledNote: string;
  saved: string;
  generalHeading: string;
  name: string;
  slug: string;
  slugHint: string;
  internalSku: string;
  category: string;
  noCategory: string;
  badge: string;
  tags: string;
  sortOrder: string;
  featured: string;
  shortDescription: string;
  fullDescription: string;
  richTextHint: string;
  pricingHeading: string;
  noPricePermission: string;
  priceMode: string;
  priceModeOptions: Record<string, string>;
  billingModel: string;
  billingOptions: Record<string, string>;
  amount: string;
  amountHint: string;
  fromAmount: string;
  compareAt: string;
  vatPercent: string;
  priceLabel: string;
  costPrice: string;
  priceIncludesVat: string;
  onlyFixedEligible: string;
  audienceHeading: string;
  audienceNote: string;
  contentHeading: string;
  benefits: string;
  includedItems: string;
  excludedItems: string;
  extensions: string;
  targetAudience: string;
  workflow: string;
  deliveryTime: string;
  requiredInput: string;
  ctaLabel: string;
  quoteCtaLabel: string;
  warnings: string;
  seoTitle: string;
  seoDescription: string;
  submitCreate: string;
  submitEdit: string;
  cancel: string;
  publicationHeading: string;
  eligibilityHeading: string;
  /** `{status}` is the raw DB status code, substituted client-side. */
  setStatusTemplate: string;
  partnerHeading: string;
  partnerNote: string;
  partnerEnabled: string;
  partnerFeatured: string;
  partnerRequiresApproval: string;
  partnerVisibility: string;
  partnerAvailability: string;
  commissionType: string;
  commissionTypeBps: string;
  commissionValue: string;
  commissionCurrency: string;
  commissionStatus: string;
  partnerMinimumPrice: string;
  partnerMaximumDiscount: string;
  partnerPriority: string;
  partnerSalesCopy: string;
  partnerTerms: string;
  legalHeading: string;
  /** `{status}` is the legacy-product status label, substituted client-side. */
  legalBlockedLegacyTemplate: string;
  legalNoPermission: string;
  legalStatus: string;
  priceStatus: string;
  legalTermsVersion: string;
  publicationReady: string;
  legalInternalNote: string;
  /** `{by}` / `{at}` are substituted client-side. */
  approvedByTemplate: string;
  saveLegal: string;
  archive: string;
  restoreFromArchive: string;
  deleteConfirm: string;
  safeDelete: string;
  empty: string;
}

export function buildProductEditorLabels(
  t: TranslateFn,
  locale: Locale,
): ProductEditorLabels {
  return {
    locale,
    breadcrumbProducts: t("admin.page.products.title"),
    breadcrumbNew: t("admin.productEditor.breadcrumbNew"),
    breadcrumbEdit: t("admin.common.edit"),
    createTitle: t("admin.productEditor.createTitle"),
    preview: t("admin.common.preview"),
    duplicate: t("admin.common.duplicate"),
    legacyBlockedNote: t("admin.productEditor.legacyBlockedNote"),
    checkoutDisabledNote: t("admin.productEditor.checkoutDisabledNote"),
    saved: t("admin.common.saved"),
    generalHeading: t("admin.productEditor.generalHeading"),
    name: t("admin.productEditor.name"),
    slug: t("admin.common.colSlug"),
    slugHint: t("admin.productEditor.slugHint"),
    internalSku: t("admin.productEditor.internalSku"),
    category: t("admin.productEditor.category"),
    noCategory: t("admin.productEditor.noCategory"),
    badge: t("admin.productEditor.badge"),
    tags: t("admin.productEditor.tags"),
    sortOrder: t("admin.productEditor.sortOrder"),
    featured: t("admin.productEditor.featured"),
    shortDescription: t("admin.productEditor.shortDescription"),
    fullDescription: t("admin.productEditor.fullDescription"),
    richTextHint: t("admin.productEditor.richTextHint"),
    pricingHeading: t("admin.productEditor.pricingHeading"),
    noPricePermission: t("admin.productEditor.noPricePermission"),
    priceMode: t("admin.productEditor.priceMode"),
    priceModeOptions: {
      FIXED: t("admin.productEditor.priceModeFixed"),
      STARTING_FROM: t("admin.productEditor.priceModeStartingFrom"),
      QUOTE_ONLY: t("admin.productEditor.priceModeQuoteOnly"),
    },
    billingModel: t("admin.productEditor.billingModel"),
    billingOptions: {
      ONE_TIME: t("admin.productEditor.billingOneTime"),
      MONTHLY: t("admin.productEditor.billingMonthly"),
      YEARLY: t("admin.productEditor.billingYearly"),
    },
    amount: t("admin.productEditor.amount"),
    amountHint: t("admin.productEditor.amountHint"),
    fromAmount: t("admin.productEditor.fromAmount"),
    compareAt: t("admin.productEditor.compareAt"),
    vatPercent: t("admin.productEditor.vatPercent"),
    priceLabel: t("admin.productEditor.priceLabel"),
    costPrice: t("admin.productEditor.costPrice"),
    priceIncludesVat: t("admin.productEditor.priceIncludesVat"),
    onlyFixedEligible: t("admin.productEditor.onlyFixedEligible"),
    audienceHeading: t("admin.productEditor.audienceHeading"),
    audienceNote: t("admin.productEditor.audienceNote"),
    contentHeading: t("admin.productEditor.contentHeading"),
    benefits: t("admin.productEditor.benefits"),
    includedItems: t("admin.productEditor.includedItems"),
    excludedItems: t("admin.productEditor.excludedItems"),
    extensions: t("admin.productEditor.extensions"),
    targetAudience: t("admin.productEditor.targetAudience"),
    workflow: t("admin.productEditor.workflow"),
    deliveryTime: t("admin.productEditor.deliveryTime"),
    requiredInput: t("admin.productEditor.requiredInput"),
    ctaLabel: t("admin.productEditor.ctaLabel"),
    quoteCtaLabel: t("admin.productEditor.quoteCtaLabel"),
    warnings: t("admin.productEditor.warnings"),
    seoTitle: t("admin.productEditor.seoTitle"),
    seoDescription: t("admin.productEditor.seoDescription"),
    submitCreate: t("admin.productEditor.submitCreate"),
    submitEdit: t("admin.common.saveChanges"),
    cancel: t("admin.common.cancel"),
    publicationHeading: t("admin.productEditor.publicationHeading"),
    eligibilityHeading: t("admin.productEditor.eligibilityHeading"),
    setStatusTemplate: t("admin.productEditor.setStatus"),
    partnerHeading: t("admin.productEditor.partnerHeading"),
    partnerNote: t("admin.productEditor.partnerNote"),
    partnerEnabled: t("admin.productEditor.partnerEnabled"),
    partnerFeatured: t("admin.productEditor.partnerFeatured"),
    partnerRequiresApproval: t("admin.productEditor.partnerRequiresApproval"),
    partnerVisibility: t("admin.productEditor.partnerVisibility"),
    partnerAvailability: t("admin.productEditor.partnerAvailability"),
    commissionType: t("admin.productEditor.commissionType"),
    commissionTypeBps: t("admin.productEditor.commissionTypeBps"),
    commissionValue: t("admin.productEditor.commissionValue"),
    commissionCurrency: t("admin.productEditor.commissionCurrency"),
    commissionStatus: t("admin.productEditor.commissionStatus"),
    partnerMinimumPrice: t("admin.productEditor.partnerMinimumPrice"),
    partnerMaximumDiscount: t("admin.productEditor.partnerMaximumDiscount"),
    partnerPriority: t("admin.productEditor.partnerPriority"),
    partnerSalesCopy: t("admin.productEditor.partnerSalesCopy"),
    partnerTerms: t("admin.productEditor.partnerTerms"),
    legalHeading: t("admin.productEditor.legalHeading"),
    legalBlockedLegacyTemplate: t("admin.productEditor.legalBlockedLegacy"),
    legalNoPermission: t("admin.productEditor.legalNoPermission"),
    legalStatus: t("admin.productEditor.legalStatus"),
    priceStatus: t("admin.productEditor.priceStatus"),
    legalTermsVersion: t("admin.productEditor.legalTermsVersion"),
    publicationReady: t("admin.productEditor.publicationReady"),
    legalInternalNote: t("admin.productEditor.legalInternalNote"),
    approvedByTemplate: t("admin.productEditor.approvedBy"),
    saveLegal: t("admin.productEditor.saveLegal"),
    archive: t("admin.common.archive"),
    restoreFromArchive: t("admin.productEditor.restoreFromArchive"),
    deleteConfirm: t("admin.productEditor.deleteConfirm"),
    safeDelete: t("admin.productEditor.safeDelete"),
    empty: t("admin.common.empty"),
  };
}
