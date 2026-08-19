export const locales = ["en", "nl"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

/** Expandable later: de | fr | es | sq */
export const localeLabels: Record<Locale, string> = {
  en: "English",
  nl: "Nederlands",
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/**
 * English pathnames (root). Dutch uses the same pathnames under `/nl`.
 */
export const paths = {
  home: "/",
  solutions: "/solutions",
  websites: "/solutions/websites",
  webshops: "/solutions/webshops",
  aiAutomation: "/solutions/ai-automation",
  whatsappAi: "/solutions/whatsapp-ai",
  livechat: "/solutions/livechat",
  reviewflows: "/solutions/reviewflows",
  appointmentAutomation: "/solutions/appointment-automation",
  websiteMaintenance: "/solutions/website-maintenance",
  technicalSupport: "/solutions/technical-support",
  conversionOptimisation: "/solutions/conversion-optimisation",
  customSoftware: "/solutions/custom-software",
  customWebsites: "/solutions/custom-websites",
  liveChat: "/solutions/live-chat",
  reviewFlows: "/solutions/review-flows",
  shop: "/shop",
  shopSoftware: "/shop/software",
  forBusiness: "/for-business",
  cases: "/cases",
  process: "/process",
  about: "/about",
  support: "/support",
  contact: "/contact",
  quote: "/quote",
  login: "/inloggen",
  cart: "/cart",
  checkout: "/checkout",
  checkoutSuccess: "/checkout/success",
  checkoutCancelled: "/checkout/cancelled",
  privacy: "/privacy",
  cookies: "/cookies",
  terms: "/terms",
  refundPolicy: "/refund-policy",
  /** Dutch SEO landing pages (NL primary) */
  websiteLatenMaken: "/website-laten-maken",
  webdesign: "/webdesign",
  webshopLatenMaken: "/webshop-laten-maken",
  aiAutomatisering: "/ai-automatisering",
  aiChatbot: "/ai-chatbot",
  whatsappAutomatisering: "/whatsapp-automatisering",
  maatwerkSoftware: "/maatwerk-software",
  klantportaalLatenMaken: "/klantportaal-laten-maken",
  kennisbank: "/kennisbank",
} as const;

export type PathKey = keyof typeof paths;

/** Old Dutch URLs → new English path (no locale prefix). */
export const legacyRedirects: Record<string, string> = {
  "/oplossingen": paths.solutions,
  "/oplossingen/websites": paths.websites,
  "/oplossingen/webshops": paths.webshops,
  "/oplossingen/ai-automatisering": paths.aiAutomation,
  "/oplossingen/whatsapp-ai": paths.whatsappAi,
  "/oplossingen/livechat": paths.livechat,
  "/oplossingen/reviewflows": paths.reviewflows,
  "/oplossingen/afspraakautomatisering": paths.appointmentAutomation,
  "/oplossingen/websiteonderhoud": paths.websiteMaintenance,
  "/oplossingen/technische-support": paths.technicalSupport,
  "/oplossingen/conversie-optimalisatie": paths.conversionOptimisation,
  "/oplossingen/maatwerksoftware": paths.customSoftware,
  "/oplossingen/maatwerkwebsites": paths.websites,
  "/solutions/live-chat": paths.livechat,
  "/solutions/review-flows": paths.reviewflows,
  "/solutions/custom-websites": paths.websites,
  "/over-ons": paths.about,
  "/werkwijze": paths.process,
  "/offerte": paths.quote,
  "/winkelwagen": paths.cart,
  "/algemene-voorwaarden": paths.terms,
  "/refundbeleid": paths.refundPolicy,
  "/login": paths.login,
  "/checkout/succes": paths.checkoutSuccess,
  "/checkout/geannuleerd": paths.checkoutCancelled,
  "/admin/producten": "/admin/products",
  "/admin/bestellingen": "/admin/orders",
  "/admin/instellingen": "/admin/settings",
  "/admin/auditlog": "/admin/audit-log",
};

export function stripLocalePrefix(pathname: string): {
  locale: Locale;
  pathname: string;
} {
  if (pathname === "/nl" || pathname.startsWith("/nl/")) {
    const stripped = pathname.slice(3) || "/";
    return { locale: "nl", pathname: stripped };
  }
  return { locale: defaultLocale, pathname };
}

export function withLocale(pathname: string, locale: Locale): string {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (locale === defaultLocale) {
    return normalized === "" ? "/" : normalized;
  }
  if (normalized === "/") return `/${locale}`;
  return `/${locale}${normalized}`;
}
