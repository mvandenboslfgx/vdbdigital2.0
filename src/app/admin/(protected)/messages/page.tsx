import type { Metadata } from "next";
import { EmptyState } from "@/components/portal/empty-state";
import { requireAdmin } from "@/server/auth/require-admin";
import { requirePermission } from "@/server/auth/require-permission";
import { createServiceRoleClient } from "@/lib/database/server";

export const metadata: Metadata = { title: "Berichten", robots: { index: false } };

export default async function AdminMessagesPage() {
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
      <h1 className="text-h1">Berichten</h1>
      <p className="text-muted text-small">
        Intern berichtencentrum. Geen externe livechatwidget actief.
      </p>
      {rows.length === 0 ? (
        <EmptyState
          title="Nog geen gesprekken"
          description="Klantgesprekken verschijnen hier zodra ze bestaan."
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
