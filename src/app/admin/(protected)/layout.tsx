import { redirect } from "next/navigation";
import { checkAdminAccess } from "@/server/auth/require-admin";
import { logoutAction } from "@/server/actions/auth-actions";
import { hasPermission } from "@/lib/auth/permissions";
import { AdminShell } from "@/components/admin/admin-shell";
import { getLocale } from "@/i18n/get-dictionary";

export const dynamic = "force-dynamic";

const adminNav = [
  { nl: "Dashboard", en: "Dashboard", href: "/admin", permission: null },
  { nl: "Klanten", en: "Customers", href: "/admin/customers", permission: "customers.view" as const },
  { nl: "Projecten", en: "Projects", href: "/admin/projects", permission: "projects.view_all" as const },
  { nl: "Offertes", en: "Quotes", href: "/admin/quotes", permission: "quotes.view_assigned" as const },
  { nl: "Facturen", en: "Invoices", href: "/admin/invoices", permission: "invoices.view_assigned" as const },
  { nl: "Documenten", en: "Documents", href: "/admin/documents", permission: "documents.view_organization" as const },
  { nl: "Berichten", en: "Messages", href: "/admin/messages", permission: "messages.manage" as const },
  { nl: "Support", en: "Support", href: "/admin/support", permission: "support.manage" as const },
  { nl: "Producten", en: "Products", href: "/admin/products", permission: "products.read" as const },
  { nl: "Categorieën", en: "Categories", href: "/admin/categories", permission: "products.read" as const },
  { nl: "Add-ons", en: "Add-ons", href: "/admin/addons", permission: "products.read" as const },
  { nl: "Orders", en: "Orders", href: "/admin/orders", permission: "orders.read" as const },
  { nl: "Leads", en: "Leads", href: "/admin/leads", permission: "leads.read" as const },
  { nl: "Content", en: "Content", href: "/admin/content", permission: "content.manage" as const },
  { nl: "Gebruikers", en: "Users", href: "/admin/users", permission: "roles.read" as const },
  { nl: "Rollen", en: "Roles", href: "/admin/roles", permission: "roles.read" as const },
  { nl: "Instellingen", en: "Settings", href: "/admin/settings", permission: "settings.read" as const },
  { nl: "Audit", en: "Audit", href: "/admin/audit", permission: "audit.read" as const },
];

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await checkAdminAccess();

  if (!access.authorized || !access.context) {
    redirect(access.redirectTo ?? "/admin/login");
  }

  const locale = await getLocale();
  const { context: profile } = access;
  const visibleNav = adminNav
    .filter((item) => !item.permission || hasPermission(profile.role, item.permission))
    .map((item) => ({ label: item[locale], href: item.href }));

  const maskedEmail = profile.user.email.replace(/^(.).+(@.+)$/, "$1***$2");

  return (
    <AdminShell
      nav={visibleNav}
      maskedEmail={maskedEmail}
      role={profile.role}
      logoutAction={logoutAction}
    >
      {children}
    </AdminShell>
  );
}
