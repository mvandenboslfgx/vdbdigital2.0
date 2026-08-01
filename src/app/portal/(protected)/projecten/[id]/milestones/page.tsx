import { notFound } from "next/navigation";
import { PortalProjectTabShell } from "@/components/portal/project-tabs";
import { getPortalProject } from "@/server/repositories/portal";
import { MILESTONE_STATUS_KEYS, labelFor } from "@/lib/portal/labels";
import { getDictionary } from "@/i18n/get-dictionary";
import { formatDate } from "@/i18n/format-date";

export default async function PortalProjectMilestonesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t, locale } = await getDictionary();
  const { id } = await params;
  const { project, milestones } = await getPortalProject(id);
  if (!project) notFound();

  return (
    <PortalProjectTabShell projectId={id} active="milestones">
      {milestones.length === 0 ? (
        <p className="text-muted text-small">
          {t("portal.projectDetail.noMilestones")}
        </p>
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
                  {labelFor(t, MILESTONE_STATUS_KEYS, m.status)}
                </p>
                {m.description ? (
                  <p className="text-small text-muted mt-1">{m.description}</p>
                ) : null}
                <p className="text-small text-muted mt-2">
                  {m.completed_at
                    ? t("portal.projectDetail.milestoneCompleted", {
                        date: formatDate(m.completed_at, locale),
                      })
                    : m.due_date
                      ? t("portal.projectDetail.milestoneDue", {
                          date: formatDate(m.due_date, locale),
                        })
                      : t("portal.projectDetail.milestoneNoDate")}
                </p>
              </li>
            ),
          )}
        </ol>
      )}
    </PortalProjectTabShell>
  );
}
