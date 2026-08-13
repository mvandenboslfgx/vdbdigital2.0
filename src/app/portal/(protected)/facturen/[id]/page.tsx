import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatEuro, getPortalInvoice } from "@/server/repositories/portal";
import {
  INVOICE_STATUS_KEYS,
  INVOICE_TYPE_KEYS,
  labelFor,
} from "@/lib/portal/labels";
import { getDictionary } from "@/i18n/get-dictionary";
import { formatDate } from "@/i18n/format-date";
import { withLocale } from "@/i18n/config";
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
  const { t, locale } = await getDictionary();
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
          href={withLocale("/portal/facturen", locale)}
          className="text-small text-primary underline-offset-2 hover:underline"
        >
          {t("portal.invoicesPage.backToInvoices")}
        </Link>
        <h1 className="text-h1 mt-2">{invoice.title || invoice.invoice_number}</h1>
        <p className="text-muted text-small mt-1">
          {invoice.invoice_number} ·{" "}
          {labelFor(t, INVOICE_TYPE_KEYS, invoice.invoice_type ?? "INVOICE")} ·{" "}
          {labelFor(t, INVOICE_STATUS_KEYS, status)}
        </p>
      </div>

      <div className="rounded-xl border border-border p-5 space-y-2 text-small">
        <p>
          {t("portal.invoicesPage.totalLabel")}:{" "}
          <strong>{formatEuro(invoice.total_cents, invoice.currency)}</strong>
        </p>
        <p>
          {t("portal.invoicesPage.paidRegistered")}:{" "}
          {formatEuro(invoice.amount_paid_cents ?? 0, invoice.currency)}
        </p>
        <p>
          {t("portal.invoicesPage.outstanding")}:{" "}
          <strong>
            {formatEuro(invoice.amount_due_cents ?? 0, invoice.currency)}
          </strong>
        </p>
        <p>
          {t("portal.invoicesPage.issuedLabel")}:{" "}
          {formatDate(invoice.issue_date, locale)}
        </p>
        <p>
          {t("portal.invoicesPage.dueLabel")}:{" "}
          {formatDate(invoice.due_date, locale)}
        </p>
        {invoice.paid_at ? (
          <p>
            {t("portal.invoicesPage.paidAtLabel")}:{" "}
            {formatDate(invoice.paid_at, locale)}
          </p>
        ) : null}
      </div>

      {(invoice.amount_due_cents ?? 0) > 0 ? (
        <p className="text-small text-muted rounded-lg border border-border p-4">
          {t("portal.invoicesPage.viewOnlyNotice")}
        </p>
      ) : null}

      <div>
        <h2 className="text-h3 mb-3">{t("portal.invoicesPage.linesTitle")}</h2>
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
          <p>
            {t("portal.invoicesPage.subtotalLabel")}:{" "}
            {formatEuro(invoice.subtotal_cents, invoice.currency)}
          </p>
          <p>
            {t("portal.invoicesPage.vatLabel")}:{" "}
            {formatEuro(invoice.vat_cents, invoice.currency)}
          </p>
          <p className="font-medium">
            {t("portal.invoicesPage.totalLabel")}:{" "}
            {formatEuro(invoice.total_cents, invoice.currency)}
          </p>
        </div>
      </div>

      {invoice.payment_instruction ? (
        <div className="rounded-xl border border-border p-5 text-small whitespace-pre-wrap">
          <h2 className="text-h3 mb-2">
            {t("portal.invoicesPage.paymentInstructionTitle")}
          </h2>
          {invoice.payment_instruction}
        </div>
      ) : null}

      {creditNotes.length > 0 ? (
        <div>
          <h2 className="text-h3 mb-3">
            {t("portal.invoicesPage.creditNotesTitle")}
          </h2>
          <ul className="space-y-2 text-small">
            {creditNotes.map((c) => (
              <li key={c.id}>
                <Link
                  href={withLocale(`/portal/facturen/${c.id}`, locale)}
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
          {t("portal.invoicesPage.downloadNote")}
        </p>
      ) : (
        <p className="text-small text-muted">
          {t("portal.invoicesPage.printNote")}
        </p>
      )}
    </div>
  );
}
