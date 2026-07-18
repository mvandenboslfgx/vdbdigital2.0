import type { Metadata } from "next";
import { EmptyState } from "@/components/portal/empty-state";
import { requireAdmin } from "@/server/auth/require-admin";
import { requirePermission } from "@/server/auth/require-permission";
import { createServiceRoleClient } from "@/lib/database/server";

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

  const rows = data ?? [];
  return (
    <div className="space-y-6">
      <h1 className="text-h1">Gebruikers</h1>
      <p className="text-muted text-small">
        Alleen OWNER mag OWNER/ADMIN-rollen toekennen of intrekken.
      </p>
      {rows.length === 0 ? (
        <EmptyState
          title="Geen staff-gebruikers gevonden"
          description="Adminrollen komen uit admin_roles + profiles."
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const rawProfile = (r as { profile?: unknown }).profile;
            const profile = (Array.isArray(rawProfile) ? rawProfile[0] : rawProfile) as
              | { email: string; full_name: string | null; is_active: boolean }
              | null
              | undefined;
            return (
              <li key={r.user_id} className="rounded-lg border border-border p-4 text-small">
                {profile?.full_name || profile?.email || r.user_id} · {r.role}
                {profile?.is_active === false ? " · geblokkeerd" : ""}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
