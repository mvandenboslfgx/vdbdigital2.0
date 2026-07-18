import { notFound } from "next/navigation";
import { PortalProjectTabShell } from "@/components/portal/project-tabs";
import { getPortalProject } from "@/server/repositories/portal";

export default async function PortalProjectActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { project, activity } = await getPortalProject(id);
  if (!project) notFound();

  return (
    <PortalProjectTabShell projectId={id} active="activity">
      {activity.length === 0 ? (
        <p className="text-muted text-small">
          Er is nog geen zichtbare projectactiviteit.
        </p>
      ) : (
        <ol className="space-y-3">
          {activity.map(
            (a: { id: string; summary: string; created_at: string }) => (
              <li
                key={a.id}
                className="rounded-lg border border-border p-4 text-small"
              >
                <p className="font-medium">{a.summary}</p>
                <p className="text-muted mt-1">
                  {new Date(a.created_at).toLocaleString("nl-NL")}
                </p>
              </li>
            ),
          )}
        </ol>
      )}
    </PortalProjectTabShell>
  );
}
