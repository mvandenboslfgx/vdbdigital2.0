import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/portal/empty-state";
import { formatEuro, listPortalInvoices } from "@/server/repositories/portal";
import {
  INVOICE_STATUS_NL,
  INVOICE_TYPE_NL,
  labelNl,
} from "@/lib/portal/labels";
import { customerFacingInvoiceStatus } from "@/lib/commerce/invoice-status";

export const metadata: Metadata = {
  title: "Facturen",
  robots: { index: false },
};

export default async function PortalInvoicesPage() {
  const { invoices, denied } = await listPortalInvoices();

  return (
    <div className="space-y-6">
      <h1 className="text-h1">Facturen</h1>
      <p className="text-muted text-small">
        Alleen ter inzage. Online betalen is niet actief in deze omgeving.
      </p>
      {denied ? (
        <EmptyState
          title="Geen toegang"
          description="Je hebt geen rechten om facturen te bekijken."
        />
      ) : invoices.length === 0 ? (
        <EmptyState
          title="Er zijn momenteel geen facturen beschikbaar."
          description="Zodra een factuur is uitgegeven, verschijnt deze hier."
        />
      ) : (
        <ul className="space-y-3">
          {invoices.map((inv) => {
            const status = customerFacingInvoiceStatus({
              status: inv.status,
              dueDate: inv.due_date,
              amountDueCents: inv.amount_due_cents ?? 0,
            });
            return (
              <li key={inv.id}>
                <Link
                  href={`/portal/facturen/${inv.id}`}
                  className="rounded-xl border border-border bg-surface p-5 flex flex-wrap justify-between gap-3 block hover:border-primary/40"
                >
                  <div>
                    <p className="font-medium">{inv.invoice_number}</p>
                    <p className="text-small text-muted">
                      {labelNl(INVOICE_TYPE_NL, inv.invoice_type ?? "INVOICE")}
                      {inv.title ? ` · ${inv.title}` : ""}
                    </p>
                    <p className="text-small text-muted">
                      {inv.issue_date
                        ? new Date(inv.issue_date).toLocaleDateString("nl-NL")
                        : "—"}
                      {inv.due_date
                        ? ` · vervalt ${new Date(inv.due_date).toLocaleDateString("nl-NL")}`
                        : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatEuro(inv.total_cents, inv.currency)}
                    </p>
                    <p className="text-small text-muted">
                      Openstaand{" "}
                      {formatEuro(inv.amount_due_cents ?? 0, inv.currency)}
                    </p>
                    <p className="text-small text-muted">
                      {labelNl(INVOICE_STATUS_NL, status)}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
