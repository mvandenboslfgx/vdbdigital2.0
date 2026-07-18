import type { Metadata } from "next";
import { EmptyState } from "@/components/portal/empty-state";
import { requireAdmin } from "@/server/auth/require-admin";
import { requirePermission } from "@/server/auth/require-permission";
import { createServiceRoleClient } from "@/lib/database/server";
import { formatEuro } from "@/server/repositories/portal";
import { INVOICE_STATUS_NL, labelNl } from "@/lib/portal/labels";

export const metadata: Metadata = { title: "Facturen", robots: { index: false } };

export default async function AdminInvoicesPage() {
  const ctx = await requireAdmin();
  await requirePermission(ctx, "invoices.manage");
  const supabase = createServiceRoleClient();
  const { data } = supabase
    ? await supabase
        .from("portal_invoices")
        .select("id, invoice_number, status, total_cents, currency, created_at")
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [] };

  const rows = data ?? [];
  return (
    <div className="space-y-6">
      <h1 className="text-h1">Facturen</h1>
      <p className="text-muted text-small">
        Alleen weergave — geen Mollie-betaling vanuit admin.
      </p>
      {rows.length === 0 ? (
        <EmptyState
          title="Nog geen facturen"
          description="Facturen verschijnen hier wanneer ze zijn toegevoegd. Geen automatische incasso."
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((inv) => (
            <li key={inv.id} className="rounded-lg border border-border p-4 text-small">
              {inv.invoice_number} · {formatEuro(inv.total_cents, inv.currency)} ·{" "}
              {labelNl(INVOICE_STATUS_NL, inv.status)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
