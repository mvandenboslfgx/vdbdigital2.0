import { notFound } from "next/navigation";
import { ProjectTabShell } from "@/components/admin/project-tabs";
import { ProjectSettingsForm } from "@/components/admin/project-settings-form";
import {
  archiveProjectAction,
  duplicateProjectAsDraftAction,
} from "@/server/actions/project-actions";
import { getAdminProjectBundle } from "@/server/repositories/admin-projects";
import { Button } from "@/components/ui/button";

export default async function AdminProjectSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getAdminProjectBundle(id);
  if (!bundle) notFound();
  const { project } = bundle;

  return (
    <ProjectTabShell projectId={id} active="settings">
      <ProjectSettingsForm
        project={{
          id: project.id,
          name: project.name,
          description: project.description,
          project_type: project.project_type,
          status: project.status,
          priority: project.priority,
          visibility: project.visibility ?? (project.customer_visible ? "CUSTOMER_VISIBLE" : "INTERNAL"),
          progress_percent: project.progress_percent,
          start_date: project.start_date,
          planned_delivery_date: project.planned_delivery_date,
          actual_delivery_date: project.actual_delivery_date,
          project_manager_id: project.project_manager_id,
          version: project.version,
        }}
      />

      <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
        <form action={duplicateProjectAsDraftAction}>
          <input type="hidden" name="projectId" value={project.id} />
          <Button type="submit" variant="outline">
            Dupliceer als concept
          </Button>
        </form>
        {!project.archived_at ? (
          <form action={archiveProjectAction}>
            <input type="hidden" name="projectId" value={project.id} />
            <input type="hidden" name="expectedVersion" value={project.version} />
            <Button type="submit" variant="outline">
              Archiveer project
            </Button>
          </form>
        ) : (
          <p className="text-small text-muted">Dit project is gearchiveerd.</p>
        )}
      </div>
    </ProjectTabShell>
  );
}
