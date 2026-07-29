/**
 * Runtime feature flags. Fail closed: checkout stays OFF unless explicitly enabled.
 *
 * Default (missing / any value other than the string "true"): OFF
 * Recommended for all environments during/after P0.5:
 *
 *   CHECKOUT_ENABLED=false
 *
 * Never enable until release-gate reports READY and operators approve manually.
 */
export function isDirectCheckoutEnabled(): boolean {
  return process.env.CHECKOUT_ENABLED === "true";
}

// ---------------------------------------------------------------------------
// App Download Banner
// ---------------------------------------------------------------------------

/**
 * Master switch for the app download banner.
 * MUST remain false until:
 *  - the VDB Digital app is publicly available in both stores,
 *  - real App Store / Play Store links are confirmed, and
 *  - the full VDB Digital release checklist has passed.
 *
 * Default: OFF (fail-closed).
 */
export function isAppBannerEnabled(): boolean {
  return process.env.NEXT_PUBLIC_APP_DOWNLOAD_BANNER_ENABLED === "true";
}

/** Deep-link URI to open the app directly (e.g. vdbdigital://). */
export function getAppDeepLinkUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_DEEP_LINK_URL ?? "").trim();
}

/** Google Play Store URL for the VDB Digital app. */
export function getAndroidStoreUrl(): string {
  return (process.env.NEXT_PUBLIC_ANDROID_APP_STORE_URL ?? "").trim();
}

/** Apple App Store URL for the VDB Digital app. */
export function getIosStoreUrl(): string {
  return (process.env.NEXT_PUBLIC_IOS_APP_STORE_URL ?? "").trim();
}

/** Apple App Store numeric ID (used for iOS Smart App Banner meta tag). */
export function getIosAppStoreId(): string {
  return (process.env.NEXT_PUBLIC_IOS_APP_STORE_ID ?? "").trim();
}

/** Delay in ms before the banner appears after page load. Default: 12000. */
export function getAppBannerDelayMs(): number {
  const raw = process.env.NEXT_PUBLIC_APP_BANNER_DELAY_MS;
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 12_000;
}

/** Number of days the banner stays hidden after dismissal. Default: 30. */
export function getAppBannerDismissDays(): number {
  const raw = process.env.NEXT_PUBLIC_APP_BANNER_DISMISS_DAYS;
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
}

/** Storage key version — bump to re-show banner after a major update. */
export function getAppBannerVersion(): string {
  return (process.env.NEXT_PUBLIC_APP_BANNER_VERSION ?? "v1").trim() || "v1";
}

/**
 * Returns true when at least one valid destination exists AND the flag is on.
 * Fail-closed: true flag + zero valid destinations → false.
 */
export function isAppBannerLive(): boolean {
  if (!isAppBannerEnabled()) return false;
  const hasDeep = isValidUrl(getAppDeepLinkUrl());
  const hasAndroid = isValidUrl(getAndroidStoreUrl());
  const hasIos = isValidUrl(getIosStoreUrl());
  return hasDeep || hasAndroid || hasIos;
}

/** Returns true when a valid iOS App Store ID exists and banner is live. */
export function shouldRenderIosSmartBanner(): boolean {
  return isAppBannerLive() && /^\d+$/.test(getIosAppStoreId());
}

// ---------------------------------------------------------------------------
// Monetization / Promotion Foundation
// ---------------------------------------------------------------------------

/**
 * Master switch for promotion blocks (own services, affiliate, sponsored).
 * Default: OFF — only enable after editorial review.
 */
export function isPromotionEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PROMOTION_ENABLED === "true";
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function isValidUrl(value: string): boolean {
  if (!value) return false;
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" ||
      u.protocol === "http:" ||
      u.protocol.endsWith(":")
    );
  } catch {
    return false;
  }
}
