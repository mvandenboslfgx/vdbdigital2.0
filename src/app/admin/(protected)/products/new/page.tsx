import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProductEditorForm } from "@/components/admin/product-editor-form";
import { getAdminCategoryOptions } from "@/server/repositories/admin-categories";
import { checkAdminAccess } from "@/server/auth/require-admin";
import { hasPermission } from "@/lib/auth/permissions";
import { getDictionary } from "@/i18n/get-dictionary";
import { buildTranslationPanelLabels } from "@/lib/admin/translation-panel-labels";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t("admin.page.products.newTitle"), robots: { index: false } };
}

export default async function AdminNewProductPage() {
  const { t } = await getDictionary();
  const access = await checkAdminAccess();
  if (!access.authorized || !access.context) redirect("/admin/login");
  if (!hasPermission(access.context.role, "products.create")) {
    redirect("/admin/products");
  }

  const categories = await getAdminCategoryOptions();

  return (
    <ProductEditorForm
      mode="create"
      categories={categories}
      canPublish={hasPermission(access.context.role, "products.publish")}
      canChangePrice={hasPermission(access.context.role, "products.change_price")}
      canLegal={hasPermission(access.context.role, "products.legal_approve")}
      canArchive={hasPermission(access.context.role, "products.archive")}
      blockReasons={[t("admin.page.productPreview.checkoutDisabled")]}
      translationLabels={buildTranslationPanelLabels(t)}
    />
  );
}
