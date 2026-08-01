import { notFound } from "next/navigation";
import { ProjectTabShell } from "@/components/admin/project-tabs";
import { CreateMilestoneForm } from "@/components/admin/project-forms";
import { getAdminProjectBundle } from "@/server/repositories/admin-projects";
import { MILESTONE_STATUS_KEYS, labelFor } from "@/lib/portal/labels";
import { getDictionary } from "@/i18n/get-dictionary";

export default async function AdminProjectMilestonesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t } = await getDictionary();
  const { id } = await params;
  const bundle = await getAdminProjectBundle(id);
  if (!bundle) notFound();

  return (
    <ProjectTabShell projectId={id} active="milestones">
      <CreateMilestoneForm projectId={id} />
      {bundle.milestones.length === 0 ? (
        <p className="text-muted text-small">Nog geen mijlpalen.</p>
      ) : (
        <ol className="space-y-3">
          {bundle.milestones.map(
            (m: {
              id: string;
              title: string;
              description: string | null;
              status: string;
              due_date: string | null;
              customer_visible: boolean;
              requires_customer_action: boolean;
              sort_order: number;
            }) => (
              <li key={m.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="font-medium">
                    {m.sort_order + 1}. {m.title}
                  </p>
                  <p className="text-small text-muted">
                    {labelFor(t, MILESTONE_STATUS_KEYS, m.status)}
                    {m.customer_visible ? " · klantzichtbaar" : " · intern"}
                    {m.requires_customer_action ? " · klantactie" : ""}
                  </p>
                </div>
                {m.description ? (
                  <p className="text-small text-muted mt-2 whitespace-pre-wrap">
                    {m.description}
                  </p>
                ) : null}
                {m.due_date ? (
                  <p className="text-small text-muted mt-2">
                    Deadline: {new Date(m.due_date).toLocaleDateString("nl-NL")}
                  </p>
                ) : null}
              </li>
            ),
          )}
        </ol>
      )}
    </ProjectTabShell>
  );
}
