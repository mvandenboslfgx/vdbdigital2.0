import type { Locale } from "@/i18n/config";
import type { TranslateFn } from "@/i18n/create-t";
import {
  BILLING_TYPE_KEYS,
  PRICE_MODE_KEYS,
  PRODUCT_STATUS_KEYS,
  labelOptions,
} from "@/lib/portal/labels";
import {
  buildCatalogBadgeLabels,
  type CatalogBadgeLabels,
} from "@/lib/admin/catalog-badge-labels";

/**
 * Copy for the admin products table. Resolved on the server and passed in as a
 * `labels` prop, same as the other admin editors. `locale` is included because
 * the table formats prices and dates client-side.
 */
export interface ProductsTableLabels {
  locale: Locale;
  title: string;
  subtitle: string;
  exportCsv: string;
  exportFileStem: string;
  exportFailed: string;
  newProduct: string;
  migrationNotApplied: string;
  bulkDone: string;
  search: string;
  searchPlaceholder: string;
  status: string;
  priceMode: string;
  billingType: string;
  audience: string;
  partnerHealth: string;
  category: string;
  all: string;
  audienceBoth: string;
  filter: string;
  selectedCount: string;
  hide: string;
  archive: string;
  setCategory: string;
  emptyTitle: string;
  emptyDescription: string;
  selectAll: string;
  /** `{name}` is substituted client-side per row. */
  selectRow: string;
  colProduct: string;
  colSku: string;
  colCategory: string;
  colPrice: string;
  colType: string;
  colBilling: string;
  colAudience: string;
  colStatus: string;
  colCheckout: string;
  colChanged: string;
  colActions: string;
  edit: string;
  empty: string;
  noCategory: string;
  noSku: string;
  countOne: string;
  countOther: string;
  previous: string;
  next: string;
  /** Ordered `{ value, label }` pairs; values stay DB codes. */
  statusOptions: { value: string; label: string }[];
  priceModeOptions: { value: string; label: string }[];
  billingTypeOptions: { value: string; label: string }[];
  badges: CatalogBadgeLabels;
}

export function buildProductsTableLabels(
  t: TranslateFn,
  locale: Locale,
): ProductsTableLabels {
  return {
    locale,
    title: t("admin.page.products.title"),
    subtitle: t("admin.page.products.subtitle"),
    exportCsv: t("admin.page.products.exportCsv"),
    exportFileStem: t("admin.page.products.exportFileStem"),
    exportFailed: t("admin.page.products.exportFailed"),
    newProduct: t("admin.page.products.newTitle"),
    migrationNotApplied: t("admin.page.products.migrationNotApplied"),
    bulkDone: t("admin.page.products.bulkDone"),
    search: t("admin.common.search"),
    searchPlaceholder: t("admin.page.products.searchPlaceholder"),
    status: t("admin.common.colStatus"),
    priceMode: t("admin.page.products.filterPriceMode"),
    billingType: t("admin.page.products.filterBillingType"),
    audience: t("admin.page.products.filterAudience"),
    partnerHealth: t("admin.page.products.filterPartnerHealth"),
    category: t("admin.common.colCategory"),
    all: t("admin.common.all"),
    audienceBoth: t("admin.page.products.audienceBoth"),
    filter: t("admin.common.filter"),
    selectedCount: t("admin.page.products.selectedCount"),
    hide: t("admin.page.products.hide"),
    archive: t("admin.common.archive"),
    setCategory: t("admin.page.products.setCategory"),
    emptyTitle: t("admin.page.products.emptyTitle"),
    emptyDescription: t("admin.page.products.emptyDescription"),
    selectAll: t("admin.page.products.selectAll"),
    selectRow: t("admin.page.products.selectRow"),
    colProduct: t("admin.page.products.colProduct"),
    colSku: t("admin.page.products.colSku"),
    colCategory: t("admin.common.colCategory"),
    colPrice: t("admin.page.products.colPrice"),
    colType: t("admin.common.colType"),
    colBilling: t("admin.page.products.colBilling"),
    colAudience: t("admin.page.products.colAudience"),
    colStatus: t("admin.common.colStatus"),
    colCheckout: t("admin.page.products.colCheckout"),
    colChanged: t("admin.page.products.colChanged"),
    colActions: t("admin.common.actions"),
    edit: t("admin.common.edit"),
    empty: t("admin.common.empty"),
    noCategory: t("admin.page.products.noCategory"),
    noSku: t("admin.page.products.noSku"),
    countOne: t("admin.page.products.countOne"),
    countOther: t("admin.page.products.countOther"),
    previous: t("admin.common.previous"),
    next: t("admin.common.next"),
    statusOptions: labelOptions(t, PRODUCT_STATUS_KEYS),
    priceModeOptions: labelOptions(t, PRICE_MODE_KEYS),
    billingTypeOptions: labelOptions(t, BILLING_TYPE_KEYS),
    badges: buildCatalogBadgeLabels(t),
  };
}
