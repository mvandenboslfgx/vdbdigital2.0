import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/portal/empty-state";
import { requireAdmin } from "@/server/auth/require-admin";
import { requirePermission } from "@/server/auth/require-permission";
import { createServiceRoleClient } from "@/lib/database/server";
import { TICKET_STATUS_NL, labelNl } from "@/lib/portal/labels";

export const metadata: Metadata = { title: "Support", robots: { index: false } };

export default async function AdminSupportPage() {
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
      <h1 className="text-h1">Support</h1>
      {rows.length === 0 ? (
        <EmptyState
          title="Nog geen tickets"
          description="Supporttickets van klanten verschijnen hier. Niets verdwijnt stil."
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((t) => (
            <li key={t.id} className="rounded-lg border border-border p-4 text-small">
              <Link
                href={`/admin/support/${t.id}`}
                className="text-primary hover:underline"
                data-testid={`admin-support-row-${t.ticket_number}`}
              >
                {t.ticket_number}: {t.subject}
              </Link>
              <span className="text-muted">
                {" "}
                · {labelNl(TICKET_STATUS_NL, t.status) || t.status} · {t.priority}
                {t.category ? ` · ${t.category}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
