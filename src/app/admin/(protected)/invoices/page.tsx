import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/portal/empty-state";
import { listAdminInvoices } from "@/server/repositories/admin-invoices";
import { formatEuro } from "@/server/repositories/portal";
import {
  INVOICE_STATUS_KEYS,
  INVOICE_TYPE_KEYS,
  labelFor,
  labelOptions,
} from "@/lib/portal/labels";
import { getDictionary } from "@/i18n/get-dictionary";
import { withLocale } from "@/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t("admin.page.invoices.title"), robots: { index: false } };
}

export default async function AdminInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const { t, locale } = await getDictionary();
  const sp = await searchParams;
  const { invoices, total, error } = await listAdminInvoices({
    q: sp.q,
    status: sp.status,
    page: Number(sp.page || "1") || 1,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-h1">{t("admin.page.invoices.title")}</h1>
          <p className="text-muted text-small mt-1">
            {t(
              total === 1
                ? "admin.page.invoices.countOne"
                : "admin.page.invoices.countOther",
              { count: total },
            )}
          </p>
        </div>
        <Link
          href={withLocale("/admin/invoices/new", locale)}
          className="rounded-lg bg-primary text-white px-4 py-2 text-sm min-h-11 inline-flex items-center"
        >
          {t("admin.page.invoices.newInvoice")}
        </Link>
      </div>

      <form className="flex flex-wrap gap-3">
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder={t("admin.page.invoices.searchPlaceholder")}
          aria-label={t("admin.common.search")}
          className="min-h-11 px-3 rounded-lg border border-border text-sm"
        />
        <select
          name="status"
          defaultValue={sp.status ?? "ALL"}
          aria-label={t("admin.common.colStatus")}
          className="min-h-11 px-3 rounded-lg border border-border text-sm"
        >
          <option value="ALL">{t("admin.common.allStatuses")}</option>
          {labelOptions(t, INVOICE_STATUS_KEYS).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="min-h-11 px-4 rounded-lg border border-border text-sm"
        >
          {t("admin.common.filter")}
        </button>
      </form>

      {error ? <p className="text-small text-error">{error}</p> : null}

      {invoices.length === 0 ? (
        <EmptyState
          title={t("admin.page.invoices.emptyTitle")}
          description={t("admin.page.invoices.emptyDescription")}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-small text-left">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="py-2 pr-3">{t("admin.common.colNumber")}</th>
                <th className="py-2 pr-3">{t("admin.common.colOrganization")}</th>
                <th className="py-2 pr-3">{t("admin.common.colType")}</th>
                <th className="py-2 pr-3">{t("admin.common.colStatus")}</th>
                <th className="py-2 pr-3">{t("admin.common.colTotal")}</th>
                <th className="py-2 pr-3">{t("admin.common.colOutstanding")}</th>
                <th className="py-2 pr-3">{t("admin.common.colDue")}</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const org = inv.organization as
                  | { trade_name?: string; legal_name?: string }
                  | null
                  | undefined;
                return (
                  <tr key={inv.id} className="border-b border-border/60">
                    <td className="py-3 pr-3">
                      <Link
                        href={withLocale(`/admin/invoices/${inv.id}`, locale)}
                        className="text-primary underline-offset-2 hover:underline"
                      >
                        {inv.invoice_number}
                      </Link>
                      {inv.title ? (
                        <div className="text-muted">{inv.title}</div>
                      ) : null}
                    </td>
                    <td className="py-3 pr-3">
                      {org?.trade_name || org?.legal_name || t("admin.common.empty")}
                    </td>
                    <td className="py-3 pr-3">
                      {labelFor(
                        t,
                        INVOICE_TYPE_KEYS,
                        inv.invoice_type ?? "INVOICE",
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      {labelFor(t, INVOICE_STATUS_KEYS, inv.status)}
                    </td>
                    <td className="py-3 pr-3">
                      {formatEuro(inv.total_cents, inv.currency)}
                    </td>
                    <td className="py-3 pr-3">
                      {formatEuro(
                        (inv as { amount_due_cents?: number }).amount_due_cents ??
                          0,
                        inv.currency,
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      {(inv as { due_date?: string | null }).due_date?.slice(0, 10) ||
                        t("admin.common.empty")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
