import type { Metadata } from "next";
import { EmptyState } from "@/components/portal/empty-state";
import { requireAdmin } from "@/server/auth/require-admin";
import { requirePermission } from "@/server/auth/require-permission";
import { createServiceRoleClient } from "@/lib/database/server";
import { getDictionary } from "@/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t("admin.page.notifications.title"), robots: { index: false } };
}

export default async function AdminNotificationsPage() {
  const { t } = await getDictionary();
  const ctx = await requireAdmin();
  await requirePermission(ctx, "notifications.manage");
  const supabase = createServiceRoleClient();
  const { data } = supabase
    ? await supabase
        .from("portal_notifications")
        .select("id, title, type, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [] };

  const rows = data ?? [];
  return (
    <div className="space-y-6">
      <h1 className="text-h1">{t("admin.page.notifications.title")}</h1>
      {rows.length === 0 ? (
        <EmptyState
          title={t("admin.page.notifications.emptyTitle")}
          description={t("admin.page.notifications.emptyDescription")}
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((n) => (
            <li key={n.id} className="rounded-lg border border-border p-4 text-small">
              {n.title} · {n.type}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
