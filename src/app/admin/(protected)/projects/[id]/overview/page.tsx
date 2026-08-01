import { notFound } from "next/navigation";
import { Card } from "@/components/ui/container";
import { ProjectTabShell } from "@/components/admin/project-tabs";
import { getAdminProjectBundle } from "@/server/repositories/admin-projects";
import {
  ACTION_STATUS_KEYS,
  MILESTONE_STATUS_KEYS,
  labelFor,
} from "@/lib/portal/labels";
import { getDictionary } from "@/i18n/get-dictionary";
import { formatDate, formatDateTime } from "@/i18n/format-date";

export default async function AdminProjectOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t, locale } = await getDictionary();
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
          <p className="text-label text-muted mb-1">
            {t("admin.projectDetail.progress")}
          </p>
          <p className="text-2xl font-semibold">{project.progress_percent}%</p>
        </Card>
        <Card>
          <p className="text-label text-muted mb-1">
            {t("admin.projectDetail.openCustomerActions")}
          </p>
          <p className="text-2xl font-semibold">{openCustomer.length}</p>
        </Card>
        <Card>
          <p className="text-label text-muted mb-1">
            {t("admin.projectDetail.openInternalActions")}
          </p>
          <p className="text-2xl font-semibold">{openInternal.length}</p>
        </Card>
        <Card>
          <p className="text-label text-muted mb-1">
            {t("admin.projectDetail.nextMilestone")}
          </p>
          <p className="text-small font-medium">
            {nextMilestone
              ? `${nextMilestone.title} · ${labelFor(t, MILESTONE_STATUS_KEYS, nextMilestone.status)}`
              : t("admin.projectDetail.noOpenMilestone")}
          </p>
        </Card>
      </div>

      {project.description ? (
        <Card>
          <p className="text-label text-muted mb-2">
            {t("admin.projectDetail.description")}
          </p>
          <p className="text-small whitespace-pre-wrap">{project.description}</p>
        </Card>
      ) : null}

      <Card>
        <p className="text-label text-muted mb-2">
          {t("admin.projectDetail.planning")}
        </p>
        <ul className="text-small space-y-1">
          <li>
            {t("admin.projectDetail.planningStart")}:{" "}
            {formatDate(project.start_date, locale)}
          </li>
          <li>
            {t("admin.projectDetail.planningPlanned")}:{" "}
            {formatDate(project.planned_delivery_date, locale)}
          </li>
          <li>
            {t("admin.projectDetail.planningActual")}:{" "}
            {formatDate(project.actual_delivery_date, locale)}
          </li>
        </ul>
      </Card>

      <section>
        <h2 className="text-h3 mb-3">
          {t("admin.projectDetail.recentActivity")}
        </h2>
        {activity.length === 0 ? (
          <p className="text-muted text-small">
            {t("admin.projectDetail.noActivityRecorded")}
          </p>
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
                    {formatDateTime(a.created_at, locale)} ·{" "}
                    {a.visibility === "CUSTOMER_VISIBLE"
                      ? t("admin.projectDetail.customerTag")
                      : t("admin.projectDetail.internalTag")}
                  </span>
                </li>
              ),
            )}
          </ul>
        )}
      </section>

      {openCustomer.length > 0 ? (
        <section>
          <h2 className="text-h3 mb-3">
            {t("admin.projectDetail.openCustomerActions")}
          </h2>
          <ul className="space-y-2">
            {openCustomer.map(
              (a: { id: string; title: string; status: string }) => (
                <li key={a.id} className="text-small border border-border rounded-lg px-3 py-2">
                  {a.title} · {labelFor(t, ACTION_STATUS_KEYS, a.status)}
                </li>
              ),
            )}
          </ul>
        </section>
      ) : null}
    </ProjectTabShell>
  );
}
