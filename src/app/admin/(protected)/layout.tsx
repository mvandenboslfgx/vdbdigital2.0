import { redirect } from "next/navigation";
import { checkAdminAccess } from "@/server/auth/require-admin";
import { logoutAction } from "@/server/actions/auth-actions";
import { hasPermission } from "@/lib/auth/permissions";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";

const adminNav = [
  { label: "Dashboard", href: "/admin", permission: null },
  { label: "Products", href: "/admin/products", permission: "products.read" as const },
  { label: "Orders", href: "/admin/orders", permission: "orders.read" as const },
  { label: "Leads", href: "/admin/leads", permission: "leads.read" as const },
  { label: "Cases", href: "/admin/cases", permission: "cases.manage" as const },
  { label: "Offers", href: "/admin/offers", permission: "settings.read" as const },
  { label: "Content", href: "/admin/content", permission: "content.manage" as const },
  { label: "Settings", href: "/admin/settings", permission: "settings.read" as const },
  { label: "Audit log", href: "/admin/audit-log", permission: "audit.read" as const },
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
