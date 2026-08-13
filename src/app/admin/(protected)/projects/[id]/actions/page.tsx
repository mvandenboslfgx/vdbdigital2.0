import { notFound } from "next/navigation";
import { ProjectTabShell } from "@/components/admin/project-tabs";
import { CreateActionForm } from "@/components/admin/project-forms";
import { getAdminProjectBundle } from "@/server/repositories/admin-projects";
import { ACTION_STATUS_KEYS, labelFor } from "@/lib/portal/labels";
import { getDictionary } from "@/i18n/get-dictionary";
import { buildActionFormLabels } from "@/lib/admin/project-forms-labels";

export default async function AdminProjectActionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t } = await getDictionary();
  const { id } = await params;
  const bundle = await getAdminProjectBundle(id);
  if (!bundle) notFound();

  return (
    <ProjectTabShell projectId={id} active="actions">
      <CreateActionForm projectId={id} labels={buildActionFormLabels(t)} />
      {bundle.actions.length === 0 ? (
        <p className="text-muted text-small">
          {t("admin.projectDetail.noActions")}
        </p>
      ) : (
        <ul className="space-y-3">
          {bundle.actions.map(
            (a: {
              id: string;
              title: string;
              description: string | null;
              status: string;
              assigned_to_type: string;
              customer_visible: boolean;
              due_date: string | null;
            }) => (
              <li key={a.id} className="rounded-xl border border-border p-4">
                <p className="font-medium">{a.title}</p>
                <p className="text-small text-muted mt-1">
                  {labelFor(t, ACTION_STATUS_KEYS, a.status)} ·{" "}
                  {a.assigned_to_type === "CUSTOMER"
                    ? t("admin.projectDetail.assignedCustomer")
                    : a.assigned_to_type === "INTERNAL"
                      ? t("admin.projectDetail.assignedInternal")
                      : t("admin.projectDetail.assignedUnassigned")}
                  {` · ${
                    a.customer_visible
                      ? t("admin.projectDetail.visibleTag")
                      : t("admin.projectDetail.hiddenTag")
                  }`}
                </p>
                {a.description ? (
                  <p className="text-small mt-2 whitespace-pre-wrap">
                    {a.description}
                  </p>
                ) : null}
              </li>
            ),
          )}
        </ul>
      )}
    </ProjectTabShell>
  );
}
