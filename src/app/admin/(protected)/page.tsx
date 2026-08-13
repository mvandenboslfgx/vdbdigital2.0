import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/container";
import { getAllProducts } from "@/server/repositories/products";
import { getAdminPortalDashboardCounts } from "@/server/repositories/admin-portal";
import { getDictionary } from "@/i18n/get-dictionary";
import { withLocale } from "@/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return {
    title: `${t("admin.areaLabel")} — ${t("admin.page.dashboard.title")}`,
    robots: { index: false, follow: false },
  };
}

export default async function AdminDashboardPage() {
  const { t, locale } = await getDictionary();
  const [products, counts] = await Promise.all([
    getAllProducts(),
    getAdminPortalDashboardCounts(),
  ]);

  const published = products.filter((p) => p.status === "PUBLISHED").length;

  const metrics = [
    { label: t("admin.page.dashboard.activeCustomers"), value: counts.customers },
    { label: t("admin.page.dashboard.openLeads"), value: counts.openLeads },
    { label: t("admin.page.dashboard.activeProjects"), value: counts.projects },
    { label: t("admin.page.dashboard.openQuotes"), value: counts.openQuotes },
    { label: t("admin.page.dashboard.openTickets"), value: counts.openTickets },
    { label: t("admin.page.dashboard.publishedProducts"), value: published },
  ];

  const quickActions = [
    { href: "/admin/customers", label: t("admin.page.dashboard.newCustomer") },
    { href: "/admin/projects", label: t("admin.projects") },
    { href: "/admin/products", label: t("admin.page.dashboard.manageProducts") },
    { href: "/admin/support", label: t("admin.support") },
    { href: "/admin/messages", label: t("admin.messages") },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-h1 mb-2">{t("admin.page.dashboard.title")}</h1>
        <p className="text-muted text-small">{t("admin.page.dashboard.subtitle")}</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <p className="text-label text-muted mb-1">{metric.label}</p>
            <p className="text-3xl font-semibold">{metric.value}</p>
          </Card>
        ))}
      </div>

      <section>
        <h2 className="text-h3 mb-4">{t("admin.page.dashboard.quickActions")}</h2>
        <div className="flex flex-wrap gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={withLocale(action.href, locale)}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:border-primary"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
