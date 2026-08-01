import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/portal/empty-state";
import { listAdminProjectsFiltered } from "@/server/repositories/admin-projects";
import {
  PROJECT_STATUS_KEYS,
  PROJECT_TYPE_KEYS,
  labelFor,
  labelOptions,
} from "@/lib/portal/labels";
import { getDictionary } from "@/i18n/get-dictionary";
import { formatDate } from "@/i18n/format-date";
import { withLocale } from "@/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t("admin.page.projects.title"), robots: { index: false } };
}

export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    type?: string;
    visibility?: string;
    page?: string;
  }>;
}) {
  const { t, locale } = await getDictionary();
  const sp = await searchParams;
  const page = Number(sp.page || "1") || 1;
  const { projects, total, pageSize, error } = await listAdminProjectsFiltered({
    q: sp.q,
    status: sp.status,
    projectType: sp.type,
    visibility: sp.visibility,
    page,
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-h1">{t("admin.page.projects.title")}</h1>
          <p className="text-muted text-small mt-1">
            {t(
              total === 1
                ? "admin.page.projects.countOne"
                : "admin.page.projects.countOther",
              { count: total },
            )}
          </p>
        </div>
        <Link
          href={withLocale("/admin/projects/new", locale)}
          className="rounded-lg bg-primary text-white px-4 py-2 text-sm min-h-11 inline-flex items-center"
        >
          {t("admin.page.projects.newProject")}
        </Link>
      </div>

      <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder={t("admin.page.projects.searchPlaceholder")}
          aria-label={t("admin.common.search")}
          className="min-h-11 px-3 rounded-lg border border-border bg-background text-sm lg:col-span-2"
        />
        <select
          name="status"
          defaultValue={sp.status ?? "ACTIVE"}
          aria-label={t("admin.common.colStatus")}
          className="min-h-11 px-3 rounded-lg border border-border bg-background text-sm"
        >
          <option value="ACTIVE">{t("admin.page.projects.statusActiveOnly")}</option>
          <option value="ALL">{t("admin.common.allStatuses")}</option>
          {labelOptions(t, PROJECT_STATUS_KEYS).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          name="type"
          defaultValue={sp.type ?? "ALL"}
          aria-label={t("admin.common.colType")}
          className="min-h-11 px-3 rounded-lg border border-border bg-background text-sm"
        >
          <option value="ALL">{t("admin.common.allTypes")}</option>
          {labelOptions(t, PROJECT_TYPE_KEYS).map((option) => (
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
          <option value="INTERNAL">{t("admin.common.internal")}</option>
          <option value="CUSTOMER_VISIBLE">{t("admin.common.customerVisible")}</option>
        </select>
        <button
          type="submit"
          className="min-h-11 rounded-lg border border-border px-4 text-sm hover:border-primary"
        >
          {t("admin.common.filter")}
        </button>
      </form>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {t("admin.page.projects.loadFailed", { error })}
        </p>
      ) : null}

      {projects.length === 0 ? (
        <EmptyState
          title={t("admin.page.projects.emptyTitle")}
          description={t("admin.page.projects.emptyDescription")}
          actionHref={withLocale("/admin/projects/new", locale)}
          actionLabel={t("admin.page.projects.emptyAction")}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-surface-elevated text-left text-muted">
              <tr>
                <th className="px-3 py-3 font-medium">{t("admin.common.colNumber")}</th>
                <th className="px-3 py-3 font-medium">{t("admin.common.colName")}</th>
                <th className="px-3 py-3 font-medium">
                  {t("admin.common.colOrganization")}
                </th>
                <th className="px-3 py-3 font-medium">{t("admin.common.colType")}</th>
                <th className="px-3 py-3 font-medium">{t("admin.common.colStatus")}</th>
                <th className="px-3 py-3 font-medium">{t("admin.common.colProgress")}</th>
                <th className="px-3 py-3 font-medium">{t("admin.common.colDelivery")}</th>
                <th className="px-3 py-3 font-medium">
                  {t("admin.common.colVisibility")}
                </th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-3 py-3 whitespace-nowrap">
                    <Link
                      href={withLocale(`/admin/projects/${p.id}/overview`, locale)}
                      className="text-primary hover:underline"
                    >
                      {p.project_number}
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={withLocale(`/admin/projects/${p.id}/overview`, locale)}
                      className="font-medium hover:underline"
                    >
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    {p.organization?.trade_name ||
                      p.organization?.legal_name ||
                      t("admin.common.empty")}
                  </td>
                  <td className="px-3 py-3">
                    {labelFor(t, PROJECT_TYPE_KEYS, p.project_type)}
                  </td>
                  <td className="px-3 py-3">
                    {labelFor(t, PROJECT_STATUS_KEYS, p.status)}
                  </td>
                  <td className="px-3 py-3">{p.progress_percent}%</td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {formatDate(p.planned_delivery_date, locale)}
                  </td>
                  <td className="px-3 py-3">
                    {p.visibility === "CUSTOMER_VISIBLE"
                      ? t("admin.common.customer")
                      : t("admin.common.internal")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex gap-2 text-small">
          {page > 1 ? (
            <Link
              href={`?page=${page - 1}&q=${sp.q ?? ""}&status=${sp.status ?? "ACTIVE"}`}
              className="text-primary hover:underline"
            >
              {t("admin.common.previous")}
            </Link>
          ) : null}
          <span className="text-muted">
            {t("admin.common.pageOf", { page, totalPages })}
          </span>
          {page < totalPages ? (
            <Link
              href={`?page=${page + 1}&q=${sp.q ?? ""}&status=${sp.status ?? "ACTIVE"}`}
              className="text-primary hover:underline"
            >
              {t("admin.common.next")}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
