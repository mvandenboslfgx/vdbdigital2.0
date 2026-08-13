import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ProductEditorForm } from "@/components/admin/product-editor-form";
import { getAdminProductById } from "@/server/repositories/admin-products";
import { getAdminCategoryOptions } from "@/server/repositories/admin-categories";
import { checkAdminAccess } from "@/server/auth/require-admin";
import { hasPermission } from "@/lib/auth/permissions";
import { buildPublicationChecklist } from "@/lib/commerce/publication-checklist";
import { getCheckoutBlockLabelsNl } from "@/lib/commerce/catalog-admin-eligibility";
import { isLegacyTawkProduct } from "@/lib/commerce/tawk-legacy-blocklist";
import { getDictionary } from "@/i18n/get-dictionary";
import { buildTranslationPanelLabels } from "@/lib/admin/translation-panel-labels";
import { buildProductEditorLabels } from "@/lib/admin/product-editor-labels";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t("admin.page.products.editTitle"), robots: { index: false } };
}

export default async function AdminEditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t, locale } = await getDictionary();
  const { id } = await params;
  const access = await checkAdminAccess();
  if (!access.authorized || !access.context) redirect("/admin/login");
  if (!hasPermission(access.context.role, "products.read")) {
    redirect("/admin");
  }

  const product = await getAdminProductById(id);
  if (!product) notFound();

  const categories = await getAdminCategoryOptions();
  const checklist = buildPublicationChecklist(product);
  const blockReasons = getCheckoutBlockLabelsNl(product, "B2B");
  const legacyRemoved = isLegacyTawkProduct(product);

  return (
    <ProductEditorForm
      mode="edit"
      product={product}
      categories={categories}
      checklist={checklist}
      canPublish={hasPermission(access.context.role, "products.publish")}
      canChangePrice={hasPermission(access.context.role, "products.change_price")}
      canLegal={hasPermission(access.context.role, "products.legal_approve")}
      canArchive={hasPermission(access.context.role, "products.archive")}
      blockReasons={blockReasons}
      legacyRemoved={legacyRemoved}
      translationLabels={buildTranslationPanelLabels(t)}
      labels={buildProductEditorLabels(t, locale)}
    />
  );
}
