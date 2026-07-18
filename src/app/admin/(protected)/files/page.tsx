import type { Metadata } from "next";
import { EmptyState } from "@/components/portal/empty-state";
import { requireAdmin } from "@/server/auth/require-admin";
import { requirePermission } from "@/server/auth/require-permission";
import { createServiceRoleClient } from "@/lib/database/server";

export const metadata: Metadata = { title: "Bestanden", robots: { index: false } };

export default async function AdminFilesPage() {
  const ctx = await requireAdmin();
  await requirePermission(ctx, "files.manage");
  const supabase = createServiceRoleClient();
  const { data } = supabase
    ? await supabase
        .from("portal_files")
        .select("id, file_name, mime_type, customer_visible, created_at")
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [] };

  const rows = data ?? [];
  return (
    <div className="space-y-6">
      <h1 className="text-h1">Bestanden</h1>
      {rows.length === 0 ? (
        <EmptyState
          title="Nog geen bestanden"
          description="Portalbestanden met organisatie-isolatie verschijnen hier."
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((f) => (
            <li key={f.id} className="rounded-lg border border-border p-4 text-small">
              {f.file_name} · {f.mime_type} ·{" "}
              {f.customer_visible ? "klantzichtbaar" : "intern"}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
