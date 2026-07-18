import { notFound } from "next/navigation";
import { PortalProjectTabShell } from "@/components/portal/project-tabs";
import {
  ApproveDeliverableForm,
  RejectDeliverableForm,
} from "@/components/portal/project-customer-forms";
import { getPortalProject } from "@/server/repositories/portal";
import { hasCustomerPermission } from "@/lib/auth/customer-permissions";
import { DELIVERABLE_STATUS_NL, labelNl } from "@/lib/portal/labels";

export default async function PortalProjectDeliverablesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getPortalProject(id);
  if (!bundle.project) notFound();

  const canApprove = hasCustomerPermission(
    bundle.ctx.customerRole,
    "portal.projects.approve_deliverable",
  );

  return (
    <PortalProjectTabShell projectId={id} active="deliverables">
      <p className="text-small text-muted">
        Bestanden en downloads volgen in een latere documentenfase. Hier zie je
        alleen gedeelde opleveringen en goedkeuringen.
      </p>
      {bundle.deliverables.length === 0 ? (
        <p className="text-muted text-small">
          Er zijn nog geen opleveringen met je gedeeld.
        </p>
      ) : (
        <ul className="space-y-4">
          {bundle.deliverables.map(
            (d: {
              id: string;
              title: string;
              description: string | null;
              status: string;
              version: number;
              rejection_reason: string | null;
            }) => (
              <li key={d.id} className="rounded-xl border border-border p-4">
                <p className="font-medium">{d.title}</p>
                <p className="text-small text-muted mt-1">
                  {labelNl(DELIVERABLE_STATUS_NL, d.status)}
                </p>
                {d.description ? (
                  <p className="text-small mt-2 whitespace-pre-wrap">
                    {d.description}
                  </p>
                ) : null}
                {d.rejection_reason ? (
                  <p className="text-small text-red-600 mt-2">
                    Reden: {d.rejection_reason}
                  </p>
                ) : null}
                {canApprove && d.status === "SHARED" ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <ApproveDeliverableForm
                      deliverableId={d.id}
                      version={d.version}
                    />
                    <RejectDeliverableForm
                      deliverableId={d.id}
                      version={d.version}
                    />
                  </div>
                ) : null}
              </li>
            ),
          )}
        </ul>
      )}
    </PortalProjectTabShell>
  );
}
