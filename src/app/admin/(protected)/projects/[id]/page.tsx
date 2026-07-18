import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/container";
import { requireAdmin } from "@/server/auth/require-admin";
import { requirePermission } from "@/server/auth/require-permission";
import { createServiceRoleClient } from "@/lib/database/server";
import { PROJECT_STATUS_NL, PROJECT_TYPE_NL, labelNl } from "@/lib/portal/labels";

export const metadata: Metadata = {
  title: "Project",
  robots: { index: false },
};

export default async function AdminProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireAdmin();
  await requirePermission(ctx, "projects.view_all");
  const { id } = await params;
  const supabase = createServiceRoleClient();
  if (!supabase) notFound();

  const { data: project } = await supabase
    .from("portal_projects")
    .select("*, organization:organizations(id, legal_name)")
    .eq("id", id)
    .maybeSingle();

  if (!project) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/projects" className="text-small text-primary hover:underline">
          ← Projecten
        </Link>
        <h1 className="text-h1 mt-2">{project.name}</h1>
        <p className="text-muted text-small">
          {(Array.isArray(project.organization)
            ? project.organization[0]
            : project.organization
          )?.legal_name} ·{" "}
          {labelNl(PROJECT_TYPE_NL, project.project_type)} ·{" "}
          {labelNl(PROJECT_STATUS_NL, project.status)}
        </p>
      </div>
      <Card>
        <p className="text-label text-muted mb-2">Voortgang</p>
        <p className="text-2xl font-semibold">{project.progress_percent}%</p>
        {project.description ? (
          <p className="text-small mt-4 whitespace-pre-wrap">{project.description}</p>
        ) : null}
        <p className="text-small text-muted mt-4">
          Klantzichtbaar: {project.customer_visible ? "ja" : "nee"}
        </p>
      </Card>
    </div>
  );
}
