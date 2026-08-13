import { notFound } from "next/navigation";
import { ProjectTabShell } from "@/components/admin/project-tabs";
import { getAdminProjectBundle } from "@/server/repositories/admin-projects";
import { getDictionary } from "@/i18n/get-dictionary";
import { formatDateTime } from "@/i18n/format-date";

export default async function AdminProjectActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t, locale } = await getDictionary();
  const { id } = await params;
  const bundle = await getAdminProjectBundle(id);
  if (!bundle) notFound();

  return (
    <ProjectTabShell projectId={id} active="activity">
      {bundle.activity.length === 0 ? (
        <p className="text-muted text-small">
          {t("admin.projectDetail.noActivity")}
        </p>
      ) : (
        <ol className="space-y-3">
          {bundle.activity.map(
            (a: {
              id: string;
              summary: string;
              activity_type: string;
              visibility: string;
              created_at: string;
            }) => (
              <li key={a.id} className="rounded-xl border border-border p-4 text-small">
                <p className="font-medium">{a.summary}</p>
                <p className="text-muted mt-1">
                  {a.activity_type} ·{" "}
                  {a.visibility === "CUSTOMER_VISIBLE"
                    ? t("admin.projectDetail.customerVisibleTag")
                    : t("admin.projectDetail.internalTag")}{" "}
                  · {formatDateTime(a.created_at, locale)}
                </p>
              </li>
            ),
          )}
        </ol>
      )}
    </ProjectTabShell>
  );
}
