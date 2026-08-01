import { notFound } from "next/navigation";
import { PortalProjectTabShell } from "@/components/portal/project-tabs";
import {
  ApproveDeliverableForm,
  RejectDeliverableForm,
} from "@/components/portal/project-customer-forms";
import { projectFormLabels } from "@/lib/portal/form-labels";
import { getPortalProject } from "@/server/repositories/portal";
import { hasCustomerPermission } from "@/lib/auth/customer-permissions";
import { DELIVERABLE_STATUS_KEYS, labelFor } from "@/lib/portal/labels";
import { getDictionary } from "@/i18n/get-dictionary";

export default async function PortalProjectDeliverablesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t } = await getDictionary();
  const { id } = await params;
  const bundle = await getPortalProject(id);
  if (!bundle.project) notFound();

  const canApprove = hasCustomerPermission(
    bundle.ctx.customerRole,
    "portal.projects.approve_deliverable",
  );
  const formLabels = projectFormLabels(t);

  return (
    <PortalProjectTabShell projectId={id} active="deliverables">
      <p className="text-small text-muted">
        {t("portal.projectDetail.deliverablesNote")}
      </p>
      {bundle.deliverables.length === 0 ? (
        <p className="text-muted text-small">
          {t("portal.projectDetail.noDeliverables")}
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
                  {labelFor(t, DELIVERABLE_STATUS_KEYS, d.status)}
                </p>
                {d.description ? (
                  <p className="text-small mt-2 whitespace-pre-wrap">
                    {d.description}
                  </p>
                ) : null}
                {d.rejection_reason ? (
                  <p className="text-small text-red-600 mt-2">
                    {t("portal.projectDetail.rejectionReason", {
                      reason: d.rejection_reason,
                    })}
                  </p>
                ) : null}
                {canApprove && d.status === "SHARED" ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <ApproveDeliverableForm
                      deliverableId={d.id}
                      version={d.version}
                      labels={formLabels}
                    />
                    <RejectDeliverableForm
                      deliverableId={d.id}
                      version={d.version}
                      labels={formLabels}
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
