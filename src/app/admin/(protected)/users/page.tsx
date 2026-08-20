import type { Metadata } from "next";
import { EmptyState } from "@/components/portal/empty-state";
import { AdminUsersRoleManager } from "@/components/admin/admin-users-role-manager";
import { requireAdmin } from "@/server/auth/require-admin";
import { requirePermission } from "@/server/auth/require-permission";
import { createServiceRoleClient } from "@/lib/database/server";
import { isBootstrapOwnerEmail } from "@/lib/auth/bootstrap-owner";

export const metadata: Metadata = { title: "Gebruikers", robots: { index: false } };

export default async function AdminUsersPage() {
  const ctx = await requireAdmin();
  await requirePermission(ctx, "roles.read");
  const supabase = createServiceRoleClient();
  const { data } = supabase
    ? await supabase
        .from("admin_roles")
        .select("user_id, role, created_at, profile:profiles(email, full_name, is_active)")
        .order("created_at", { ascending: false })
    : { data: [] };

  const rows = (data ?? []).map((r) => {
    const rawProfile = (r as { profile?: unknown }).profile;
    const profile = (Array.isArray(rawProfile) ? rawProfile[0] : rawProfile) as
      | { email: string; full_name: string | null; is_active: boolean }
      | null
      | undefined;
    return {
      userId: r.user_id as string,
      role: r.role as string,
      email: profile?.email ?? null,
      fullName: profile?.full_name ?? null,
      isActive: profile?.is_active !== false,
      isBootstrap: isBootstrapOwnerEmail(profile?.email),
    };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-h1">Gebruikers</h1>
      <p className="text-muted text-small">
        Autorisatie via <code>admin_roles</code> (server-side). Alleen OWNER mag ADMIN/SUPPORT/CONTENT
        toekennen of intrekken. Bootstrap-owner is beschermd tegen degradatie.
      </p>
      {rows.length === 0 ? (
        <EmptyState
          title="Geen staff-gebruikers gevonden"
          description="Adminrollen komen uit admin_roles + profiles. Bootstrap OWNER via db:bootstrap-owner."
        />
      ) : (
        <AdminUsersRoleManager rows={rows} actorIsOwner={ctx.role === "OWNER"} />
      )}
    </div>
  );
}
