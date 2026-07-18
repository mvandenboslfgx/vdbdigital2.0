import type { Metadata } from "next";
import { EmptyState } from "@/components/portal/empty-state";
import { formatEuro, listPortalInvoices } from "@/server/repositories/portal";
import { INVOICE_STATUS_NL, labelNl } from "@/lib/portal/labels";

export const metadata: Metadata = {
  title: "Facturen",
  robots: { index: false },
};

export default async function PortalInvoicesPage() {
  const { invoices } = await listPortalInvoices();

  return (
    <div className="space-y-6">
      <h1 className="text-h1">Facturen</h1>
      <p className="text-muted text-small">
        Alleen ter inzage. Er wordt geen online betaling gestart vanuit dit
        portaal.
      </p>
      {invoices.length === 0 ? (
        <EmptyState
          title="Geen facturen"
          description="Er zijn nog geen facturen gedeeld met jouw organisatie."
        />
      ) : (
        <ul className="space-y-3">
          {invoices.map((inv) => (
            <li
              key={inv.id}
              className="rounded-xl border border-border bg-surface p-5 flex flex-wrap justify-between gap-3"
            >
              <div>
                <p className="font-medium">{inv.invoice_number}</p>
                <p className="text-small text-muted">
                  {inv.issue_date
                    ? new Date(inv.issue_date).toLocaleDateString("nl-NL")
                    : "—"}
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium">
                  {formatEuro(inv.total_cents, inv.currency)}
                </p>
                <p className="text-small text-muted">
                  {labelNl(INVOICE_STATUS_NL, inv.status)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
