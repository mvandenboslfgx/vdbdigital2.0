import { notFound } from "next/navigation";
import { Card } from "@/components/ui/container";
import { PortalProjectTabShell } from "@/components/portal/project-tabs";
import { CompleteActionForm } from "@/components/portal/project-customer-forms";
import { projectFormLabels } from "@/lib/portal/form-labels";
import { getPortalProject } from "@/server/repositories/portal";
import { hasCustomerPermission } from "@/lib/auth/customer-permissions";
import {
  ACTION_STATUS_KEYS,
  MILESTONE_STATUS_KEYS,
  labelFor,
} from "@/lib/portal/labels";
import { getDictionary } from "@/i18n/get-dictionary";
import { formatDate } from "@/i18n/format-date";

export default async function PortalProjectOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t, locale } = await getDictionary();
  const { id } = await params;
  const bundle = await getPortalProject(id);
  if (!bundle.project) notFound();

  const { project, milestones, actions, ctx } = bundle;
  const canComplete = hasCustomerPermission(
    ctx.customerRole,
    "portal.projects.complete_action",
  );
  const openActions = actions.filter(
    (a: { status: string }) =>
      a.status !== "COMPLETED" && a.status !== "CANCELED",
  );
  const nextMilestone = milestones.find(
    (m: { status: string; completed_at: string | null }) =>
      m.status !== "COMPLETED" && !m.completed_at,
  );

  return (
    <PortalProjectTabShell projectId={id} active="overview">
      <Card>
        <p className="text-label text-muted mb-2">
          {t("portal.projectDetail.progress")}
        </p>
        <div className="h-3 rounded-full bg-surface-elevated overflow-hidden mb-2">
          <div
            className="h-full bg-primary"
            style={{ width: `${project.progress_percent}%` }}
          />
        </div>
        <p className="text-small">{project.progress_percent}%</p>
        {project.description ? (
          <p className="mt-4 text-small whitespace-pre-wrap">
            {project.description}
          </p>
        ) : null}
        <p className="text-small text-muted mt-4">
          {t("portal.projectDetail.plannedDelivery", {
            date: formatDate(
              project.planned_delivery_date,
              locale,
              t("portal.projectDetail.notPlannedYet"),
            ),
          })}
        </p>
        {nextMilestone ? (
          <p className="text-small text-muted mt-2">
            {t("portal.projectDetail.nextMilestone", {
              title: nextMilestone.title,
              status: labelFor(t, MILESTONE_STATUS_KEYS, nextMilestone.status),
            })}
          </p>
        ) : null}
      </Card>

      <section>
        <h2 className="text-h3 mb-3">
          {t("portal.projectDetail.openActionsTitle")}
        </h2>
        {openActions.length === 0 ? (
          <p className="text-muted text-small">
            {t("portal.projectDetail.noOpenActions")}
          </p>
        ) : (
          <ul className="space-y-3">
            {openActions.map(
              (a: {
                id: string;
                title: string;
                description: string | null;
                status: string;
                version: number;
              }) => (
                <li key={a.id} className="rounded-xl border border-border p-4">
                  <p className="font-medium">{a.title}</p>
                  <p className="text-small text-muted mt-1">
                    {labelFor(t, ACTION_STATUS_KEYS, a.status)}
                  </p>
                  {a.description ? (
                    <p className="text-small mt-2 whitespace-pre-wrap">
                      {a.description}
                    </p>
                  ) : null}
                  {canComplete ? (
                    <CompleteActionForm
                      actionId={a.id}
                      version={a.version}
                      labels={projectFormLabels(t)}
                    />
                  ) : null}
                </li>
              ),
            )}
          </ul>
        )}
      </section>
    </PortalProjectTabShell>
  );
}
