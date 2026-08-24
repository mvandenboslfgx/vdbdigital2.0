import { redirect } from "next/navigation";
import { checkAdminAccess } from "@/server/auth/require-admin";
import { logoutAction } from "@/server/actions/auth-actions";
import { hasPermission } from "@/lib/auth/permissions";
import { AdminShell } from "@/components/admin/admin-shell";
import { ADMIN_NAV_GROUPS } from "@/config/admin-nav";

export const dynamic = "force-dynamic";

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
  const groups = ADMIN_NAV_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    items: group.items
      .filter((item) => !item.permission || hasPermission(profile.role, item.permission))
      .map(({ label, href }) => ({ label, href })),
  })).filter((group) => group.items.length > 0);

  const maskedEmail = profile.user.email.replace(/^(.).+(@.+)$/, "$1***$2");

  return (
    <AdminShell
      groups={groups}
      maskedEmail={maskedEmail}
      role={profile.role}
      logoutAction={logoutAction}
    >
      {children}
    </AdminShell>
  );
}
