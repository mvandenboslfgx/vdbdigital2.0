import type { TranslateFn } from "@/i18n/create-t";
import { PROJECT_PRIORITY_KEYS, resolveLabelMap } from "@/lib/portal/labels";

/**
 * Copy for the admin project settings form. Resolved on the server and passed
 * in as a `labels` prop, same as the other admin editors.
 */
export interface ProjectSettingsFormLabels {
  name: string;
  description: string;
  type: string;
  status: string;
  priority: string;
  visibility: string;
  visibilityInternal: string;
  visibilityCustomer: string;
  progressPercent: string;
  startDate: string;
  plannedDelivery: string;
  actualDelivery: string;
  completeOverride: string;
  saving: string;
  submit: string;
  /** priority code → label; the codes stay DB values. */
  priorityLabels: Record<string, string>;
}

export function buildProjectSettingsFormLabels(
  t: TranslateFn,
): ProjectSettingsFormLabels {
  return {
    name: t("admin.common.colName"),
    description: t("admin.projectDetail.description"),
    type: t("admin.common.colType"),
    status: t("admin.common.colStatus"),
    priority: t("admin.page.projects.form.priority"),
    visibility: t("admin.page.projects.form.visibility"),
    visibilityInternal: t("admin.page.projects.settings.visibilityInternal"),
    visibilityCustomer: t("admin.page.projects.form.visibilityCustomer"),
    progressPercent: t("admin.page.projects.settings.progressPercent"),
    startDate: t("admin.page.projects.form.startDate"),
    plannedDelivery: t("admin.page.projects.form.plannedDelivery"),
    actualDelivery: t("admin.page.projects.settings.actualDelivery"),
    completeOverride: t("admin.page.projects.settings.completeOverride"),
    saving: t("admin.common.saving"),
    submit: t("admin.common.saveChanges"),
    priorityLabels: resolveLabelMap(t, PROJECT_PRIORITY_KEYS),
  };
}
