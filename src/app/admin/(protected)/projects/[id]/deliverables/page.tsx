import { notFound } from "next/navigation";
import { ProjectTabShell } from "@/components/admin/project-tabs";
import {
  CreateDeliverableForm,
  ShareDeliverableButton,
} from "@/components/admin/project-forms";
import { getAdminProjectBundle } from "@/server/repositories/admin-projects";
import { DELIVERABLE_STATUS_NL, labelNl } from "@/lib/portal/labels";

export default async function AdminProjectDeliverablesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getAdminProjectBundle(id);
  if (!bundle) notFound();

  return (
    <ProjectTabShell projectId={id} active="deliverables">
      <CreateDeliverableForm projectId={id} />
      {bundle.deliverables.length === 0 ? (
        <p className="text-muted text-small">
          Nog geen opleveringen. Bestanden volgen in de documentenfase.
        </p>
      ) : (
        <ul className="space-y-3">
          {bundle.deliverables.map(
            (d: {
              id: string;
              title: string;
              description: string | null;
              status: string;
              customer_visible: boolean;
              version: number;
              rejection_reason: string | null;
            }) => (
              <li key={d.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="font-medium">{d.title}</p>
                    <p className="text-small text-muted mt-1">
                      {labelNl(DELIVERABLE_STATUS_NL, d.status)}
                      {d.customer_visible ? " · klantzichtbaar" : " · intern"}
                    </p>
                    {d.description ? (
                      <p className="text-small mt-2 whitespace-pre-wrap">
                        {d.description}
                      </p>
                    ) : null}
                    {d.rejection_reason ? (
                      <p className="text-small text-red-600 mt-2">
                        Afwijzing: {d.rejection_reason}
                      </p>
                    ) : null}
                  </div>
                  {d.status === "DRAFT" || d.status === "IN_REVIEW" || d.status === "PENDING" ? (
                    <ShareDeliverableButton
                      deliverableId={d.id}
                      version={d.version}
                    />
                  ) : null}
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </ProjectTabShell>
  );
}
