import { notFound } from "next/navigation";
import { PortalProjectTabShell } from "@/components/portal/project-tabs";
import { getPortalProject } from "@/server/repositories/portal";
import { getDictionary } from "@/i18n/get-dictionary";
import { formatDateTime } from "@/i18n/format-date";

export default async function PortalProjectActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t, locale } = await getDictionary();
  const { id } = await params;
  const { project, activity } = await getPortalProject(id);
  if (!project) notFound();

  return (
    <PortalProjectTabShell projectId={id} active="activity">
      {activity.length === 0 ? (
        <p className="text-muted text-small">
          {t("portal.projectActivityPage.empty")}
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
                  {formatDateTime(a.created_at, locale)}
                </p>
              </li>
            ),
          )}
        </ol>
      )}
    </PortalProjectTabShell>
  );
}
