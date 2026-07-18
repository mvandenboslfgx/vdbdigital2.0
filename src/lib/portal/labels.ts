export const PROJECT_STATUS_NL: Record<string, string> = {
  DRAFT: "Concept",
  PLANNED: "Gepland",
  IN_PROGRESS: "In uitvoering",
  WAITING_FOR_CUSTOMER: "Wacht op jou",
  REVIEW: "In review",
  COMPLETED: "Afgerond",
  ON_HOLD: "On hold",
  CANCELED: "Geannuleerd",
  ARCHIVED: "Gearchiveerd",
};

export const QUOTE_STATUS_NL: Record<string, string> = {
  DRAFT: "Concept",
  SENT: "Verstuurd",
  VIEWED: "Bekeken",
  ACCEPTED: "Geaccepteerd",
  DECLINED: "Afgewezen",
  EXPIRED: "Verlopen",
  WITHDRAWN: "Ingetrokken",
};

export const INVOICE_STATUS_NL: Record<string, string> = {
  DRAFT: "Concept",
  OPEN: "Openstaand",
  PAID: "Betaald",
  OVERDUE: "Vervallen",
  CANCELED: "Geannuleerd",
  CREDITED: "Gecrediteerd",
};

export const TICKET_STATUS_NL: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In behandeling",
  WAITING_FOR_CUSTOMER: "Wacht op jou",
  WAITING_FOR_VDB: "Wacht op VDB Digital",
  RESOLVED: "Opgelost",
  CLOSED: "Gesloten",
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
