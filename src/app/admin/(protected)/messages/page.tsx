import type { Metadata } from "next";
import { EmptyState } from "@/components/portal/empty-state";
import { requireAdmin } from "@/server/auth/require-admin";
import { requirePermission } from "@/server/auth/require-permission";
import { createServiceRoleClient } from "@/lib/database/server";
import { getDictionary } from "@/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t("admin.page.messages.title"), robots: { index: false } };
}

export default async function AdminMessagesPage() {
  const { t } = await getDictionary();
  const ctx = await requireAdmin();
  await requirePermission(ctx, "messages.manage");
  const supabase = createServiceRoleClient();
  const { data } = supabase
    ? await supabase
        .from("portal_conversations")
        .select("id, subject, status, last_message_at, created_at")
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [] };

  const rows = data ?? [];
  return (
    <div className="space-y-6">
      <h1 className="text-h1">{t("admin.page.messages.title")}</h1>
      <p className="text-muted text-small">{t("admin.page.messages.subtitle")}</p>
      {rows.length === 0 ? (
        <EmptyState
          title={t("admin.page.messages.emptyTitle")}
          description={t("admin.page.messages.emptyDescription")}
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((c) => (
            <li key={c.id} className="rounded-lg border border-border p-4 text-small">
              {c.subject} · {c.status}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
