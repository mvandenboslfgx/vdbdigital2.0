import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AddonsManager } from "@/components/admin/addons-manager";
import { getAdminAddons } from "@/server/repositories/admin-addons";
import { checkAdminAccess } from "@/server/auth/require-admin";
import { hasPermission } from "@/lib/auth/permissions";
import { getDictionary } from "@/i18n/get-dictionary";
import { buildAddonsManagerLabels } from "@/lib/admin/catalog-manager-labels";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t("admin.page.addons.title"), robots: { index: false } };
}

export default async function AdminAddonsPage() {
  const { t } = await getDictionary();
  const access = await checkAdminAccess();
  if (!access.authorized || !access.context) redirect("/admin/login");
  if (!hasPermission(access.context.role, "products.read")) redirect("/admin");

  const { addons, error } = await getAdminAddons();

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-small">
          {error.includes("does not exist")
            ? t("admin.page.addons.migrationRequired")
            : error}
        </div>
      )}
      <AddonsManager
        addons={addons}
        canManage={hasPermission(access.context.role, "products.manage_addons")}
        labels={buildAddonsManagerLabels(t)}
      />
    </div>
  );
}
