import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/portal/empty-state";
import { listAdminDocuments } from "@/server/repositories/admin-documents";
import { formatBytes } from "@/lib/validation/documents";
import {
  DOCUMENT_CATEGORY_KEYS,
  DOCUMENT_STATUS_KEYS,
  DOCUMENT_VISIBILITY_KEYS,
  labelFor,
  labelOptions,
} from "@/lib/portal/labels";
import { getDictionary } from "@/i18n/get-dictionary";
import { withLocale } from "@/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t("admin.page.documents.title"), robots: { index: false } };
}

export default async function AdminDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    visibility?: string;
    category?: string;
    page?: string;
  }>;
}) {
  const { t, locale } = await getDictionary();
  const sp = await searchParams;
  const page = Number(sp.page || "1") || 1;
  const { documents, total, pageSize, error } = await listAdminDocuments({
    q: sp.q,
    status: sp.status,
    visibility: sp.visibility,
    category: sp.category,
    page,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-h1">{t("admin.page.documents.title")}</h1>
          <p className="text-muted text-small mt-1">
            {t(
              total === 1
                ? "admin.page.documents.countOne"
                : "admin.page.documents.countOther",
              { count: total },
            )}
          </p>
        </div>
        <Link
          href={withLocale("/admin/documents/new", locale)}
          className="rounded-lg bg-primary text-white px-4 py-2 text-sm min-h-11 inline-flex items-center"
        >
          {t("admin.page.documents.upload")}
        </Link>
      </div>

      <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder={t("admin.page.documents.searchPlaceholder")}
          aria-label={t("admin.common.search")}
          className="min-h-11 px-3 rounded-lg border border-border bg-background text-sm lg:col-span-2"
        />
        <select
          name="status"
          defaultValue={sp.status ?? "ALL"}
          aria-label={t("admin.common.colStatus")}
          className="min-h-11 px-3 rounded-lg border border-border bg-background text-sm"
        >
          <option value="ALL">{t("admin.common.allStatuses")}</option>
          {labelOptions(t, DOCUMENT_STATUS_KEYS).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          name="visibility"
          defaultValue={sp.visibility ?? "ALL"}
          aria-label={t("admin.common.colVisibility")}
          className="min-h-11 px-3 rounded-lg border border-border bg-background text-sm"
        >
          <option value="ALL">{t("admin.common.allVisibility")}</option>
          {labelOptions(t, DOCUMENT_VISIBILITY_KEYS).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="min-h-11 rounded-lg border border-border px-4 text-sm"
        >
          {t("admin.common.filter")}
        </button>
      </form>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {t("admin.page.documents.loadFailed", { error })}
        </p>
      ) : null}

      {documents.length === 0 ? (
        <EmptyState
          title={t("admin.page.documents.emptyTitle")}
          description={t("admin.page.documents.emptyDescription")}
          actionHref={withLocale("/admin/documents/new", locale)}
          actionLabel={t("admin.page.documents.emptyAction")}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-surface-elevated text-left text-muted">
              <tr>
                <th className="px-3 py-3 font-medium">{t("admin.common.colNumber")}</th>
                <th className="px-3 py-3 font-medium">{t("admin.common.colTitle")}</th>
                <th className="px-3 py-3 font-medium">
                  {t("admin.common.colOrganization")}
                </th>
                <th className="px-3 py-3 font-medium">{t("admin.common.colCategory")}</th>
                <th className="px-3 py-3 font-medium">{t("admin.common.colStatus")}</th>
                <th className="px-3 py-3 font-medium">
                  {t("admin.common.colVisibility")}
                </th>
                <th className="px-3 py-3 font-medium">{t("admin.common.colSize")}</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.id} className="border-t border-border">
                  <td className="px-3 py-3 whitespace-nowrap">
                    <Link
                      href={withLocale(`/admin/documents/${d.id}`, locale)}
                      className="text-primary hover:underline"
                    >
                      {d.document_number}
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={withLocale(`/admin/documents/${d.id}`, locale)}
                      className="font-medium hover:underline"
                    >
                      {d.title}
                    </Link>
                    <p className="text-muted text-xs truncate max-w-[14rem]">
                      {d.file_name}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    {d.organization?.trade_name ||
                      d.organization?.legal_name ||
                      t("admin.common.empty")}
                  </td>
                  <td className="px-3 py-3">
                    {labelFor(t, DOCUMENT_CATEGORY_KEYS, d.category)}
                  </td>
                  <td className="px-3 py-3">
                    {labelFor(t, DOCUMENT_STATUS_KEYS, d.status)}
                  </td>
                  <td className="px-3 py-3">
                    {labelFor(t, DOCUMENT_VISIBILITY_KEYS, d.visibility)}
                  </td>
                  <td className="px-3 py-3">{formatBytes(d.size_bytes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > pageSize ? (
        <p className="text-small text-muted">
          {t("admin.common.pageSizeNote", { page, pageSize })}
        </p>
      ) : null}
    </div>
  );
}
