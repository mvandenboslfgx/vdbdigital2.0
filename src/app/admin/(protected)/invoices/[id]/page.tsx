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
  PAYMENT_METHOD_KEYS,
  labelFor,
  labelOptions,
} from "@/lib/portal/labels";
import { getDictionary } from "@/i18n/get-dictionary";
import { formatDate, formatDateTime } from "@/i18n/format-date";
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
import { buildPaymentReversalLabels } from "@/lib/admin/payment-reversal-labels";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return {
    title: t("admin.page.invoices.detailTitle"),
    robots: { index: false },
  };
}

export default async function AdminInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t, locale } = await getDictionary();
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
          <h1 className="text-h1">
            {invoice.title || t("admin.page.invoices.detailTitle")}
          </h1>
          <p className="text-muted text-small mt-1">
            {labelFor(t, INVOICE_TYPE_KEYS, invoice.invoice_type)} ·{" "}
            {labelFor(t, INVOICE_STATUS_KEYS, status)} ·{" "}
            {org?.trade_name || org?.legal_name || t("admin.common.empty")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/invoices/${invoice.id}/preview`}
            className="rounded-lg border border-border px-4 py-2 text-sm min-h-11 inline-flex items-center"
          >
            {t("admin.common.preview")}
          </Link>
          <Link
            href={`/admin/invoices/${invoice.id}/versions`}
            className="rounded-lg border border-border px-4 py-2 text-sm min-h-11 inline-flex items-center"
          >
            {t("admin.page.invoices.versionsHeading")}
          </Link>
          {["DRAFT", "IN_REVIEW", "READY"].includes(invoice.status) ? (
            <Link
              href={`/admin/invoices/${invoice.id}/edit`}
              className="rounded-lg border border-border px-4 py-2 text-sm min-h-11 inline-flex items-center"
            >
              {t("admin.common.edit")}
            </Link>
          ) : null}
        </div>
      </div>

      <Card className="p-5 space-y-2 text-small">
        <p>
          {t("admin.page.invoices.total")}:{" "}
          <strong>{formatEuro(invoice.total_cents, invoice.currency)}</strong>
        </p>
        <p>
          {t("admin.page.invoices.paid")}:{" "}
          {formatEuro(invoice.amount_paid_cents ?? 0, invoice.currency)}
        </p>
        <p>
          {t("admin.page.invoices.outstanding")}:{" "}
          <strong>
            {formatEuro(invoice.amount_due_cents ?? 0, invoice.currency)}
          </strong>
        </p>
        <p>
          {t("admin.page.invoices.issueDate")}:{" "}
          {formatDate(invoice.issue_date, locale)}
        </p>
        <p>
          {t("admin.page.invoices.dueDate")}:{" "}
          {formatDate(invoice.due_date, locale)}
        </p>
        {invoice.quote ? (
          <p>
            {t("admin.page.invoices.quoteLink")}{" "}
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
        <h2 className="text-h3 mb-3">{t("admin.page.invoices.lines")}</h2>
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
          <h2 className="text-h3 mb-3">
            {t("admin.page.invoices.recordedPayments")}
          </h2>
          <ul className="space-y-2 text-small">
            {payments.map((p) => {
              const reversed = Boolean(p.reversed_at);
              return (
                <li key={p.id} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p>
                        {formatEuro(p.amount_cents, p.currency)} ·{" "}
                        {labelFor(t, PAYMENT_METHOD_KEYS, p.payment_method)} ·{" "}
                        {formatDate(p.payment_date, locale)}
                        <span className="ml-2 rounded-md border border-border px-1.5 py-0.5 text-xs text-muted">
                          {reversed
                            ? t("admin.page.invoices.paymentReversed")
                            : t("admin.page.invoices.paymentActive")}
                        </span>
                      </p>
                      {reversed && p.reversed_at ? (
                        <p className="text-muted mt-1 text-xs">
                          {t("admin.page.invoices.reversedOn", {
                            date: formatDateTime(p.reversed_at, locale),
                          })}
                          {p.reversal_reason
                            ? t("admin.page.invoices.reversalReasonRecorded")
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
                        labels={buildPaymentReversalLabels(t)}
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
          <h2 className="text-h3 mb-3">
            {t("admin.page.invoices.creditNotes")}
          </h2>
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
            <Button type="submit">
              {t("admin.page.invoices.markReady")}
            </Button>
          </form>
        ) : null}
        {hasPermission(ctx.role, "invoices.issue") &&
        invoice.status === "READY" ? (
          <form action={issueInvoiceAction}>
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <input type="hidden" name="expectedVersion" value={invoice.version} />
            <Button type="submit">{t("admin.page.invoices.issue")}</Button>
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
              {t("admin.page.invoices.startCreditNote")}
            </Button>
          </form>
        ) : null}
      </div>

      {hasPermission(ctx.role, "invoices.record_payment") &&
      ["OPEN", "PARTIALLY_PAID", "OVERDUE", "ISSUED"].includes(invoice.status) ? (
        <Card className="p-5 space-y-3">
          <h2 className="text-h3">
            {t("admin.page.invoices.recordPaymentHeading")}
          </h2>
          <p className="text-small text-muted">
            {t("admin.page.invoices.recordPaymentNote")}
          </p>
          <form action={recordInvoicePaymentAction} className="flex flex-wrap gap-3 items-end">
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <input type="hidden" name="expectedVersion" value={invoice.version} />
            <div>
              <label className="block text-small mb-1" htmlFor="amountEuros">
                {t("admin.page.invoices.amountEuros")}
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
                {t("admin.page.invoices.paymentDate")}
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
                {t("admin.page.invoices.paymentMethod")}
              </label>
              <select
                id="paymentMethod"
                name="paymentMethod"
                className="min-h-11 px-3 rounded-lg border border-border text-sm"
                defaultValue="BANK_TRANSFER"
              >
                {labelOptions(t, PAYMENT_METHOD_KEYS).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <input
              name="externalReference"
              placeholder={t("admin.page.invoices.externalReference")}
              className="min-h-11 px-3 rounded-lg border border-border text-sm"
            />
            <Button type="submit">
              {t("admin.page.invoices.recordSubmit")}
            </Button>
          </form>
        </Card>
      ) : null}

      <p className="text-small text-muted">
        {t("admin.page.invoices.snapshotNote", { count: versions.length })}
      </p>
    </div>
  );
}
