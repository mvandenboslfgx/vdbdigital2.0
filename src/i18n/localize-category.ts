import type { Locale } from "@/i18n/config";

/**
 * Canonical category labels by slug — prevents DB Dutch names leaking onto EN.
 * Unknown slugs fall back to the stored name (NL) or a cleaned EN title-case of the slug.
 */
const CATEGORY_LABELS: Record<string, { en: string; nl: string }> = {
  websites: { en: "Websites", nl: "Websites" },
  webshops: { en: "Online stores", nl: "Webshops" },
  "ai-automatisering": { en: "AI & automation", nl: "AI & automatisering" },
  "whatsapp-oplossingen": { en: "WhatsApp solutions", nl: "WhatsApp-oplossingen" },
  reviewflows: { en: "Review flows", nl: "Reviewflows" },
  onderhoud: { en: "Maintenance", nl: "Onderhoud" },
  hosting: { en: "Hosting", nl: "Hosting" },
  templates: { en: "Templates", nl: "Templates" },
  support: { en: "Support", nl: "Support" },
  maatwerk: { en: "Custom work", nl: "Maatwerk" },
};

function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function localizeCategoryName(
  slug: string | null | undefined,
  fallbackName: string | null | undefined,
  locale: Locale,
): string {
  const key = (slug ?? "").trim().toLowerCase();
  const mapped = key ? CATEGORY_LABELS[key] : undefined;
  if (mapped) return mapped[locale];
  const fallback = fallbackName?.trim();
  if (fallback) {
    // EN pages must not show known Dutch category names without a map entry.
    if (locale === "en" && /[àáäâèéëêìíïîòóöôùúüûç]|Maatwerk|Onderhoud|Webshops/i.test(fallback)) {
      return key ? titleFromSlug(key) : fallback;
    }
    return fallback;
  }
  return key ? titleFromSlug(key) : locale === "nl" ? "Overig" : "Other";
}
