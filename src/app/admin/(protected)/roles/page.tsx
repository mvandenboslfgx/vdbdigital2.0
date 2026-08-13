import type { Metadata } from "next";
import { Card } from "@/components/ui/container";
import { requireAdmin } from "@/server/auth/require-admin";
import { requirePermission } from "@/server/auth/require-permission";
import { getPermissionsForRole } from "@/lib/auth/permissions";
import { getDictionary } from "@/i18n/get-dictionary";
import type { AdminRole } from "@/types";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t("admin.page.roles.title"), robots: { index: false } };
}

/** DB role codes — displayed verbatim, never translated. */
const ROLES: AdminRole[] = ["OWNER", "ADMIN", "SUPPORT", "CONTENT"];

export default async function AdminRolesPage() {
  const { t } = await getDictionary();
  const ctx = await requireAdmin();
  await requirePermission(ctx, "roles.read");

  return (
    <div className="space-y-6">
      <h1 className="text-h1">{t("admin.page.roles.title")}</h1>
      <p className="text-muted text-small">{t("admin.page.roles.subtitle")}</p>
      <div className="grid md:grid-cols-2 gap-4">
        {ROLES.map((role) => (
          <Card key={role}>
            <h2 className="font-medium mb-3">{role}</h2>
            <ul className="text-small text-muted space-y-1 max-h-64 overflow-y-auto">
              {getPermissionsForRole(role).map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
