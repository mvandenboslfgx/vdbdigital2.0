import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/portal/empty-state";
import { formatEuro, listPortalInvoices } from "@/server/repositories/portal";
import {
  INVOICE_STATUS_KEYS,
  INVOICE_TYPE_KEYS,
  labelFor,
} from "@/lib/portal/labels";
import { getDictionary } from "@/i18n/get-dictionary";
import { formatDate } from "@/i18n/format-date";
import { withLocale } from "@/i18n/config";
import { customerFacingInvoiceStatus } from "@/lib/commerce/invoice-status";

export const metadata: Metadata = {
  title: "Facturen",
  robots: { index: false },
};

export default async function PortalInvoicesPage() {
  const { t, locale } = await getDictionary();
  const { invoices, denied } = await listPortalInvoices();

  return (
    <div className="space-y-6">
      <h1 className="text-h1">{t("portal.invoicesPage.title")}</h1>
      <p className="text-muted text-small">
        {t("portal.invoicesPage.viewOnlyNote")}
      </p>
      {denied ? (
        <EmptyState
          title={t("portal.invoicesPage.accessDeniedTitle")}
          description={t("portal.invoicesPage.accessDeniedBody")}
        />
      ) : invoices.length === 0 ? (
        <EmptyState
          title={t("portal.invoicesPage.emptyTitle")}
          description={t("portal.invoicesPage.emptyBody")}
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
                  href={withLocale(`/portal/facturen/${inv.id}`, locale)}
                  className="rounded-xl border border-border bg-surface p-5 flex flex-wrap justify-between gap-3 block hover:border-primary/40"
                >
                  <div>
                    <p className="font-medium">{inv.invoice_number}</p>
                    <p className="text-small text-muted">
                      {labelFor(
                        t,
                        INVOICE_TYPE_KEYS,
                        inv.invoice_type ?? "INVOICE",
                      )}
                      {inv.title ? ` · ${inv.title}` : ""}
                    </p>
                    <p className="text-small text-muted">
                      {formatDate(inv.issue_date, locale)}
                      {inv.due_date
                        ? t("portal.invoicesPage.dueSuffix", {
                            date: formatDate(inv.due_date, locale),
                          })
                        : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatEuro(inv.total_cents, inv.currency)}
                    </p>
                    <p className="text-small text-muted">
                      {t("portal.invoicesPage.outstanding")}{" "}
                      {formatEuro(inv.amount_due_cents ?? 0, inv.currency)}
                    </p>
                    <p className="text-small text-muted">
                      {labelFor(t, INVOICE_STATUS_KEYS, status)}
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
