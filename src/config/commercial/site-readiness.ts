import { siteConfig, hasCompanyLocation, hasSocial } from "@/config/site";
import { isBookingConfigured } from "@/config/commercial/booking";

export interface ReadinessWarning {
  id: string;
  label: string;
  severity: "info" | "warning" | "critical";
}

/** Admin-facing checklist — never exposes secret values */
export function getSiteReadinessWarnings(): ReadinessWarning[] {
  const warnings: ReadinessWarning[] = [];

  if (!siteConfig.company.kvk) {
    warnings.push({ id: "kvk", label: "Chamber of Commerce (KvK) number missing", severity: "warning" });
  }
  if (!siteConfig.company.vat) {
    warnings.push({ id: "vat", label: "VAT number missing", severity: "warning" });
  }
  if (!hasCompanyLocation()) {
    warnings.push({ id: "address", label: "Public business address missing", severity: "warning" });
  }
  if (!siteConfig.company.phone) {
    warnings.push({ id: "phone", label: "Phone number missing", severity: "info" });
  }
  if (!siteConfig.whatsappNumber) {
    warnings.push({ id: "whatsapp", label: "WhatsApp number missing", severity: "info" });
  }
  if (!siteConfig.contactEmail) {
    warnings.push({ id: "contact-email", label: "Contact email missing", severity: "critical" });
  }
  if (!siteConfig.supportEmail) {
    warnings.push({ id: "support-email", label: "Support email missing", severity: "warning" });
  }
  if (!isBookingConfigured()) {
    warnings.push({ id: "booking", label: "Booking URL not configured — fallback to contact/quote", severity: "info" });
  }
  if (!hasSocial("linkedin")) {
    warnings.push({ id: "linkedin", label: "LinkedIn URL missing", severity: "info" });
  }
  if (!process.env.MOLLIE_API_KEY) {
    warnings.push({ id: "mollie", label: "Production payment key not configured", severity: "info" });
  }
  if (!process.env.RESEND_API_KEY) {
    warnings.push({ id: "email", label: "Transactional email (Resend) not configured", severity: "warning" });
  }
  warnings.push({
    id: "legal-review",
    label: "Legal pages require professional review before production",
    severity: "warning",
  });

  return warnings;
}
