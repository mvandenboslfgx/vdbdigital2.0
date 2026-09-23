import type { Locale } from "@/i18n/config";

export const PROJECT_STATUS_NL: Record<string, string> = {
  DRAFT: "Concept", PLANNED: "Gepland", IN_PROGRESS: "In uitvoering",
  WAITING_FOR_CUSTOMER: "Wacht op klant", REVIEW: "Ter beoordeling",
  IN_REVIEW: "Ter beoordeling", COMPLETED: "Afgerond", ON_HOLD: "Gepauzeerd",
  CANCELED: "Geannuleerd", ARCHIVED: "Gearchiveerd",
};
export const PROJECT_STATUS_EN: Record<string, string> = {
  DRAFT: "Draft", PLANNED: "Planned", IN_PROGRESS: "In progress",
  WAITING_FOR_CUSTOMER: "Waiting for customer", REVIEW: "In review",
  IN_REVIEW: "In review", COMPLETED: "Completed", ON_HOLD: "On hold",
  CANCELED: "Cancelled", ARCHIVED: "Archived",
};

export const MILESTONE_STATUS_NL: Record<string, string> = {
  NOT_STARTED: "Nog niet gestart", IN_PROGRESS: "In uitvoering",
  WAITING_FOR_CUSTOMER: "Wacht op klant", COMPLETED: "Afgerond", SKIPPED: "Overgeslagen",
};
export const MILESTONE_STATUS_EN: Record<string, string> = {
  NOT_STARTED: "Not started", IN_PROGRESS: "In progress",
  WAITING_FOR_CUSTOMER: "Waiting for customer", COMPLETED: "Completed", SKIPPED: "Skipped",
};

export const ACTION_STATUS_NL: Record<string, string> = {
  OPEN: "Open", IN_PROGRESS: "In uitvoering", WAITING: "Wachtend",
  COMPLETED: "Afgerond", CANCELED: "Geannuleerd",
};
export const ACTION_STATUS_EN: Record<string, string> = {
  OPEN: "Open", IN_PROGRESS: "In progress", WAITING: "Waiting",
  COMPLETED: "Completed", CANCELED: "Cancelled",
};

export const DELIVERABLE_STATUS_NL: Record<string, string> = {
  DRAFT: "Concept", IN_REVIEW: "Interne review", PENDING: "Concept",
  SHARED: "Gedeeld", APPROVED: "Goedgekeurd", REJECTED: "Afgewezen",
  SUPERSEDED: "Vervangen",
};
export const DELIVERABLE_STATUS_EN: Record<string, string> = {
  DRAFT: "Draft", IN_REVIEW: "Internal review", PENDING: "Pending",
  SHARED: "Shared", APPROVED: "Approved", REJECTED: "Rejected",
  SUPERSEDED: "Superseded",
};

export const QUOTE_STATUS_NL: Record<string, string> = {
  DRAFT: "Concept", IN_REVIEW: "Ter controle", READY: "Gereed", SENT: "Verzonden",
  VIEWED: "Bekeken", ACCEPTED: "Geaccepteerd", DECLINED: "Afgewezen",
  EXPIRED: "Verlopen", WITHDRAWN: "Ingetrokken", SUPERSEDED: "Vervangen",
  ARCHIVED: "Gearchiveerd",
};
export const QUOTE_STATUS_EN: Record<string, string> = {
  DRAFT: "Draft", IN_REVIEW: "In review", READY: "Ready", SENT: "Sent",
  VIEWED: "Viewed", ACCEPTED: "Accepted", DECLINED: "Declined",
  EXPIRED: "Expired", WITHDRAWN: "Withdrawn", SUPERSEDED: "Superseded",
  ARCHIVED: "Archived",
};

export const INVOICE_STATUS_NL: Record<string, string> = {
  DRAFT: "Concept", IN_REVIEW: "Ter controle", READY: "Gereed", ISSUED: "Uitgegeven",
  OPEN: "Openstaand", PARTIALLY_PAID: "Gedeeltelijk betaald", PAID: "Betaald",
  OVERDUE: "Verlopen", CANCELED: "Geannuleerd", CREDITED: "Gecrediteerd",
  ARCHIVED: "Gearchiveerd",
};
export const INVOICE_STATUS_EN: Record<string, string> = {
  DRAFT: "Draft", IN_REVIEW: "In review", READY: "Ready", ISSUED: "Issued",
  OPEN: "Open", PARTIALLY_PAID: "Partially paid", PAID: "Paid",
  OVERDUE: "Overdue", CANCELED: "Cancelled", CREDITED: "Credited", ARCHIVED: "Archived",
};

export const INVOICE_TYPE_NL: Record<string, string> = {
  INVOICE: "Factuur", CREDIT_NOTE: "Creditnota", PROFORMA: "Proforma",
};
export const INVOICE_TYPE_EN: Record<string, string> = {
  INVOICE: "Invoice", CREDIT_NOTE: "Credit note", PROFORMA: "Proforma",
};

export const TICKET_STATUS_NL: Record<string, string> = {
  OPEN: "Open", IN_PROGRESS: "In behandeling", WAITING_FOR_CUSTOMER: "Wacht op jou",
  WAITING_FOR_VDB: "Wacht op VDB Digital", RESOLVED: "Opgelost", CLOSED: "Gesloten",
};
export const TICKET_STATUS_EN: Record<string, string> = {
  OPEN: "Open", IN_PROGRESS: "In progress", WAITING_FOR_CUSTOMER: "Waiting for you",
  WAITING_FOR_VDB: "Waiting for VDB Digital", RESOLVED: "Resolved", CLOSED: "Closed",
};

export const DOCUMENT_STATUS_NL: Record<string, string> = {
  UPLOADING: "Uploaden", AVAILABLE: "Beschikbaar", QUARANTINED: "In quarantaine",
  REJECTED: "Afgewezen", ARCHIVED: "Gearchiveerd", DELETED: "Verwijderd",
};
export const DOCUMENT_STATUS_EN: Record<string, string> = {
  UPLOADING: "Uploading", AVAILABLE: "Available", QUARANTINED: "Quarantined",
  REJECTED: "Rejected", ARCHIVED: "Archived", DELETED: "Deleted",
};

export const DOCUMENT_VISIBILITY_NL: Record<string, string> = {
  INTERNAL: "Intern", CUSTOMER_VISIBLE: "Zichtbaar voor klant",
  CUSTOMER_UPLOAD: "Door klant aangeleverd", RESTRICTED: "Beperkt",
};
export const DOCUMENT_VISIBILITY_EN: Record<string, string> = {
  INTERNAL: "Internal", CUSTOMER_VISIBLE: "Visible to customer",
  CUSTOMER_UPLOAD: "Uploaded by customer", RESTRICTED: "Restricted",
};

export const DOCUMENT_CATEGORY_NL: Record<string, string> = {
  GENERAL: "Algemeen", PROJECT_FILE: "Projectbestand", DELIVERABLE: "Oplevering",
  QUOTE: "Offerte", INVOICE: "Factuur", CONTRACT: "Contract", BRIEFING: "Briefing",
  DESIGN: "Ontwerp", CONTENT: "Content", REPORT: "Rapport",
  SUPPORT_ATTACHMENT: "Supportbijlage", OTHER: "Overig",
};
export const DOCUMENT_CATEGORY_EN: Record<string, string> = {
  GENERAL: "General", PROJECT_FILE: "Project file", DELIVERABLE: "Deliverable",
  QUOTE: "Quote", INVOICE: "Invoice", CONTRACT: "Contract", BRIEFING: "Briefing",
  DESIGN: "Design", CONTENT: "Content", REPORT: "Report",
  SUPPORT_ATTACHMENT: "Support attachment", OTHER: "Other",
};

export const SCAN_STATUS_NL: Record<string, string> = {
  NOT_REQUIRED: "Niet vereist", PENDING: "In afwachting", CLEAN: "Veilig",
  SUSPICIOUS: "Verdacht", INFECTED: "Geïnfecteerd", FAILED: "Mislukt",
};
export const SCAN_STATUS_EN: Record<string, string> = {
  NOT_REQUIRED: "Not required", PENDING: "Pending", CLEAN: "Clean",
  SUSPICIOUS: "Suspicious", INFECTED: "Infected", FAILED: "Failed",
};

export const PROJECT_TYPE_NL: Record<string, string> = {
  WEBSITE: "Website", WEBSHOP: "Webshop", SOFTWARE: "Software",
  OPTIMISATION: "Optimalisatie", MAINTENANCE: "Onderhoud", BRANDING: "Branding",
  INTEGRATION: "Integratie", SUPPORT: "Ondersteuning", OTHER: "Overig",
};
export const PROJECT_TYPE_EN: Record<string, string> = {
  WEBSITE: "Website", WEBSHOP: "Online store", SOFTWARE: "Software",
  OPTIMISATION: "Optimisation", MAINTENANCE: "Maintenance", BRANDING: "Branding",
  INTEGRATION: "Integration", SUPPORT: "Support", OTHER: "Other",
};

export function labelNl(map: Record<string, string>, value: string): string {
  return map[value] ?? value;
}

export function labelLocalized(
  locale: Locale,
  nlMap: Record<string, string>,
  enMap: Record<string, string>,
  value: string,
): string {
  return (locale === "en" ? enMap : nlMap)[value] ?? value;
}
