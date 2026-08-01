import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/container";
import { getAdminInvoice } from "@/server/repositories/admin-invoices";
import { formatEuro } from "@/server/repositories/portal";
import {
  INVOICE_STATUS_KEYS,
  INVOICE_TYPE_KEYS,
  labelFor,
} from "@/lib/portal/labels";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasPermission } from "@/lib/auth/permissions";
import { requireAdmin } from "@/server/auth/require-admin";
import {
  createCreditNoteAction,
  issueInvoiceAction,
  markInvoiceReadyAction,
  recordInvoicePaymentAction,
} from "@/server/actions/invoice-actions";
import { customerFacingInvoiceStatus } from "@/lib/commerce/invoice-status";
import { ReversePaymentControls } from "@/components/admin/reverse-payment-controls";

export const metadata: Metadata = { title: "Factuur", robots: { index: false } };

export default async function AdminInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t } = await getDictionary();
  const { id } = await params;
  const ctx = await requireAdmin();
  const bundle = await getAdminInvoice(id);
  if (!bundle) notFound();

  const { invoice, items, versions, payments, creditNotes } = bundle;
  const org = invoice.organization as
    | { trade_name?: string; legal_name?: string }
    | null
    | undefined;
  const status = customerFacingInvoiceStatus({
    status: invoice.status,
    dueDate: invoice.due_date,
    amountDueCents: invoice.amount_due_cents ?? 0,
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <p className="text-small text-muted">{invoice.invoice_number}</p>
          <h1 className="text-h1">{invoice.title || "Factuur"}</h1>
          <p className="text-muted text-small mt-1">
            {labelFor(t, INVOICE_TYPE_KEYS, invoice.invoice_type)} ·{" "}
            {labelFor(t, INVOICE_STATUS_KEYS, status)} ·{" "}
            {org?.trade_name || org?.legal_name || "—"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/invoices/${invoice.id}/preview`}
            className="rounded-lg border border-border px-4 py-2 text-sm min-h-11 inline-flex items-center"
          >
            Preview
          </Link>
          <Link
            href={`/admin/invoices/${invoice.id}/versions`}
            className="rounded-lg border border-border px-4 py-2 text-sm min-h-11 inline-flex items-center"
          >
            Versies
          </Link>
          {["DRAFT", "IN_REVIEW", "READY"].includes(invoice.status) ? (
            <Link
              href={`/admin/invoices/${invoice.id}/edit`}
              className="rounded-lg border border-border px-4 py-2 text-sm min-h-11 inline-flex items-center"
            >
              Bewerken
            </Link>
          ) : null}
        </div>
      </div>

      <Card className="p-5 space-y-2 text-small">
        <p>
          Totaal:{" "}
          <strong>{formatEuro(invoice.total_cents, invoice.currency)}</strong>
        </p>
        <p>
          Betaald: {formatEuro(invoice.amount_paid_cents ?? 0, invoice.currency)}
        </p>
        <p>
          Openstaand:{" "}
          <strong>
            {formatEuro(invoice.amount_due_cents ?? 0, invoice.currency)}
          </strong>
        </p>
        <p>Uitgifte: {invoice.issue_date?.slice(0, 10) || "—"}</p>
        <p>Verval: {invoice.due_date?.slice(0, 10) || "—"}</p>
        {invoice.quote ? (
          <p>
            Offerte:{" "}
            <Link
              href={`/admin/quotes/${(invoice.quote as { id: string }).id}`}
              className="text-primary underline-offset-2 hover:underline"
            >
              {(invoice.quote as { quote_number?: string }).quote_number}
            </Link>
          </p>
        ) : null}
      </Card>

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
      </div>

      {payments.length > 0 ? (
        <div>
          <h2 className="text-h3 mb-3">Geregistreerde betalingen</h2>
          <ul className="space-y-2 text-small">
            {payments.map((p) => {
              const reversed = Boolean(p.reversed_at);
              return (
                <li key={p.id} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p>
                        {formatEuro(p.amount_cents, p.currency)} ·{" "}
                        {p.payment_method} · {p.payment_date}
                        {reversed ? (
                          <span className="ml-2 rounded-md border border-border px-1.5 py-0.5 text-xs text-muted">
                            Teruggedraaid
                          </span>
                        ) : (
                          <span className="ml-2 rounded-md border border-border px-1.5 py-0.5 text-xs text-muted">
                            Actief
                          </span>
                        )}
                      </p>
                      {reversed && p.reversed_at ? (
                        <p className="text-muted mt-1 text-xs">
                          Administratief teruggedraaid op{" "}
                          {new Date(p.reversed_at).toLocaleString("nl-NL")}
                          {p.reversal_reason
                            ? ` · interne reden vastgelegd`
                            : ""}
                        </p>
                      ) : null}
                    </div>
                    {!reversed &&
                    hasPermission(ctx.role, "invoices.reverse_payment") ? (
                      <ReversePaymentControls
                        invoiceId={invoice.id}
                        invoiceNumber={invoice.invoice_number}
                        expectedVersion={invoice.version}
                        paymentRecordId={p.id}
                        amountLabel={formatEuro(p.amount_cents, p.currency)}
                        paymentDate={p.payment_date}
                        currency={p.currency}
                      />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {creditNotes.length > 0 ? (
        <div>
          <h2 className="text-h3 mb-3">Creditnota&apos;s</h2>
          <ul className="space-y-2 text-small">
            {creditNotes.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/admin/invoices/${c.id}`}
                  className="text-primary underline-offset-2 hover:underline"
                >
                  {c.invoice_number}
                </Link>{" "}
                · {labelFor(t, INVOICE_STATUS_KEYS, c.status)} ·{" "}
                {formatEuro(c.total_cents, c.currency)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3 border-t border-border pt-4">
        {hasPermission(ctx.role, "invoices.review") &&
        ["DRAFT", "IN_REVIEW"].includes(invoice.status) ? (
          <form action={markInvoiceReadyAction}>
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <input type="hidden" name="expectedVersion" value={invoice.version} />
            <Button type="submit">Markeer als gereed</Button>
          </form>
        ) : null}
        {hasPermission(ctx.role, "invoices.issue") &&
        invoice.status === "READY" ? (
          <form action={issueInvoiceAction}>
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <input type="hidden" name="expectedVersion" value={invoice.version} />
            <Button type="submit">Uitgeven</Button>
          </form>
        ) : null}
        {hasPermission(ctx.role, "invoices.create_credit_note") &&
        ["ISSUED", "OPEN", "PARTIALLY_PAID", "PAID", "OVERDUE"].includes(
          invoice.status,
        ) &&
        invoice.invoice_type !== "CREDIT_NOTE" ? (
          <form action={createCreditNoteAction}>
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <Button type="submit" variant="outline">
              Creditnota starten
            </Button>
          </form>
        ) : null}
      </div>

      {hasPermission(ctx.role, "invoices.record_payment") &&
      ["OPEN", "PARTIALLY_PAID", "OVERDUE", "ISSUED"].includes(invoice.status) ? (
        <Card className="p-5 space-y-3">
          <h2 className="text-h3">Betaling registreren</h2>
          <p className="text-small text-muted">
            Handmatige registratie — geen providerbetaling of Mollie-call.
          </p>
          <form action={recordInvoicePaymentAction} className="flex flex-wrap gap-3 items-end">
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <input type="hidden" name="expectedVersion" value={invoice.version} />
            <div>
              <label className="block text-small mb-1" htmlFor="amountEuros">
                Bedrag (EUR)
              </label>
              <input
                id="amountEuros"
                name="amountEuros"
                required
                className="min-h-11 px-3 rounded-lg border border-border text-sm"
              />
            </div>
            <div>
              <label className="block text-small mb-1" htmlFor="paymentDate">
                Datum
              </label>
              <input
                id="paymentDate"
                name="paymentDate"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="min-h-11 px-3 rounded-lg border border-border text-sm"
              />
            </div>
            <div>
              <label className="block text-small mb-1" htmlFor="paymentMethod">
                Methode
              </label>
              <select
                id="paymentMethod"
                name="paymentMethod"
                className="min-h-11 px-3 rounded-lg border border-border text-sm"
                defaultValue="BANK_TRANSFER"
              >
                <option value="BANK_TRANSFER">Bankoverschrijving</option>
                <option value="CASH">Contant</option>
                <option value="CARD_EXTERNAL">Externe kaart</option>
                <option value="ACCOUNTING_IMPORT">Boekhoudimport</option>
                <option value="OTHER">Overig</option>
              </select>
            </div>
            <input
              name="externalReference"
              placeholder="Externe referentie"
              className="min-h-11 px-3 rounded-lg border border-border text-sm"
            />
            <Button type="submit">Registreren</Button>
          </form>
        </Card>
      ) : null}

      <p className="text-small text-muted">
        Snapshots: {versions.length}. Print-HTML preview; geen nep-PDF. Online
        betalen is niet actief.
      </p>
    </div>
  );
}
