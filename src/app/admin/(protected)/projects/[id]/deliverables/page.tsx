import { notFound } from "next/navigation";
import { ProjectTabShell } from "@/components/admin/project-tabs";
import {
  CreateDeliverableForm,
  ShareDeliverableButton,
} from "@/components/admin/project-forms";
import { getAdminProjectBundle } from "@/server/repositories/admin-projects";
import { DELIVERABLE_STATUS_KEYS, labelFor } from "@/lib/portal/labels";
import { getDictionary } from "@/i18n/get-dictionary";
import {
  buildDeliverableFormLabels,
  buildShareDeliverableLabels,
} from "@/lib/admin/project-forms-labels";

export default async function AdminProjectDeliverablesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t } = await getDictionary();
  const { id } = await params;
  const bundle = await getAdminProjectBundle(id);
  if (!bundle) notFound();

  return (
    <ProjectTabShell projectId={id} active="deliverables">
      <CreateDeliverableForm
        projectId={id}
        labels={buildDeliverableFormLabels(t)}
      />
      {bundle.deliverables.length === 0 ? (
        <p className="text-muted text-small">
          {t("admin.projectDetail.noDeliverables")}
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
                      {labelFor(t, DELIVERABLE_STATUS_KEYS, d.status)}
                      {` · ${
                        d.customer_visible
                          ? t("admin.projectDetail.customerVisibleTag")
                          : t("admin.projectDetail.internalTag")
                      }`}
                    </p>
                    {d.description ? (
                      <p className="text-small mt-2 whitespace-pre-wrap">
                        {d.description}
                      </p>
                    ) : null}
                    {d.rejection_reason ? (
                      <p className="text-small text-red-600 mt-2">
                        {t("admin.projectDetail.rejection", {
                          reason: d.rejection_reason,
                        })}
                      </p>
                    ) : null}
                  </div>
                  {d.status === "DRAFT" || d.status === "IN_REVIEW" || d.status === "PENDING" ? (
                    <ShareDeliverableButton
                      deliverableId={d.id}
                      version={d.version}
                      labels={buildShareDeliverableLabels(t)}
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
