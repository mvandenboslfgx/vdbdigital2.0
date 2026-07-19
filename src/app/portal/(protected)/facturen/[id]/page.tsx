import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatEuro, getPortalInvoice } from "@/server/repositories/portal";
import {
  INVOICE_STATUS_NL,
  INVOICE_TYPE_NL,
  labelNl,
} from "@/lib/portal/labels";
import { customerFacingInvoiceStatus } from "@/lib/commerce/invoice-status";
import { hasCustomerPermission } from "@/lib/auth/customer-permissions";

export const metadata: Metadata = {
  title: "Factuur",
  robots: { index: false },
};

export default async function PortalInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { invoice, items, creditNotes, ctx, denied } = await getPortalInvoice(id);
  if (denied) notFound();
  if (!invoice) notFound();

  const status = customerFacingInvoiceStatus({
    status: invoice.status,
    dueDate: invoice.due_date,
    amountDueCents: invoice.amount_due_cents ?? 0,
  });
  const canDownload = hasCustomerPermission(
    ctx.customerRole,
    "portal.invoices.download",
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link
          href="/portal/facturen"
          className="text-small text-primary underline-offset-2 hover:underline"
        >
          ← Facturen
        </Link>
        <h1 className="text-h1 mt-2">{invoice.title || invoice.invoice_number}</h1>
        <p className="text-muted text-small mt-1">
          {invoice.invoice_number} ·{" "}
          {labelNl(INVOICE_TYPE_NL, invoice.invoice_type ?? "INVOICE")} ·{" "}
          {labelNl(INVOICE_STATUS_NL, status)}
        </p>
      </div>

      <div className="rounded-xl border border-border p-5 space-y-2 text-small">
        <p>
          Totaal:{" "}
          <strong>{formatEuro(invoice.total_cents, invoice.currency)}</strong>
        </p>
        <p>
          Geregistreerd betaald:{" "}
          {formatEuro(invoice.amount_paid_cents ?? 0, invoice.currency)}
        </p>
        <p>
          Openstaand:{" "}
          <strong>
            {formatEuro(invoice.amount_due_cents ?? 0, invoice.currency)}
          </strong>
        </p>
        <p>
          Uitgifte:{" "}
          {invoice.issue_date
            ? new Date(invoice.issue_date).toLocaleDateString("nl-NL")
            : "—"}
        </p>
        <p>
          Verval:{" "}
          {invoice.due_date
            ? new Date(invoice.due_date).toLocaleDateString("nl-NL")
            : "—"}
        </p>
        {invoice.paid_at ? (
          <p>
            Betaaldatum: {new Date(invoice.paid_at).toLocaleDateString("nl-NL")}
          </p>
        ) : null}
      </div>

      {(invoice.amount_due_cents ?? 0) > 0 ? (
        <p className="text-small text-muted rounded-lg border border-border p-4">
          Deze omgeving biedt momenteel alleen factuurinzage. Online betalen is
          niet actief.
        </p>
      ) : null}

      <div>
        <h2 className="text-h3 mb-3">Regels</h2>
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-border p-3 text-small flex justify-between gap-3"
            >
              <span>
                {item.title}
                <span className="text-muted">
                  {" "}
                  · {item.quantity} {item.unit_label}
                </span>
              </span>
              <span>{formatEuro(item.total_cents, invoice.currency)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 text-small text-right space-y-1">
          <p>Subtotaal: {formatEuro(invoice.subtotal_cents, invoice.currency)}</p>
          <p>BTW: {formatEuro(invoice.vat_cents, invoice.currency)}</p>
          <p className="font-medium">
            Totaal: {formatEuro(invoice.total_cents, invoice.currency)}
          </p>
        </div>
      </div>

      {invoice.payment_instruction ? (
        <div className="rounded-xl border border-border p-5 text-small whitespace-pre-wrap">
          <h2 className="text-h3 mb-2">Betaalinstructie</h2>
          {invoice.payment_instruction}
        </div>
      ) : null}

      {creditNotes.length > 0 ? (
        <div>
          <h2 className="text-h3 mb-3">Creditnota&apos;s</h2>
          <ul className="space-y-2 text-small">
            {creditNotes.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/portal/facturen/${c.id}`}
                  className="text-primary underline-offset-2 hover:underline"
                >
                  {c.invoice_number}
                </Link>{" "}
                · {formatEuro(c.total_cents, c.currency)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {canDownload && invoice.document_id ? (
        <p className="text-small text-muted">
          Documentdownload via Documenten wanneer beschikbaar (private signed
          URL).
        </p>
      ) : (
        <p className="text-small text-muted">
          Printbare weergave via browser. PDF-engine volgt later.
        </p>
      )}
    </div>
  );
}
