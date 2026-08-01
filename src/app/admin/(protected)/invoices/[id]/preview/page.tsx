import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAdminInvoice } from "@/server/repositories/admin-invoices";
import { formatEuro } from "@/server/repositories/portal";
import {
  INVOICE_STATUS_KEYS,
  INVOICE_TYPE_KEYS,
  labelFor,
} from "@/lib/portal/labels";
import { getDictionary } from "@/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return {
    title: t("admin.page.invoices.previewTitle"),
    robots: { index: false },
  };
}

export default async function AdminInvoicePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t } = await getDictionary();
  const { id } = await params;
  const bundle = await getAdminInvoice(id);
  if (!bundle) notFound();
  const { invoice, items } = bundle;
  const org = invoice.organization as
    | { trade_name?: string; legal_name?: string }
    | null
    | undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-6 print:max-w-none">
      <div className="print:hidden">
        <h1 className="text-h1">{t("admin.common.preview")}</h1>
        <p className="text-small text-muted mt-1">
          {t("admin.page.invoices.previewHint")}
        </p>
      </div>
      <article className="rounded-xl border border-border p-8 space-y-6 bg-background">
        <header>
          <p className="text-small text-muted">
            {labelFor(t, INVOICE_TYPE_KEYS, invoice.invoice_type)} ·{" "}
            {invoice.invoice_number}
          </p>
          <h2 className="text-h2 mt-1">
            {invoice.title || t("admin.page.invoices.detailTitle")}
          </h2>
          <p className="text-small mt-2">
            {org?.trade_name || org?.legal_name || t("admin.common.empty")} ·{" "}
            {labelFor(t, INVOICE_STATUS_KEYS, invoice.status)}
          </p>
        </header>
        <p className="text-small text-muted whitespace-pre-wrap">
          {invoice.description}
        </p>
        <table className="w-full text-small">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-2">
                {t("admin.page.invoices.colDescription")}
              </th>
              <th className="py-2">{t("admin.page.invoices.colQuantity")}</th>
              <th className="py-2 text-right">
                {t("admin.page.invoices.colTotal")}
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-border/50">
                <td className="py-2 pr-3">{item.title}</td>
                <td className="py-2 pr-3">
                  {item.quantity} {item.unit_label}
                </td>
                <td className="py-2 text-right">
                  {formatEuro(item.total_cents, invoice.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="text-small space-y-1 text-right">
          <p>
            {t("admin.page.quotes.subtotal")}:{" "}
            {formatEuro(invoice.subtotal_cents, invoice.currency)}
          </p>
          <p>
            {t("admin.page.quotes.vat")}:{" "}
            {formatEuro(invoice.vat_cents, invoice.currency)}
          </p>
          <p className="text-h3">
            {t("admin.page.invoices.total")}:{" "}
            {formatEuro(invoice.total_cents, invoice.currency)}
          </p>
          <p>
            {t("admin.page.invoices.outstanding")}:{" "}
            {formatEuro(invoice.amount_due_cents ?? 0, invoice.currency)}
          </p>
        </div>
        {invoice.payment_instruction ? (
          <p className="text-small border-t border-border pt-4 whitespace-pre-wrap">
            {invoice.payment_instruction}
          </p>
        ) : null}
        <p className="text-small text-muted">
          {t("admin.page.invoices.previewFooter")}
        </p>
      </article>
    </div>
  );
}
