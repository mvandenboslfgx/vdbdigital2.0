/**
 * Central promotion placement policy.
 *
 * Every banner or promotion block must resolve against this policy before rendering.
 * No scattered string checks in individual components.
 *
 * Route matching uses pathname WITHOUT locale prefix (i18n is stripped by middleware).
 * Example: "/nl/contact" → pathname "/contact".
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PromotionPlacementId =
  | "knowledge_article_inline"
  | "knowledge_article_end"
  | "case_study_end"
  | "service_cross_sell"
  | "app_download_banner";

export type PromotionType = "OWN_SERVICE" | "AFFILIATE" | "SPONSORED";

export interface PlacementPolicy {
  id: PromotionPlacementId;
  /** Promotion types allowed at this placement. */
  allowedTypes: PromotionType[];
  /** Max simultaneous promotions at this placement per page render. */
  maxPerPage: number;
  /** Route prefixes/exact paths where this placement is ALLOWED. Empty = any non-excluded route. */
  allowedRoutes: string[];
  /** Route prefixes where this placement is NEVER shown regardless of other config. */
  excludedRoutes: string[];
  /** Requires analytics consent before firing events. */
  requiresAnalyticsConsent: boolean;
  /** Notes for documentation purposes. */
  notes: string;
}

// ---------------------------------------------------------------------------
// Route Exclusion Lists — single source of truth
// ---------------------------------------------------------------------------

/**
 * Route prefixes/exact paths that are GLOBALLY excluded from ALL promotions
 * and the app download banner.
 *
 * Matching is done against the path WITHOUT locale prefix:
 *   "/nl/checkout/betaling" → "/checkout/betaling"
 *
 * Rules:
 *  - Exact path matches on entries without trailing slash.
 *  - Prefix matches on entries ending with "/".
 */
export const GLOBALLY_EXCLUDED_ROUTES: readonly string[] = [
  // Authentication flows
  "/inloggen",
  "/account-aanmaken",
  "/account-activeren",
  "/e-mail-bevestigen",
  "/uitloggen",
  "/geen-toegang",
  "/uitnodiging",
  "/wachtwoord-herstellen",
  "/wachtwoord-vergeten",
  "/auth/",
  // Checkout / payment flows
  "/checkout",
  "/checkout/",
  "/betaling",
  "/betaling/",
  "/payment",
  "/payment/",
  "/cart",
  // Customer portal
  "/portal/",
  // Admin panel
  "/admin/",
  // API routes
  "/api/",
  // Legal / privacy / cookie preference screens
  "/privacy",
  "/cookies",
  "/terms",
  "/refund-policy",
  // Error states
  "/_error",
  "/404",
  "/500",
] as const;

/**
 * Routes where the app download banner is additionally excluded
 * (on top of globally excluded routes).
 */
export const APP_BANNER_EXCLUDED_ROUTES: readonly string[] = [
  "/quote",
  "/support",
  "/contact",
] as const;

// ---------------------------------------------------------------------------
// Placement Policies
// ---------------------------------------------------------------------------

export const PLACEMENT_POLICIES: Record<PromotionPlacementId, PlacementPolicy> =
  {
    app_download_banner: {
      id: "app_download_banner",
      allowedTypes: ["OWN_SERVICE"],
      maxPerPage: 1,
      allowedRoutes: [],
      excludedRoutes: [
        ...GLOBALLY_EXCLUDED_ROUTES,
        ...APP_BANNER_EXCLUDED_ROUTES,
      ],
      requiresAnalyticsConsent: false,
      notes:
        "App download banner shown on public marketing/content pages on mobile viewport only. " +
        "Uses functional localStorage dismiss (no analytics consent required for dismiss). " +
        "Analytics events only fire with analytics consent.",
    },

    knowledge_article_inline: {
      id: "knowledge_article_inline",
      allowedTypes: ["OWN_SERVICE"],
      maxPerPage: 1,
      allowedRoutes: ["/support/", "/solutions/"],
      excludedRoutes: [...GLOBALLY_EXCLUDED_ROUTES],
      requiresAnalyticsConsent: true,
      notes: "Single inline promo block within long knowledge base articles.",
    },

    knowledge_article_end: {
      id: "knowledge_article_end",
      allowedTypes: ["OWN_SERVICE", "AFFILIATE"],
      maxPerPage: 1,
      allowedRoutes: ["/support/", "/solutions/"],
      excludedRoutes: [...GLOBALLY_EXCLUDED_ROUTES],
      requiresAnalyticsConsent: true,
      notes:
        "End-of-article promotion. Max 2 combined with knowledge_article_inline, well separated.",
    },

    case_study_end: {
      id: "case_study_end",
      allowedTypes: ["OWN_SERVICE", "AFFILIATE"],
      maxPerPage: 1,
      allowedRoutes: ["/cases/", "/cases"],
      excludedRoutes: [...GLOBALLY_EXCLUDED_ROUTES],
      requiresAnalyticsConsent: true,
      notes: "Single promotion block below case study content.",
    },

    service_cross_sell: {
      id: "service_cross_sell",
      allowedTypes: ["OWN_SERVICE"],
      maxPerPage: 1,
      allowedRoutes: ["/solutions/"],
      excludedRoutes: [...GLOBALLY_EXCLUDED_ROUTES],
      requiresAnalyticsConsent: true,
      notes:
        "Related service cross-sell. Only OWN_SERVICE. Never above main content. " +
        "Never between form fields.",
    },
  };

// ---------------------------------------------------------------------------
// Policy evaluation helpers
// ---------------------------------------------------------------------------

/**
 * Strips the locale prefix from a pathname.
 * "/nl/solutions/websites" → "/solutions/websites"
 */
export function stripLocaleFromPathname(pathname: string): string {
  if (pathname === "/nl" || pathname.startsWith("/nl/")) {
    return pathname.slice(3) || "/";
  }
  return pathname;
}

/**
 * Returns true when the given (de-prefixed) pathname matches any entry in the list.
 * An entry ending in "/" is treated as a prefix; otherwise exact match.
 */
export function matchesRouteList(
  pathname: string,
  routes: readonly string[],
): boolean {
  const p = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return routes.some((route) =>
    route.endsWith("/")
      ? p === route.slice(0, -1) || p.startsWith(route)
      : p === route,
  );
}

/**
 * Returns true when the given pathname is globally excluded from all promotions.
 */
export function isGloballyExcluded(rawPathname: string): boolean {
  const pathname = stripLocaleFromPathname(rawPathname);
  return matchesRouteList(pathname, GLOBALLY_EXCLUDED_ROUTES);
}

/**
 * Returns true when the app download banner is allowed on this pathname.
 * Combines global exclusions with banner-specific exclusions.
 */
export function isAppBannerAllowedOnRoute(rawPathname: string): boolean {
  const pathname = stripLocaleFromPathname(rawPathname);
  const policy = PLACEMENT_POLICIES.app_download_banner;
  return !matchesRouteList(pathname, policy.excludedRoutes);
}

/**
 * Returns true when a promotion placement is allowed on this pathname.
 */
export function isPlacementAllowedOnRoute(
  placementId: PromotionPlacementId,
  rawPathname: string,
): boolean {
  const pathname = stripLocaleFromPathname(rawPathname);
  const policy = PLACEMENT_POLICIES[placementId];
  if (matchesRouteList(pathname, policy.excludedRoutes)) return false;
  if (policy.allowedRoutes.length === 0) return true;
  return matchesRouteList(pathname, policy.allowedRoutes);
}
