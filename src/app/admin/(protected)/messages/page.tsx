import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/portal/empty-state";
import { requireAdmin } from "@/server/auth/require-admin";
import { requirePermission } from "@/server/auth/require-permission";
import { createServiceRoleClient } from "@/lib/database/server";

export const metadata: Metadata = { title: "Berichten", robots: { index: false, follow: false } };

export default async function AdminMessagesPage() {
  const ctx = await requireAdmin();
  await requirePermission(ctx, "messages.manage");
  const supabase = createServiceRoleClient();
  const { data } = supabase
    ? await supabase
        .from("portal_conversations")
        .select("id, subject, status, last_message_at, created_at")
        .neq("conversation_type", "INTERNAL")
        .is("deleted_at", null)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [] };

  const rows = data ?? [];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1">Berichten</h1>
        <p className="text-muted text-small mt-1">
          Beveiligde klantgesprekken vanuit het portaal.
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Nog geen gesprekken"
          description="Klantgesprekken verschijnen hier zodra een klant een bericht start."
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((c) => (
            <li key={c.id}>
              <Link
                href={`/admin/messages/${c.id}`}
                className="block rounded-xl border border-border bg-surface p-5 hover:border-primary"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{c.subject}</span>
                  <span className="text-xs text-muted">{c.status}</span>
                </div>
                <p className="text-small text-muted mt-2">
                  {c.last_message_at
                    ? new Date(c.last_message_at).toLocaleString("nl-NL")
                    : new Date(c.created_at).toLocaleString("nl-NL")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
