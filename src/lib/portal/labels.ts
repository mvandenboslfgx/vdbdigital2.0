export const PROJECT_STATUS_NL: Record<string, string> = {
  DRAFT: "Concept",
  PLANNED: "Gepland",
  IN_PROGRESS: "In uitvoering",
  WAITING_FOR_CUSTOMER: "Wacht op klant",
  REVIEW: "Ter beoordeling",
  IN_REVIEW: "Ter beoordeling",
  COMPLETED: "Afgerond",
  ON_HOLD: "Gepauzeerd",
  CANCELED: "Geannuleerd",
  ARCHIVED: "Gearchiveerd",
};

export const MILESTONE_STATUS_NL: Record<string, string> = {
  NOT_STARTED: "Nog niet gestart",
  IN_PROGRESS: "In uitvoering",
  WAITING_FOR_CUSTOMER: "Wacht op klant",
  COMPLETED: "Afgerond",
  SKIPPED: "Overgeslagen",
};

export const ACTION_STATUS_NL: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In uitvoering",
  WAITING: "Wachtend",
  COMPLETED: "Afgerond",
  CANCELED: "Geannuleerd",
};

export const DELIVERABLE_STATUS_NL: Record<string, string> = {
  DRAFT: "Concept",
  IN_REVIEW: "Interne review",
  PENDING: "Concept",
  SHARED: "Gedeeld",
  APPROVED: "Goedgekeurd",
  REJECTED: "Afgewezen",
  SUPERSEDED: "Vervangen",
};

export const QUOTE_STATUS_NL: Record<string, string> = {
  DRAFT: "Concept",
  IN_REVIEW: "Ter controle",
  READY: "Gereed",
  SENT: "Verzonden",
  VIEWED: "Bekeken",
  ACCEPTED: "Geaccepteerd",
  DECLINED: "Afgewezen",
  EXPIRED: "Verlopen",
  WITHDRAWN: "Ingetrokken",
  SUPERSEDED: "Vervangen",
  ARCHIVED: "Gearchiveerd",
};

export const INVOICE_STATUS_NL: Record<string, string> = {
  DRAFT: "Concept",
  IN_REVIEW: "Ter controle",
  READY: "Gereed",
  ISSUED: "Uitgegeven",
  OPEN: "Openstaand",
  PARTIALLY_PAID: "Gedeeltelijk betaald",
  PAID: "Betaald",
  OVERDUE: "Verlopen",
  CANCELED: "Geannuleerd",
  CREDITED: "Gecrediteerd",
  ARCHIVED: "Gearchiveerd",
};

export const INVOICE_TYPE_NL: Record<string, string> = {
  INVOICE: "Factuur",
  CREDIT_NOTE: "Creditnota",
  PROFORMA: "Proforma",
};

export const TICKET_STATUS_NL: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In behandeling",
  WAITING_FOR_CUSTOMER: "Wacht op jou",
  WAITING_FOR_VDB: "Wacht op VDB Digital",
  RESOLVED: "Opgelost",
  CLOSED: "Gesloten",
};

export const DOCUMENT_STATUS_NL: Record<string, string> = {
  UPLOADING: "Uploaden",
  AVAILABLE: "Beschikbaar",
  QUARANTINED: "In quarantaine",
  REJECTED: "Afgewezen",
  ARCHIVED: "Gearchiveerd",
  DELETED: "Verwijderd",
};

export const DOCUMENT_VISIBILITY_NL: Record<string, string> = {
  INTERNAL: "Intern",
  CUSTOMER_VISIBLE: "Zichtbaar voor klant",
  CUSTOMER_UPLOAD: "Door klant aangeleverd",
  RESTRICTED: "Beperkt",
};

export const DOCUMENT_CATEGORY_NL: Record<string, string> = {
  GENERAL: "Algemeen",
  PROJECT_FILE: "Projectbestand",
  DELIVERABLE: "Oplevering",
  QUOTE: "Offerte",
  INVOICE: "Factuur",
  CONTRACT: "Contract",
  BRIEFING: "Briefing",
  DESIGN: "Ontwerp",
  CONTENT: "Content",
  REPORT: "Rapport",
  SUPPORT_ATTACHMENT: "Supportbijlage",
  OTHER: "Overig",
};

export const SCAN_STATUS_NL: Record<string, string> = {
  NOT_REQUIRED: "Niet vereist",
  PENDING: "In afwachting",
  CLEAN: "Veilig",
  SUSPICIOUS: "Verdacht",
  INFECTED: "Geïnfecteerd",
  FAILED: "Mislukt",
};

export const PROJECT_TYPE_NL: Record<string, string> = {
  WEBSITE: "Website",
  WEBSHOP: "Webshop",
  SOFTWARE: "Software",
  OPTIMISATION: "Optimalisatie",
  MAINTENANCE: "Onderhoud",
  BRANDING: "Branding",
  INTEGRATION: "Integratie",
  SUPPORT: "Ondersteuning",
  OTHER: "Overig",
};

export function labelNl(map: Record<string, string>, value: string): string {
  return map[value] ?? value;
}
