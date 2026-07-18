import { redirect } from "next/navigation";
import { checkAdminAccess } from "@/server/auth/require-admin";
import { logoutAction } from "@/server/actions/auth-actions";
import { hasPermission } from "@/lib/auth/permissions";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";

const adminNav = [
  { label: "Dashboard", href: "/admin", permission: null },
  { label: "Klanten", href: "/admin/customers", permission: "customers.view" as const },
  { label: "Projecten", href: "/admin/projects", permission: "projects.view_all" as const },
  { label: "Offertes", href: "/admin/quotes", permission: "quotes.manage" as const },
  { label: "Facturen", href: "/admin/invoices", permission: "invoices.manage" as const },
  { label: "Documenten", href: "/admin/documents", permission: "documents.view_organization" as const },
  { label: "Berichten", href: "/admin/messages", permission: "messages.manage" as const },
  { label: "Support", href: "/admin/support", permission: "support.manage" as const },
  { label: "Producten", href: "/admin/products", permission: "products.read" as const },
  { label: "Categorieën", href: "/admin/categories", permission: "products.read" as const },
  { label: "Add-ons", href: "/admin/addons", permission: "products.read" as const },
  { label: "Orders", href: "/admin/orders", permission: "orders.read" as const },
  { label: "Leads", href: "/admin/leads", permission: "leads.read" as const },
  { label: "Content", href: "/admin/content", permission: "content.manage" as const },
  { label: "Gebruikers", href: "/admin/users", permission: "roles.read" as const },
  { label: "Rollen", href: "/admin/roles", permission: "roles.read" as const },
  { label: "Instellingen", href: "/admin/settings", permission: "settings.read" as const },
  { label: "Audit", href: "/admin/audit", permission: "audit.read" as const },
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

  const { context: profile } = access;
  const visibleNav = adminNav
    .filter(
      (item) => !item.permission || hasPermission(profile.role, item.permission),
    )
    .map(({ label, href }) => ({ label, href }));

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
