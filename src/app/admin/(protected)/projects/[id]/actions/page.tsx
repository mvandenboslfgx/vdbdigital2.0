import { notFound } from "next/navigation";
import { ProjectTabShell } from "@/components/admin/project-tabs";
import { CreateActionForm } from "@/components/admin/project-forms";
import { getAdminProjectBundle } from "@/server/repositories/admin-projects";
import { ACTION_STATUS_NL, labelNl } from "@/lib/portal/labels";

export default async function AdminProjectActionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getAdminProjectBundle(id);
  if (!bundle) notFound();

  return (
    <ProjectTabShell projectId={id} active="actions">
      <CreateActionForm projectId={id} />
      {bundle.actions.length === 0 ? (
        <p className="text-muted text-small">Nog geen acties.</p>
      ) : (
        <ul className="space-y-3">
          {bundle.actions.map(
            (a: {
              id: string;
              title: string;
              description: string | null;
              status: string;
              assigned_to_type: string;
              customer_visible: boolean;
              due_date: string | null;
            }) => (
              <li key={a.id} className="rounded-xl border border-border p-4">
                <p className="font-medium">{a.title}</p>
                <p className="text-small text-muted mt-1">
                  {labelNl(ACTION_STATUS_NL, a.status)} ·{" "}
                  {a.assigned_to_type === "CUSTOMER"
                    ? "Klant"
                    : a.assigned_to_type === "INTERNAL"
                      ? "Intern"
                      : "Niet toegewezen"}
                  {a.customer_visible ? " · zichtbaar" : " · verborgen"}
                </p>
                {a.description ? (
                  <p className="text-small mt-2 whitespace-pre-wrap">
                    {a.description}
                  </p>
                ) : null}
              </li>
            ),
          )}
        </ul>
      )}
    </ProjectTabShell>
  );
}
