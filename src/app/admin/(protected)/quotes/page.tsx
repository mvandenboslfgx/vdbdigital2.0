import type { Metadata } from "next";
import { EmptyState } from "@/components/portal/empty-state";
import { requireAdmin } from "@/server/auth/require-admin";
import { requirePermission } from "@/server/auth/require-permission";
import { createServiceRoleClient } from "@/lib/database/server";
import { formatEuro } from "@/server/repositories/portal";
import { QUOTE_STATUS_NL, labelNl } from "@/lib/portal/labels";

export const metadata: Metadata = { title: "Offertes", robots: { index: false } };

export default async function AdminQuotesPage() {
  const ctx = await requireAdmin();
  await requirePermission(ctx, "quotes.manage");
  const supabase = createServiceRoleClient();
  const { data } = supabase
    ? await supabase
        .from("portal_quotes")
        .select("id, quote_number, title, status, total_cents, currency, created_at")
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [] };

  const rows = data ?? [];
  return (
    <div className="space-y-6">
      <h1 className="text-h1">Offertes</h1>
      {rows.length === 0 ? (
        <EmptyState
          title="Nog geen offertes"
          description="Offertes verschijnen hier zodra ze in de database staan. Geen fictieve data."
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((q) => (
            <li key={q.id} className="rounded-lg border border-border p-4 text-small">
              {q.quote_number}: {q.title} · {formatEuro(q.total_cents, q.currency)} ·{" "}
              {labelNl(QUOTE_STATUS_NL, q.status)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
