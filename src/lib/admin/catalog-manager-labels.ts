import type { TranslateFn } from "@/i18n/create-t";

/**
 * The catalogue managers are client components, so their copy has to be
 * resolved on the server and handed in as a prop — same contract as
 * `buildTranslationPanelLabels`. Keeping the shapes here makes the exact key
 * set reviewable in one place instead of scattered across JSX.
 */
export interface CategoriesManagerLabels {
  title: string;
  subtitle: string;
  saved: string;
  colName: string;
  colSlug: string;
  colNameNl: string;
  colProducts: string;
  colActive: string;
  colOrder: string;
  colActions: string;
  yes: string;
  no: string;
  empty: string;
  edit: string;
  delete: string;
  createHeading: string;
  /** `{name}` is substituted client-side with the category being edited. */
  editHeadingTemplate: string;
  fieldName: string;
  fieldSlug: string;
  fieldNameNl: string;
  fieldOrder: string;
  fieldImagePath: string;
  fieldActive: string;
  fieldDescription: string;
  fieldDescriptionNl: string;
  save: string;
  cancel: string;
}

export function buildCategoriesManagerLabels(t: TranslateFn): CategoriesManagerLabels {
  return {
    title: t("admin.page.categories.title"),
    subtitle: t("admin.page.categories.subtitle"),
    saved: t("admin.page.categories.saved"),
    colName: t("admin.common.colName"),
    colSlug: t("admin.common.colSlug"),
    colNameNl: t("admin.page.categories.colNameNl"),
    colProducts: t("admin.common.colProducts"),
    colActive: t("admin.common.colActive"),
    colOrder: t("admin.common.colOrder"),
    colActions: t("admin.common.actions"),
    yes: t("admin.common.yes"),
    no: t("admin.common.no"),
    empty: t("admin.common.empty"),
    edit: t("admin.common.edit"),
    delete: t("admin.common.delete"),
    createHeading: t("admin.page.categories.createHeading"),
    editHeadingTemplate: t("admin.page.categories.editHeading"),
    fieldName: t("admin.page.categories.fieldName"),
    fieldSlug: t("admin.common.colSlug"),
    fieldNameNl: t("admin.page.categories.fieldNameNl"),
    fieldOrder: t("admin.common.colOrder"),
    fieldImagePath: t("admin.page.categories.fieldImagePath"),
    fieldActive: t("admin.common.active"),
    fieldDescription: t("admin.page.categories.fieldDescription"),
    fieldDescriptionNl: t("admin.page.categories.fieldDescriptionNl"),
    save: t("admin.common.save"),
    cancel: t("admin.common.cancel"),
  };
}

export interface AddonsManagerLabels {
  heading: string;
  subtitle: string;
  emptyState: string;
  active: string;
  inactive: string;
  quotePrice: string;
  createHeading: string;
  fieldName: string;
  fieldSlug: string;
  fieldNameNl: string;
  fieldPrice: string;
  fieldPriceMode: string;
  fieldBillingLabel: string;
  fieldOrder: string;
  fieldActive: string;
  fieldDescription: string;
  fieldDescriptionNl: string;
  /** Billing options are DB enum codes; only the display label is translated. */
  billing: Record<string, string>;
  recurringNote: string;
  submit: string;
}

export function buildAddonsManagerLabels(t: TranslateFn): AddonsManagerLabels {
  return {
    heading: t("admin.page.addons.heading"),
    subtitle: t("admin.page.addons.subtitle"),
    emptyState: t("admin.page.addons.emptyState"),
    active: t("admin.common.active"),
    inactive: t("admin.common.inactive"),
    quotePrice: t("admin.page.addons.quotePrice"),
    createHeading: t("admin.page.addons.createHeading"),
    fieldName: t("admin.page.addons.fieldName"),
    fieldSlug: t("admin.common.colSlug"),
    fieldNameNl: t("admin.page.addons.fieldNameNl"),
    fieldPrice: t("admin.page.addons.fieldPrice"),
    fieldPriceMode: t("admin.page.addons.fieldPriceMode"),
    fieldBillingLabel: t("admin.page.addons.fieldBillingLabel"),
    fieldOrder: t("admin.page.addons.fieldOrder"),
    fieldActive: t("admin.common.active"),
    fieldDescription: t("admin.page.addons.fieldDescription"),
    fieldDescriptionNl: t("admin.page.addons.fieldDescriptionNl"),
    billing: {
      ONE_TIME: t("admin.page.addons.billingOneTime"),
      MONTHLY: t("admin.page.addons.billingMonthly"),
      YEARLY: t("admin.page.addons.billingYearly"),
      QUOTE_ONLY: t("admin.page.addons.billingQuote"),
    },
    recurringNote: t("admin.page.addons.recurringNote"),
    submit: t("admin.page.addons.submit"),
  };
}
