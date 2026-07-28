import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminProductsTable, type ProductListRow } from "@/components/admin/admin-products-table";
import { getAdminProductList } from "@/server/repositories/admin-products";
import { getAdminCategoryOptions } from "@/server/repositories/admin-categories";
import { checkAdminAccess } from "@/server/auth/require-admin";
import { hasPermission } from "@/lib/auth/permissions";
import {
  getCheckoutBlockLabelsNl,
  isDirectlySellableServerSide,
  resolveStoredOrDerivedPriceMode,
  resolveCommercialItemForProduct,
} from "@/lib/commerce/catalog-admin-eligibility";
import { canPublishForB2b, canPublishForB2c } from "@/config/commercial/pricing";
import {
  isLegacyTawkProduct,
  LEGACY_TAWK_ADMIN_STATUS_LABEL,
} from "@/lib/commerce/tawk-legacy-blocklist";
import type { BillingType, PriceMode, ProductStatus } from "@/types";

export const metadata: Metadata = {
  title: "Producten",
  robots: { index: false },
};

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const access = await checkAdminAccess();
  const role = access.context?.role ?? "SUPPORT";

  const list = await getAdminProductList({
    q: typeof params.q === "string" ? params.q : undefined,
    categoryId: typeof params.categoryId === "string" ? params.categoryId : undefined,
    status: (typeof params.status === "string" ? params.status : "ALL") as ProductStatus | "ALL",
    priceMode: (typeof params.priceMode === "string" ? params.priceMode : "ALL") as
      | PriceMode
      | "ALL",
    billingType: (typeof params.billingType === "string" ? params.billingType : "ALL") as
      | BillingType
      | "ALL",
    audience: (typeof params.audience === "string" ? params.audience : "ALL") as
      | "B2B"
      | "B2C"
      | "BOTH"
      | "ALL",
    partnerHealth: (typeof params.partnerHealth === "string"
      ? params.partnerHealth
      : "ALL") as
      | "ALL"
      | "COMMISSION_CONFIGURATION_REQUIRED"
      | "LEGAL_REVIEW_REQUIRED"
      | "OWN_SERVICES_READY"
      | "HIDDEN_BLOCKED",
    sort: (typeof params.sort === "string" ? params.sort : "sort_order") as
      | "updated_at"
      | "name"
      | "sort_order"
      | "price",
    page: Number(params.page ?? 1) || 1,
    pageSize: 20,
  });

  const categories = await getAdminCategoryOptions();

  const rows: ProductListRow[] = list.products.map((p) => {
    const commercial = resolveCommercialItemForProduct(p);
    const legacyRemoved = isLegacyTawkProduct(p);
    return {
      ...p,
      priceModeLabel: resolveStoredOrDerivedPriceMode(p),
      checkoutBlockedReasons: legacyRemoved
        ? [LEGACY_TAWK_ADMIN_STATUS_LABEL]
        : getCheckoutBlockLabelsNl(p, "B2B"),
      directlySellable: legacyRemoved ? false : isDirectlySellableServerSide(p),
      b2bLegal: commercial ? canPublishForB2b(commercial) : false,
      b2cLegal: commercial ? canPublishForB2c(commercial) : false,
      legacyRemoved,
      legacyStatusLabel: legacyRemoved ? LEGACY_TAWK_ADMIN_STATUS_LABEL : undefined,
    };
  });

  return (
    <Suspense fallback={<p className="text-muted">Producten laden…</p>}>
      <AdminProductsTable
        rows={rows}
        total={list.total}
        page={list.page}
        pageSize={list.pageSize}
        categories={categories}
        canCreate={hasPermission(role, "products.create")}
        canExport={hasPermission(role, "products.export")}
        canBulk={hasPermission(role, "products.update")}
        schemaExtended={list.schemaExtended}
        error={list.error}
      />
    </Suspense>
  );
}
