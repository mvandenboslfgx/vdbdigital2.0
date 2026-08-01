import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/portal/empty-state";
import { requireAdmin } from "@/server/auth/require-admin";
import { requirePermission } from "@/server/auth/require-permission";
import { createServiceRoleClient } from "@/lib/database/server";
import { TICKET_STATUS_KEYS, labelFor } from "@/lib/portal/labels";
import { getDictionary } from "@/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t("admin.page.support.title"), robots: { index: false } };
}

export default async function AdminSupportPage() {
  const { t } = await getDictionary();
  const ctx = await requireAdmin();
  await requirePermission(ctx, "support.manage");
  const supabase = createServiceRoleClient();
  const { data } = supabase
    ? await supabase
        .from("portal_support_tickets")
        .select("id, ticket_number, subject, status, priority, created_at, category")
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [] };

  const rows = data ?? [];
  return (
    <div className="space-y-6" data-testid="admin-support-list">
      <h1 className="text-h1">{t("admin.page.support.title")}</h1>
      {rows.length === 0 ? (
        <EmptyState
          title={t("admin.page.support.emptyTitle")}
          description={t("admin.page.support.emptyDescription")}
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((ticket) => (
            <li
              key={ticket.id}
              className="rounded-lg border border-border p-4 text-small"
            >
              <Link
                href={`/admin/support/${ticket.id}`}
                className="text-primary hover:underline"
                data-testid={`admin-support-row-${ticket.ticket_number}`}
              >
                {ticket.ticket_number}: {ticket.subject}
              </Link>
              <span className="text-muted">
                {" "}
                · {labelFor(t, TICKET_STATUS_KEYS, ticket.status)} ·{" "}
                {ticket.priority}
                {ticket.category ? ` · ${ticket.category}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
