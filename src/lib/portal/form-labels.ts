import type { TranslateFn } from "@/i18n/create-t";
import type { CreateTicketFormLabels } from "@/components/portal/create-ticket-form";
import type { TicketReplyFormLabels } from "@/components/portal/ticket-reply-form";
import type { QuoteResponseFormLabels } from "@/components/portal/quote-response-form";
import type { ProjectFormLabels } from "@/components/portal/project-customer-forms";
import type {
  DocumentDownloadLabels,
  PortalUploadLabels,
} from "@/components/documents/document-forms";

/**
 * Portal forms are client components, so their copy has to arrive as props.
 * Resolving each label set in one place keeps the server pages from repeating
 * the same object literal and keeps the keys in a single grep-able spot.
 */

export function ticketCreateLabels(t: TranslateFn): CreateTicketFormLabels {
  return {
    heading: t("portal.forms.ticketCreate.heading"),
    subjectLabel: t("portal.forms.ticketCreate.subjectLabel"),
    descriptionLabel: t("portal.forms.ticketCreate.descriptionLabel"),
    submit: t("portal.forms.ticketCreate.submit"),
    submitting: t("portal.forms.ticketCreate.submitting"),
  };
}

export function ticketReplyLabels(t: TranslateFn): TicketReplyFormLabels {
  return {
    label: t("portal.forms.ticketReply.label"),
    submit: t("portal.forms.ticketReply.submit"),
    submitting: t("portal.forms.ticketReply.submitting"),
  };
}

export function quoteResponseLabels(t: TranslateFn): QuoteResponseFormLabels {
  return {
    headingAccept: t("portal.forms.quoteResponse.headingAccept"),
    headingDecline: t("portal.forms.quoteResponse.headingDecline"),
    headingBoth: t("portal.forms.quoteResponse.headingBoth"),
    reasonLabelDecline: t("portal.forms.quoteResponse.reasonLabelDecline"),
    reasonLabelAccept: t("portal.forms.quoteResponse.reasonLabelAccept"),
    accept: t("portal.forms.quoteResponse.accept"),
    decline: t("portal.forms.quoteResponse.decline"),
  };
}

export function documentUploadLabels(t: TranslateFn): PortalUploadLabels {
  return {
    heading: t("portal.forms.documentUpload.heading"),
    titlePlaceholder: t("portal.forms.documentUpload.titlePlaceholder"),
    submit: t("portal.forms.documentUpload.submit"),
    submitting: t("portal.forms.documentUpload.submitting"),
  };
}

export function documentDownloadLabels(t: TranslateFn): DocumentDownloadLabels {
  return {
    submit: t("portal.forms.documentDownload.submit"),
    working: t("portal.forms.documentDownload.working"),
    failed: t("portal.forms.documentDownload.failed"),
  };
}

export function projectFormLabels(t: TranslateFn): ProjectFormLabels {
  return {
    completeActionPlaceholder: t(
      "portal.forms.project.completeActionPlaceholder",
    ),
    completeActionSubmit: t("portal.forms.project.completeActionSubmit"),
    approveSubmit: t("portal.forms.project.approveSubmit"),
    rejectReasonPlaceholder: t("portal.forms.project.rejectReasonPlaceholder"),
    rejectSubmit: t("portal.forms.project.rejectSubmit"),
    feedbackHeading: t("portal.forms.project.feedbackHeading"),
    feedbackPlaceholder: t("portal.forms.project.feedbackPlaceholder"),
    feedbackSubmit: t("portal.forms.project.feedbackSubmit"),
    working: t("portal.forms.project.working"),
    sending: t("portal.forms.project.sending"),
  };
}
