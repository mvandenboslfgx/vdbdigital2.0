import type { TranslateFn } from "@/i18n/create-t";
import {
  PRICE_MODE_KEYS,
  PRODUCT_STATUS_KEYS,
  resolveLabelMap,
} from "@/lib/portal/labels";

/**
 * Copy for the catalogue badges. The badges are rendered inside the products
 * table (a client component), so the codes have to be resolved server-side and
 * handed down rather than looked up where they are displayed.
 */
export interface CatalogBadgeLabels {
  productStatus: Record<string, string>;
  priceMode: Record<string, string>;
  quoteOnlySuffix: string;
  directlySellable: string;
  checkoutBlocked: string;
  b2bAllowed: string;
  b2bAudience: string;
  b2cAllowed: string;
  b2cAudience: string;
}

export function buildCatalogBadgeLabels(t: TranslateFn): CatalogBadgeLabels {
  return {
    productStatus: resolveLabelMap(t, PRODUCT_STATUS_KEYS),
    priceMode: resolveLabelMap(t, PRICE_MODE_KEYS),
    quoteOnlySuffix: t("admin.catalog.badge.quoteOnlySuffix"),
    directlySellable: t("admin.catalog.badge.directlySellable"),
    checkoutBlocked: t("admin.catalog.badge.checkoutBlocked"),
    b2bAllowed: t("admin.catalog.badge.b2bAllowed"),
    b2bAudience: t("admin.catalog.badge.b2bAudience"),
    b2cAllowed: t("admin.catalog.badge.b2cAllowed"),
    b2cAudience: t("admin.catalog.badge.b2cAudience"),
  };
}
