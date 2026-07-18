import { notFound } from "next/navigation";
import { PortalProjectTabShell } from "@/components/portal/project-tabs";
import { getPortalProject } from "@/server/repositories/portal";
import { MILESTONE_STATUS_NL, labelNl } from "@/lib/portal/labels";

export default async function PortalProjectMilestonesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { project, milestones } = await getPortalProject(id);
  if (!project) notFound();

  return (
    <PortalProjectTabShell projectId={id} active="milestones">
      {milestones.length === 0 ? (
        <p className="text-muted text-small">Nog geen zichtbare mijlpalen.</p>
      ) : (
        <ol className="space-y-3">
          {milestones.map(
            (m: {
              id: string;
              title: string;
              description: string | null;
              status: string;
              due_date: string | null;
              completed_at: string | null;
            }) => (
              <li key={m.id} className="rounded-lg border border-border p-4">
                <p className="font-medium">{m.title}</p>
                <p className="text-small text-muted mt-1">
                  {labelNl(MILESTONE_STATUS_NL, m.status)}
                </p>
                {m.description ? (
                  <p className="text-small text-muted mt-1">{m.description}</p>
                ) : null}
                <p className="text-small text-muted mt-2">
                  {m.completed_at
                    ? `Afgerond op ${new Date(m.completed_at).toLocaleDateString("nl-NL")}`
                    : m.due_date
                      ? `Gepland: ${new Date(m.due_date).toLocaleDateString("nl-NL")}`
                      : "Nog geen datum"}
                </p>
              </li>
            ),
          )}
        </ol>
      )}
    </PortalProjectTabShell>
  );
}
