import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CategoriesManager } from "@/components/admin/categories-manager";
import { getAdminCategories } from "@/server/repositories/admin-categories";
import { checkAdminAccess } from "@/server/auth/require-admin";
import { hasPermission } from "@/lib/auth/permissions";
import { getDictionary } from "@/i18n/get-dictionary";
import { buildCategoriesManagerLabels } from "@/lib/admin/catalog-manager-labels";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t("admin.page.categories.title"), robots: { index: false } };
}

export default async function AdminCategoriesPage() {
  const { t } = await getDictionary();
  const access = await checkAdminAccess();
  if (!access.authorized || !access.context) redirect("/admin/login");
  if (!hasPermission(access.context.role, "products.read")) redirect("/admin");

  const { categories, error } = await getAdminCategories();

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-small">
          {error}
        </div>
      )}
      <CategoriesManager
        categories={categories}
        canManage={hasPermission(access.context.role, "categories.manage")}
        labels={buildCategoriesManagerLabels(t)}
      />
    </div>
  );
}
