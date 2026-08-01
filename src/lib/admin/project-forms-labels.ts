import type { TranslateFn } from "@/i18n/create-t";

/**
 * Copy for the admin project client forms (milestone/action/deliverable
 * creation and the share button). Resolved on the server and passed in as a
 * `labels` prop, same as the other admin editors.
 */
export interface MilestoneFormLabels {
  heading: string;
  title: string;
  description: string;
  customerVisible: string;
  requiresCustomerAction: string;
  saving: string;
  submit: string;
}

export function buildMilestoneFormLabels(t: TranslateFn): MilestoneFormLabels {
  return {
    heading: t("admin.projectForms.addMilestone"),
    title: t("admin.common.colTitle"),
    description: t("admin.projectForms.milestoneDescription"),
    customerVisible: t("admin.projectForms.customerVisible"),
    requiresCustomerAction: t("admin.projectForms.requiresCustomerAction"),
    saving: t("admin.common.saving"),
    submit: t("admin.projectForms.saveMilestone"),
  };
}

export interface ActionFormLabels {
  heading: string;
  title: string;
  description: string;
  assignedInternal: string;
  assignedCustomer: string;
  assignedUnassigned: string;
  customerVisible: string;
  saving: string;
  submit: string;
}

export function buildActionFormLabels(t: TranslateFn): ActionFormLabels {
  return {
    heading: t("admin.projectForms.addAction"),
    title: t("admin.common.colTitle"),
    description: t("admin.projectDetail.description"),
    assignedInternal: t("admin.projectDetail.assignedInternal"),
    assignedCustomer: t("admin.projectDetail.assignedCustomer"),
    assignedUnassigned: t("admin.projectDetail.assignedUnassigned"),
    customerVisible: t("admin.projectForms.customerVisibleRequired"),
    saving: t("admin.common.saving"),
    submit: t("admin.projectForms.saveAction"),
  };
}

export interface DeliverableFormLabels {
  heading: string;
  note: string;
  title: string;
  description: string;
  requiresApproval: string;
  saving: string;
  submit: string;
}

export function buildDeliverableFormLabels(t: TranslateFn): DeliverableFormLabels {
  return {
    heading: t("admin.projectForms.deliverableHeading"),
    note: t("admin.projectForms.deliverableNote"),
    title: t("admin.common.colTitle"),
    description: t("admin.projectDetail.description"),
    requiresApproval: t("admin.projectForms.requiresApproval"),
    saving: t("admin.common.saving"),
    submit: t("admin.projectForms.saveDraft"),
  };
}

export interface ShareDeliverableLabels {
  sharing: string;
  submit: string;
}

export function buildShareDeliverableLabels(t: TranslateFn): ShareDeliverableLabels {
  return {
    sharing: t("admin.projectForms.sharing"),
    submit: t("admin.projectForms.shareWithCustomer"),
  };
}
