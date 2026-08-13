import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/portal/empty-state";
import { listAdminOrganizations } from "@/server/repositories/admin-portal";
import { CreateCustomerForm } from "@/components/admin/create-customer-form";
import { getDictionary } from "@/i18n/get-dictionary";
import { withLocale } from "@/i18n/config";
import { buildCreateCustomerFormLabels } from "@/lib/admin/support-form-labels";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t("admin.page.customers.title"), robots: { index: false } };
}

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { t, locale } = await getDictionary();
  const params = await searchParams;
  const { organizations, total } = await listAdminOrganizations({
    q: params.q,
    status: params.status,
  });

  // Values are organization_status DB codes; only the labels are localized.
  const statusOptions = [
    { value: "ACTIVE", label: t("admin.page.customers.statusActive") },
    { value: "INVITED", label: t("admin.page.customers.statusInvited") },
    { value: "BLOCKED", label: t("admin.page.customers.statusBlocked") },
    { value: "ARCHIVED", label: t("admin.page.customers.statusArchived") },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-h1">{t("admin.page.customers.title")}</h1>
          <p className="text-muted text-small mt-1">
            {t(
              total === 1
                ? "admin.page.customers.countOne"
                : "admin.page.customers.countOther",
              { count: total },
            )}
          </p>
        </div>
      </div>

      <CreateCustomerForm labels={buildCreateCustomerFormLabels(t)} />

      <form className="flex flex-wrap gap-3" method="get">
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder={t("admin.page.customers.searchPlaceholder")}
          aria-label={t("admin.common.search")}
          className="min-h-11 px-3 rounded-lg border border-border bg-surface text-sm flex-1 min-w-[200px]"
        />
        <select
          name="status"
          defaultValue={params.status ?? "ALL"}
          aria-label={t("admin.common.colStatus")}
          className="min-h-11 px-3 rounded-lg border border-border bg-surface text-sm"
        >
          <option value="ALL">{t("admin.common.allStatuses")}</option>
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="min-h-11 px-5 rounded-lg bg-primary text-white text-sm"
        >
          {t("admin.common.filter")}
        </button>
      </form>

      {organizations.length === 0 ? (
        <EmptyState
          title={t("admin.page.customers.emptyTitle")}
          description={t("admin.page.customers.emptyDescription")}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-small text-left">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="py-2 pr-3">{t("admin.common.colCustomer")}</th>
                <th className="py-2 pr-3">{t("admin.common.colNumber")}</th>
                <th className="py-2 pr-3">{t("admin.common.colType")}</th>
                <th className="py-2 pr-3">{t("admin.common.colStatus")}</th>
                <th className="py-2">{t("admin.common.colContact")}</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((org) => (
                <tr key={org.id} className="border-b border-border/60">
                  <td className="py-3 pr-3">
                    <Link
                      href={withLocale(`/admin/customers/${org.id}`, locale)}
                      className="text-primary hover:underline font-medium"
                    >
                      {org.trade_name || org.legal_name}
                    </Link>
                  </td>
                  <td className="py-3 pr-3">
                    {org.customer_number ?? t("admin.common.empty")}
                  </td>
                  <td className="py-3 pr-3">{org.type}</td>
                  <td className="py-3 pr-3">{org.status}</td>
                  <td className="py-3">{org.contact_email ?? t("admin.common.empty")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
