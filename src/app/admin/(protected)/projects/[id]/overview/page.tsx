import { notFound } from "next/navigation";
import { Card } from "@/components/ui/container";
import { ProjectTabShell } from "@/components/admin/project-tabs";
import { getAdminProjectBundle } from "@/server/repositories/admin-projects";
import {
  ACTION_STATUS_NL,
  MILESTONE_STATUS_NL,
  labelNl,
} from "@/lib/portal/labels";

export default async function AdminProjectOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getAdminProjectBundle(id);
  if (!bundle) notFound();

  const { project, milestones, actions, activity } = bundle;
  const openCustomer = actions.filter(
    (a: { assigned_to_type: string; status: string }) =>
      a.assigned_to_type === "CUSTOMER" &&
      a.status !== "COMPLETED" &&
      a.status !== "CANCELED",
  );
  const openInternal = actions.filter(
    (a: { assigned_to_type: string; status: string }) =>
      a.assigned_to_type !== "CUSTOMER" &&
      a.status !== "COMPLETED" &&
      a.status !== "CANCELED",
  );
  const nextMilestone = milestones.find(
    (m: { status: string; completed_at: string | null }) =>
      m.status !== "COMPLETED" && !m.completed_at,
  );

  return (
    <ProjectTabShell projectId={id} active="overview">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-label text-muted mb-1">Voortgang</p>
          <p className="text-2xl font-semibold">{project.progress_percent}%</p>
        </Card>
        <Card>
          <p className="text-label text-muted mb-1">Open klantacties</p>
          <p className="text-2xl font-semibold">{openCustomer.length}</p>
        </Card>
        <Card>
          <p className="text-label text-muted mb-1">Open interne acties</p>
          <p className="text-2xl font-semibold">{openInternal.length}</p>
        </Card>
        <Card>
          <p className="text-label text-muted mb-1">Volgende mijlpaal</p>
          <p className="text-small font-medium">
            {nextMilestone
              ? `${nextMilestone.title} · ${labelNl(MILESTONE_STATUS_NL, nextMilestone.status)}`
              : "Geen open mijlpaal"}
          </p>
        </Card>
      </div>

      {project.description ? (
        <Card>
          <p className="text-label text-muted mb-2">Omschrijving</p>
          <p className="text-small whitespace-pre-wrap">{project.description}</p>
        </Card>
      ) : null}

      <Card>
        <p className="text-label text-muted mb-2">Planning</p>
        <ul className="text-small space-y-1">
          <li>
            Start:{" "}
            {project.start_date
              ? new Date(project.start_date).toLocaleDateString("nl-NL")
              : "—"}
          </li>
          <li>
            Gepland:{" "}
            {project.planned_delivery_date
              ? new Date(project.planned_delivery_date).toLocaleDateString(
                  "nl-NL",
                )
              : "—"}
          </li>
          <li>
            Werkelijk:{" "}
            {project.actual_delivery_date
              ? new Date(project.actual_delivery_date).toLocaleDateString(
                  "nl-NL",
                )
              : "—"}
          </li>
        </ul>
      </Card>

      <section>
        <h2 className="text-h3 mb-3">Recente activiteit</h2>
        {activity.length === 0 ? (
          <p className="text-muted text-small">Nog geen activiteit geregistreerd.</p>
        ) : (
          <ul className="space-y-2">
            {activity.slice(0, 8).map(
              (a: {
                id: string;
                summary: string;
                created_at: string;
                visibility: string;
              }) => (
                <li
                  key={a.id}
                  className="rounded-lg border border-border px-3 py-2 text-small"
                >
                  <span>{a.summary}</span>
                  <span className="text-muted ml-2">
                    {new Date(a.created_at).toLocaleString("nl-NL")} ·{" "}
                    {a.visibility === "CUSTOMER_VISIBLE" ? "klant" : "intern"}
                  </span>
                </li>
              ),
            )}
          </ul>
        )}
      </section>

      {openCustomer.length > 0 ? (
        <section>
          <h2 className="text-h3 mb-3">Open klantacties</h2>
          <ul className="space-y-2">
            {openCustomer.map(
              (a: { id: string; title: string; status: string }) => (
                <li key={a.id} className="text-small border border-border rounded-lg px-3 py-2">
                  {a.title} · {labelNl(ACTION_STATUS_NL, a.status)}
                </li>
              ),
            )}
          </ul>
        </section>
      ) : null}
    </ProjectTabShell>
  );
}
