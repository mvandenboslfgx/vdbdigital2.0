import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AddonsManager } from "@/components/admin/addons-manager";
import { getAdminAddons } from "@/server/repositories/admin-addons";
import { checkAdminAccess } from "@/server/auth/require-admin";
import { hasPermission } from "@/lib/auth/permissions";

export const metadata: Metadata = {
  title: "Add-ons",
  robots: { index: false },
};

export default async function AdminAddonsPage() {
  const access = await checkAdminAccess();
  if (!access.authorized || !access.context) redirect("/admin/login");
  if (!hasPermission(access.context.role, "products.read")) redirect("/admin");

  const { addons, error } = await getAdminAddons();

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-small">
          {error.includes("does not exist")
            ? "Add-on tabellen vereisen de catalogusmigratie (nog niet live toegepast)."
            : error}
        </div>
      )}
      <AddonsManager
        addons={addons}
        canManage={hasPermission(access.context.role, "products.manage_addons")}
      />
    </div>
  );
}
