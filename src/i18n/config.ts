export const locales = ["nl", "en"] as const;
export type Locale = (typeof locales)[number];

/** Dutch is the commercial/canonical default for vdbdigital.nl. */
export const defaultLocale: Locale = "nl";

/** Expandable later: de | fr | es | sq */
export const localeLabels: Record<Locale, string> = {
  nl: "Nederlands",
  en: "English",
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/**
 * Canonical routing:
 * - Dutch: bare path (`/`, `/solutions`, `/website-laten-maken`)
 * - English: `/en/...`
 * - Legacy Dutch `/nl/...` is parsed as NL and canonicalized by middleware.
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
  accountDeletion: "/account-deletion",
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

/** Historic path aliases → current route shape. Locale is preserved by middleware. */
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
  if (pathname === "/en" || pathname.startsWith("/en/")) {
    const stripped = pathname.slice(3) || "/";
    return { locale: "en", pathname: stripped };
  }
  if (pathname === "/nl" || pathname.startsWith("/nl/")) {
    const stripped = pathname.slice(3) || "/";
    return { locale: "nl", pathname: stripped };
  }
  return { locale: defaultLocale, pathname };
}

export function withLocale(pathname: string, locale: Locale): string {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (locale === "nl") return normalized || "/";
  if (normalized === "/") return "/en";
  return `/en${normalized}`;
}
