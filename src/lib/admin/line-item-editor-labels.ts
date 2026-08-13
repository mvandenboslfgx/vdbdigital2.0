import type { TranslateFn } from "@/i18n/create-t";

/**
 * Copy for the quote and invoice line-item editors. Both are client
 * components, so the strings are resolved on the server and passed in as one
 * `labels` prop — same contract as the product editor.
 *
 * The two editors share the line grid and the indicative-totals block, so the
 * shared fields live in `LineItemEditorLabels` and each editor adds only what
 * is genuinely specific to it.
 */
interface SharedLineItemLabels {
  organization: string;
  title: string;
  description: string;
  linesHeading: string;
  addLine: string;
  quantity: string;
  remove: string;
  saving: string;
  submitEdit: string;
  /** Line/item type options keyed by DB enum code. */
  itemType: Record<string, string>;
}

function buildShared(t: TranslateFn): SharedLineItemLabels {
  return {
    organization: t("admin.common.colOrganization"),
    title: t("admin.common.colTitle"),
    description: t("admin.lineItemEditor.description"),
    linesHeading: t("admin.lineItemEditor.linesHeading"),
    addLine: t("admin.lineItemEditor.addLine"),
    quantity: t("admin.lineItemEditor.quantity"),
    remove: t("admin.common.delete"),
    saving: t("admin.common.saving"),
    submitEdit: t("admin.common.saveChanges"),
    itemType: {
      SERVICE: t("admin.lineItemEditor.itemType.SERVICE"),
      PRODUCT: t("admin.lineItemEditor.itemType.PRODUCT"),
      ADDON: t("admin.lineItemEditor.itemType.ADDON"),
      CUSTOM: t("admin.lineItemEditor.itemType.CUSTOM"),
      DISCOUNT: t("admin.lineItemEditor.itemType.DISCOUNT"),
    },
  };
}

export interface QuoteEditorLabels extends SharedLineItemLabels {
  projectOptional: string;
  projectPlaceholder: string;
  validUntil: string;
  termsVersion: string;
  discountAmount: string;
  priceExclVat: string;
  optionalLine: string;
  /** `{amount}` is substituted client-side. */
  lineTotalTemplate: string;
  subtotalPreview: string;
  vatPreview: string;
  totalPreview: string;
  previewNotAuthoritative: string;
  submitCreate: string;
}

export function buildQuoteEditorLabels(t: TranslateFn): QuoteEditorLabels {
  return {
    ...buildShared(t),
    projectOptional: t("admin.lineItemEditor.projectOptional"),
    projectPlaceholder: "Project-UUID",
    validUntil: t("admin.common.colValidUntil"),
    termsVersion: t("admin.lineItemEditor.termsVersion"),
    discountAmount: t("admin.lineItemEditor.discountAmount"),
    priceExclVat: t("admin.lineItemEditor.priceExclVat"),
    optionalLine: t("admin.lineItemEditor.optionalLine"),
    lineTotalTemplate: t("admin.lineItemEditor.lineTotalIndicative"),
    subtotalPreview: t("admin.lineItemEditor.subtotalPreview"),
    vatPreview: t("admin.lineItemEditor.vatPreview"),
    totalPreview: t("admin.lineItemEditor.totalPreview"),
    previewNotAuthoritative: t("admin.lineItemEditor.previewNotAuthoritative"),
    submitCreate: t("admin.page.quotes.form.submit"),
  };
}

export interface InvoiceEditorLabels extends SharedLineItemLabels {
  chooseOrganization: string;
  type: string;
  issueDate: string;
  dueDate: string;
  projectIdOptional: string;
  quoteIdOptional: string;
  paymentInstruction: string;
  paymentInstructionPlaceholder: string;
  externalAccountingReference: string;
  headerDiscount: string;
  priceEur: string;
  vatBasisPoints: string;
  subtotalIndicative: string;
  vatIndicative: string;
  totalIndicative: string;
  serverRecalculates: string;
  submitCreate: string;
  /** Invoice document type options keyed by DB enum code. */
  invoiceType: Record<string, string>;
}

export function buildInvoiceEditorLabels(t: TranslateFn): InvoiceEditorLabels {
  return {
    ...buildShared(t),
    chooseOrganization: t("admin.lineItemEditor.chooseOrganization"),
    type: t("admin.common.colType"),
    issueDate: t("admin.lineItemEditor.issueDate"),
    dueDate: t("admin.lineItemEditor.dueDate"),
    projectIdOptional: t("admin.lineItemEditor.projectIdOptional"),
    quoteIdOptional: t("admin.lineItemEditor.quoteIdOptional"),
    paymentInstruction: t("admin.lineItemEditor.paymentInstruction"),
    paymentInstructionPlaceholder: t(
      "admin.lineItemEditor.paymentInstructionPlaceholder",
    ),
    externalAccountingReference: t("admin.lineItemEditor.externalAccountingReference"),
    headerDiscount: t("admin.lineItemEditor.headerDiscount"),
    priceEur: t("admin.lineItemEditor.priceEur"),
    vatBasisPoints: t("admin.lineItemEditor.vatBasisPoints"),
    subtotalIndicative: t("admin.lineItemEditor.subtotalIndicative"),
    vatIndicative: t("admin.lineItemEditor.vatIndicative"),
    totalIndicative: t("admin.lineItemEditor.totalIndicative"),
    serverRecalculates: t("admin.lineItemEditor.serverRecalculates"),
    submitCreate: t("admin.page.invoices.submitCreate"),
    invoiceType: {
      INVOICE: t("admin.lineItemEditor.invoiceType.INVOICE"),
      CREDIT_NOTE: t("admin.lineItemEditor.invoiceType.CREDIT_NOTE"),
      PROFORMA: t("admin.lineItemEditor.invoiceType.PROFORMA"),
    },
  };
}
