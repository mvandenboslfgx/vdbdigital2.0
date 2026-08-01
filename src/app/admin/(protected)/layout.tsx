import { redirect } from "next/navigation";
import { checkAdminAccess } from "@/server/auth/require-admin";
import { logoutAction } from "@/server/actions/auth-actions";
import { hasPermission } from "@/lib/auth/permissions";
import { AdminShell } from "@/components/admin/admin-shell";
import { getDictionary } from "@/i18n/get-dictionary";
import { withLocale } from "@/i18n/config";
import { ServerLanguageSwitcher } from "@/i18n/server-language-switcher";

export const dynamic = "force-dynamic";

/**
 * Nav entries carry a dictionary key, not copy — the label is resolved per
 * request so the shell follows the staff member's locale.
 */
const adminNav = [
  { key: "admin.dashboard", href: "/admin", permission: null },
  { key: "admin.customers", href: "/admin/customers", permission: "customers.view" as const },
  { key: "admin.projects", href: "/admin/projects", permission: "projects.view_all" as const },
  { key: "admin.quotes", href: "/admin/quotes", permission: "quotes.view_assigned" as const },
  { key: "admin.invoices", href: "/admin/invoices", permission: "invoices.view_assigned" as const },
  { key: "admin.documents", href: "/admin/documents", permission: "documents.view_organization" as const },
  { key: "admin.messages", href: "/admin/messages", permission: "messages.manage" as const },
  { key: "admin.support", href: "/admin/support", permission: "support.manage" as const },
  { key: "admin.products", href: "/admin/products", permission: "products.read" as const },
  { key: "admin.categories", href: "/admin/categories", permission: "products.read" as const },
  { key: "admin.addons", href: "/admin/addons", permission: "products.read" as const },
  { key: "admin.orders", href: "/admin/orders", permission: "orders.read" as const },
  { key: "admin.leads", href: "/admin/leads", permission: "leads.read" as const },
  { key: "admin.content", href: "/admin/content", permission: "content.manage" as const },
  { key: "admin.users", href: "/admin/users", permission: "roles.read" as const },
  { key: "admin.roles", href: "/admin/roles", permission: "roles.read" as const },
  { key: "admin.settings", href: "/admin/settings", permission: "settings.read" as const },
  { key: "admin.audit", href: "/admin/audit", permission: "audit.read" as const },
];

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t, locale } = await getDictionary();
  const access = await checkAdminAccess();

  if (!access.authorized || !access.context) {
    redirect(access.redirectTo ?? withLocale("/admin/login", locale));
  }

  const { context: profile } = access;
  const visibleNav = adminNav
    .filter(
      (item) => !item.permission || hasPermission(profile.role, item.permission),
    )
    .map(({ key, href }) => ({ label: t(key), href: withLocale(href, locale) }));

  const maskedEmail = profile.user.email.replace(/^(.).+(@.+)$/, "$1***$2");

  return (
    <AdminShell
      nav={visibleNav}
      maskedEmail={maskedEmail}
      role={profile.role}
      labels={{
        navAria: t("admin.navAria"),
        brandAria: t("admin.brandAria"),
        areaLabel: t("admin.areaLabel"),
        logout: t("admin.logout"),
        openMenu: t("admin.openMenu"),
        closeMenu: t("admin.closeMenu"),
      }}
      languageSwitcher={<ServerLanguageSwitcher compact />}
      logoutAction={logoutAction}
    >
      {children}
    </AdminShell>
  );
}
