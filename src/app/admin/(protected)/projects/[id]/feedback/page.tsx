import { notFound } from "next/navigation";
import { ProjectTabShell } from "@/components/admin/project-tabs";
import { getAdminProjectBundle } from "@/server/repositories/admin-projects";
import { getDictionary } from "@/i18n/get-dictionary";
import { formatDateTime } from "@/i18n/format-date";

export default async function AdminProjectFeedbackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t, locale } = await getDictionary();
  const { id } = await params;
  const bundle = await getAdminProjectBundle(id);
  if (!bundle) notFound();

  return (
    <ProjectTabShell projectId={id} active="feedback">
      {bundle.feedback.length === 0 ? (
        <p className="text-muted text-small">
          {t("admin.projectDetail.noFeedback")}
        </p>
      ) : (
        <ul className="space-y-3">
          {bundle.feedback.map(
            (f: {
              id: string;
              body: string;
              visibility: string;
              status: string;
              created_at: string;
            }) => (
              <li key={f.id} className="rounded-xl border border-border p-4 text-small">
                <p className="text-muted mb-2">
                  {f.visibility === "INTERNAL"
                    ? t("admin.projectDetail.assignedInternal")
                    : t("admin.projectDetail.sharedWithCustomer")}{" "}
                  · {f.status} · {formatDateTime(f.created_at, locale)}
                </p>
                <p className="whitespace-pre-wrap">{f.body}</p>
              </li>
            ),
          )}
        </ul>
      )}
    </ProjectTabShell>
  );
}
