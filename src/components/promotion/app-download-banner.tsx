"use client";

/**
 * AppDownloadBanner
 *
 * Premium, non-intrusive mobile-only banner inviting visitors to download / open
 * the VDB Digital app.
 *
 * FEATURE-FLAGGED — renders nothing when `enabled` is false or when no valid
 * destination is configured. Never shown on excluded routes.
 *
 * Behaviour:
 *  - Mobile viewport only (≤767 px).
 *  - Appears after `delayMs` OR after the visitor has scrolled ≥45 % of the page.
 *  - Shown at most once per session; dismissed state persists for `dismissDays` days.
 *  - Dismiss state stored in localStorage (functional, no consent needed).
 *  - Analytics events only fire when analytics consent is present.
 *  - Escape key closes when banner has focus.
 *  - No focus trap. No auto-redirect. No layout shift.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Smartphone } from "lucide-react";
import { cn } from "@/lib/utilities/cn";
import { useConsent } from "@/components/consent/consent-provider";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AppDestinationType =
  "deep_link" | "android_store" | "ios_store" | "none";

export interface AppBannerLabels {
  title: string;
  description: string;
  download: string;
  open: string;
  dismiss: string;
  close: string;
}

export interface AppBannerConfig {
  enabled: boolean;
  deepLinkUrl: string;
  androidStoreUrl: string;
  iosStoreUrl: string;
  delayMs: number;
  dismissDays: number;
  storageKeyVersion: string;
}

interface AppDownloadBannerProps {
  config: AppBannerConfig;
  labels: AppBannerLabels;
  /** Current locale — for analytics only, never used to branch UI logic. */
  locale: string;
  /** Simplified route group label for analytics (e.g. "marketing", "cases"). */
  routeGroup: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY_PREFIX = "vdb_app_banner_dismissed_";
const SESSION_SHOWN_KEY = "vdb_app_banner_shown";
const SCROLL_THRESHOLD = 0.45;
/** ms to wait before checking if deep link opened (no install-detection, just a fallback). */
const DEEP_LINK_FALLBACK_MS = 2000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDismissStorageKey(version: string): string {
  return `${STORAGE_KEY_PREFIX}${version}`;
}

function isDismissed(version: string): boolean {
  try {
    const raw = localStorage.getItem(getDismissStorageKey(version));
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    return Date.now() < ts;
  } catch {
    return false;
  }
}

function saveDismiss(version: string, days: number): void {
  try {
    const expiry = Date.now() + days * 24 * 60 * 60 * 1000;
    localStorage.setItem(getDismissStorageKey(version), String(expiry));
  } catch {
    /* ignore */
  }
}

function wasShownThisSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_SHOWN_KEY) === "1";
  } catch {
    return false;
  }
}

function markShownThisSession(): void {
  try {
    sessionStorage.setItem(SESSION_SHOWN_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** Detect platform without fingerprinting — only for store link routing. */
function detectPlatform(): "ios" | "android" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "other";
}

function resolveDestination(
  platform: ReturnType<typeof detectPlatform>,
  config: AppBannerConfig,
): { type: AppDestinationType; url: string } {
  const hasDeep = Boolean(config.deepLinkUrl);
  const hasAndroid = Boolean(config.androidStoreUrl);
  const hasIos = Boolean(config.iosStoreUrl);

  if (platform === "ios") {
    if (hasDeep) return { type: "deep_link", url: config.deepLinkUrl };
    if (hasIos) return { type: "ios_store", url: config.iosStoreUrl };
    return { type: "none", url: "" };
  }
  if (platform === "android") {
    if (hasDeep) return { type: "deep_link", url: config.deepLinkUrl };
    if (hasAndroid)
      return { type: "android_store", url: config.androidStoreUrl };
    return { type: "none", url: "" };
  }
  // "other" — not a known mobile store platform
  return { type: "none", url: "" };
}

// ---------------------------------------------------------------------------
// Analytics (consent-aware, no PII)
// ---------------------------------------------------------------------------

type BannerEventName =
  | "app_banner_impression"
  | "app_banner_open_click"
  | "app_banner_store_click"
  | "app_banner_dismiss"
  | "app_banner_fallback";

interface BannerEventProps {
  platform: string;
  locale: string;
  routeGroup: string;
  bannerVersion: string;
  destinationType: AppDestinationType;
}

function fireBannerEvent(
  name: BannerEventName,
  props: BannerEventProps,
  hasAnalyticsConsent: boolean,
): void {
  if (!hasAnalyticsConsent) return;
  // Fire via existing analytics layer when available. Currently no third-party
  // tracker is integrated; this hook point is intentionally a no-op until
  // an analytics provider is connected. The consent-gate is already in place.
  if (
    typeof window !== "undefined" &&
    typeof (window as unknown as Record<string, unknown>).gtag === "function"
  ) {
    (window as unknown as { gtag: (...args: unknown[]) => void }).gtag(
      "event",
      name,
      props,
    );
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AppDownloadBanner({
  config,
  labels,
  locale,
  routeGroup,
}: AppDownloadBannerProps) {
  const { hasConsent } = useConsent();
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] =
    useState<ReturnType<typeof detectPlatform>>("other");
  const bannerRef = useRef<HTMLDivElement>(null);
  const analyticsProps = useRef<BannerEventProps>({
    platform: "other",
    locale,
    routeGroup,
    bannerVersion: config.storageKeyVersion,
    destinationType: "none",
  });

  // Resolve destination based on platform — done client-side only.
  const destination = resolveDestination(platform, config);

  const dismiss = useCallback(
    (source: "button" | "escape") => {
      saveDismiss(config.storageKeyVersion, config.dismissDays);
      setVisible(false);
      fireBannerEvent(
        "app_banner_dismiss",
        analyticsProps.current,
        hasConsent("analytics"),
      );
      void source; // parameter reserved for future granularity
    },
    [config.storageKeyVersion, config.dismissDays, hasConsent],
  );

  // Keyboard: Escape closes when focus is inside the banner.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (
        e.key === "Escape" &&
        bannerRef.current?.contains(document.activeElement)
      ) {
        dismiss("escape");
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [dismiss]);

  useEffect(() => {
    // SSR guard + feature-flag guard
    if (!config.enabled) return;

    const detected = detectPlatform();
    setPlatform(detected);
    analyticsProps.current.platform = detected;

    const resolved = resolveDestination(detected, config);
    analyticsProps.current.destinationType = resolved.type;

    // No valid destination → never show
    if (resolved.type === "none") return;

    // Mobile-only: ≤767 px
    if (window.innerWidth >= 768) return;

    // Session + dismiss guards
    if (wasShownThisSession()) return;
    if (isDismissed(config.storageKeyVersion)) return;

    let shown = false;

    function show() {
      if (shown) return;
      shown = true;
      markShownThisSession();
      setVisible(true);
      fireBannerEvent(
        "app_banner_impression",
        analyticsProps.current,
        hasConsent("analytics"),
      );
    }

    // Trigger: time delay
    const timer = setTimeout(show, config.delayMs);

    // Trigger: scroll ≥ 45 %
    function onScroll() {
      const scrolled = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      if (total > 0 && scrolled / total >= SCROLL_THRESHOLD) {
        show();
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [config, hasConsent]);

  // Not visible → render nothing (no DOM node → no layout shift).
  if (!visible || destination.type === "none") return null;

  const ctaLabel =
    destination.type === "deep_link" ? labels.open : labels.download;

  function handleCtaClick() {
    const eventName =
      destination.type === "deep_link"
        ? "app_banner_open_click"
        : "app_banner_store_click";
    fireBannerEvent(eventName, analyticsProps.current, hasConsent("analytics"));

    if (destination.type === "deep_link") {
      // Attempt to open the app; fall back to store after timeout.
      window.location.href = destination.url;
      const platform = analyticsProps.current.platform as
        "ios" | "android" | "other";
      const storeUrl =
        platform === "ios" ? config.iosStoreUrl : config.androidStoreUrl;
      if (storeUrl) {
        setTimeout(() => {
          fireBannerEvent(
            "app_banner_fallback",
            analyticsProps.current,
            hasConsent("analytics"),
          );
          window.open(storeUrl, "_blank", "noopener,noreferrer");
        }, DEEP_LINK_FALLBACK_MS);
      }
    } else {
      window.open(destination.url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div
      ref={bannerRef}
      role="region"
      aria-label={labels.title}
      aria-live="polite"
      className={cn(
        // Position: fixed bottom, respects safe-area on iOS
        "fixed bottom-0 left-0 right-0 z-40",
        "pb-[env(safe-area-inset-bottom,0px)]",
        // Only show on mobile — hidden on sm+ via Tailwind (md = 768 px)
        "md:hidden",
        // Animation — respects reduced motion via CSS
        "vdb-banner-slide-in",
      )}
    >
      <div
        className={cn(
          "mx-3 mb-3 rounded-xl",
          "bg-surface-elevated border border-border",
          "shadow-elevated",
          "flex items-center gap-3 p-3",
        )}
      >
        {/* App icon / logo mark */}
        <div
          className={cn(
            "shrink-0 flex h-11 w-11 items-center justify-center rounded-xl",
            "bg-primary/10 text-primary",
          )}
          aria-hidden="true"
        >
          <Smartphone className="h-5 w-5" />
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-foreground truncate">
            {labels.title}
          </p>
          <p className="mt-0.5 text-xs leading-snug text-muted line-clamp-2">
            {labels.description}
          </p>
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={handleCtaClick}
          className={cn(
            "shrink-0 inline-flex min-h-9 items-center justify-center rounded-lg px-3",
            "bg-primary text-primary-fg text-xs font-semibold",
            "hover:bg-primary-hover active:scale-95",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            "transition-all duration-150",
          )}
        >
          {ctaLabel}
        </button>

        {/* Dismiss */}
        <button
          type="button"
          onClick={() => dismiss("button")}
          aria-label={labels.close}
          className={cn(
            "shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-lg",
            "text-muted hover:text-foreground hover:bg-surface",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            "transition-colors duration-150",
          )}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
