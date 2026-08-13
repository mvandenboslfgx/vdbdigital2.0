import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/portal/empty-state";
import { listAdminQuotes } from "@/server/repositories/admin-quotes";
import { formatEuro } from "@/server/repositories/portal";
import {
  QUOTE_STATUS_KEYS,
  labelFor,
  labelOptions,
} from "@/lib/portal/labels";
import { getDictionary } from "@/i18n/get-dictionary";
import { formatDate } from "@/i18n/format-date";
import { withLocale } from "@/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t("admin.page.quotes.title"), robots: { index: false } };
}

export default async function AdminQuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const { t, locale } = await getDictionary();
  const sp = await searchParams;
  const { quotes, total, error } = await listAdminQuotes({
    q: sp.q,
    status: sp.status,
    page: Number(sp.page || "1") || 1,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-h1">{t("admin.page.quotes.title")}</h1>
          <p className="text-muted text-small mt-1">
            {t(
              total === 1 ? "admin.page.quotes.countOne" : "admin.page.quotes.countOther",
              { count: total },
            )}
          </p>
        </div>
        <Link
          href={withLocale("/admin/quotes/new", locale)}
          className="rounded-lg bg-primary text-white px-4 py-2 text-sm min-h-11 inline-flex items-center"
        >
          {t("admin.page.quotes.newQuote")}
        </Link>
      </div>

      <form className="flex flex-wrap gap-3">
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder={t("admin.page.quotes.searchPlaceholder")}
          aria-label={t("admin.common.search")}
          className="min-h-11 px-3 rounded-lg border border-border bg-background text-sm"
        />
        <select
          name="status"
          defaultValue={sp.status ?? "ALL"}
          aria-label={t("admin.common.colStatus")}
          className="min-h-11 px-3 rounded-lg border border-border bg-background text-sm"
        >
          <option value="ALL">{t("admin.common.allStatuses")}</option>
          {labelOptions(t, QUOTE_STATUS_KEYS).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button type="submit" className="min-h-11 px-4 rounded-lg border border-border text-sm">
          {t("admin.common.filter")}
        </button>
      </form>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {quotes.length === 0 ? (
        <EmptyState
          title={t("admin.page.quotes.emptyTitle")}
          description={t("admin.page.quotes.emptyDescription")}
          actionHref={withLocale("/admin/quotes/new", locale)}
          actionLabel={t("admin.page.quotes.emptyAction")}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-surface-elevated text-muted text-left">
              <tr>
                <th className="px-3 py-3 font-medium">{t("admin.common.colNumber")}</th>
                <th className="px-3 py-3 font-medium">{t("admin.common.colTitle")}</th>
                <th className="px-3 py-3 font-medium">
                  {t("admin.common.colOrganization")}
                </th>
                <th className="px-3 py-3 font-medium">{t("admin.common.colStatus")}</th>
                <th className="px-3 py-3 font-medium">{t("admin.common.colTotal")}</th>
                <th className="px-3 py-3 font-medium">
                  {t("admin.common.colValidUntil")}
                </th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => {
                const org = q.organization as
                  | { legal_name?: string; trade_name?: string }
                  | null
                  | undefined;
                return (
                  <tr key={q.id} className="border-t border-border">
                    <td className="px-3 py-3">
                      <Link
                        href={withLocale(`/admin/quotes/${q.id}`, locale)}
                        className="text-primary hover:underline"
                      >
                        {q.quote_number}
                      </Link>
                    </td>
                    <td className="px-3 py-3">{q.title}</td>
                    <td className="px-3 py-3">
                      {org?.trade_name || org?.legal_name || t("admin.common.empty")}
                    </td>
                    <td className="px-3 py-3">
                      {labelFor(t, QUOTE_STATUS_KEYS, q.status)}
                    </td>
                    <td className="px-3 py-3">
                      {formatEuro(q.total_cents, q.currency)}
                    </td>
                    <td className="px-3 py-3">{formatDate(q.valid_until, locale)}</td>
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
