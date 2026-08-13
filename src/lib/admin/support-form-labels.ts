import type { TranslateFn } from "@/i18n/create-t";

/**
 * Copy for the admin support-ticket client forms and the customer creation
 * form. Resolved on the server and passed in as a `labels` prop, same as the
 * other admin editors.
 */
export interface TicketStatusFormLabels {
  statusHeading: string;
  /** `{status}` is the raw DB status code, substituted client-side. */
  currentStatusTemplate: string;
  newStatus: string;
  updating: string;
  submit: string;
}

export function buildTicketStatusFormLabels(t: TranslateFn): TicketStatusFormLabels {
  return {
    statusHeading: t("admin.common.colStatus"),
    currentStatusTemplate: t("admin.page.support.currentStatus"),
    newStatus: t("admin.page.support.newStatus"),
    updating: t("admin.page.support.updatingStatus"),
    submit: t("admin.page.support.saveStatus"),
  };
}

export interface TicketInternalNoteFormLabels {
  heading: string;
  disabled: string;
  visibility: string;
  field: string;
  saving: string;
  submit: string;
}

export function buildTicketInternalNoteFormLabels(
  t: TranslateFn,
): TicketInternalNoteFormLabels {
  return {
    heading: t("admin.page.support.internalNoteHeading"),
    disabled: t("admin.page.support.internalNoteDisabled"),
    visibility: t("admin.page.support.internalNoteVisibility"),
    field: t("admin.page.support.internalNoteField"),
    saving: t("admin.common.saving"),
    submit: t("admin.page.support.saveInternalNote"),
  };
}

export interface CreateCustomerFormLabels {
  heading: string;
  legalName: string;
  tradeName: string;
  type: string;
  typeBusiness: string;
  typeConsumer: string;
  contactEmail: string;
  inviteEmail: string;
  creating: string;
  submit: string;
}

export function buildCreateCustomerFormLabels(
  t: TranslateFn,
): CreateCustomerFormLabels {
  return {
    heading: t("admin.page.customers.createHeading"),
    legalName: t("admin.page.customers.legalName"),
    tradeName: t("admin.page.customers.tradeName"),
    type: t("admin.common.colType"),
    typeBusiness: t("admin.page.customers.typeBusiness"),
    typeConsumer: t("admin.page.customers.typeConsumer"),
    contactEmail: t("admin.page.customers.contactEmail"),
    inviteEmail: t("admin.page.customers.inviteEmail"),
    creating: t("admin.page.customers.creating"),
    submit: t("admin.page.customers.submitCreate"),
  };
}
