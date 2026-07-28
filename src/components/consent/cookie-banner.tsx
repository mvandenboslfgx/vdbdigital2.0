"use client";

import { useEffect, useState } from "react";
import { useConsent } from "./consent-provider";
import { LocaleLink } from "@/i18n/locale-link";
import { Button } from "@/components/ui/button";
import { paths } from "@/i18n/config";

export type CookieBannerLabels = {
  title: string;
  shortBody: string;
  more: string;
  necessary: string;
  necessaryBody: string;
  analytics: string;
  marketing: string;
  acceptAll: string;
  rejectAll: string;
  customize: string;
  save: string;
};

export function CookieBanner(labels: CookieBannerLabels) {
  const { showBanner, acceptAll, rejectAll, savePreferences, setShowBanner } =
    useConsent();
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  // Defer paint until after hero LCP — banner must not become LCP or shift layout.
  const [readyToPaint, setReadyToPaint] = useState(false);

  useEffect(() => {
    if (!showBanner) return;
    let cancelled = false;
    let timeoutId = 0;
    let idleId = 0;

    const reveal = () => {
      if (!cancelled) setReadyToPaint(true);
    };

    const schedule = () => {
      if (typeof window.requestIdleCallback === "function") {
        idleId = window.requestIdleCallback(reveal, { timeout: 8000 });
      } else {
        timeoutId = window.setTimeout(reveal, 8000);
      }
    };

    if (document.readyState === "complete") {
      schedule();
    } else {
      window.addEventListener("load", schedule, { once: true });
      timeoutId = window.setTimeout(schedule, 8500);
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", schedule);
      window.clearTimeout(timeoutId);
      if (idleId && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleId);
      }
    };
  }, [showBanner]);

  if (!showBanner || !readyToPaint) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-title"
      aria-describedby="cookie-desc"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4"
    >
      <div
        data-surface="dark"
        className="pointer-events-auto mx-auto max-w-sm border border-border bg-surface p-3 shadow-lg"
      >
        <h2 id="cookie-title" className="text-sm font-semibold mb-1">
          {labels.title}
        </h2>
        <p id="cookie-desc" className="text-xs text-muted mb-3 leading-snug">
          {labels.shortBody}{" "}
          <LocaleLink href={paths.cookies} className="text-primary underline">
            {labels.more}
          </LocaleLink>
        </p>

        {showDetails && (
          <div className="space-y-3 mb-4 border-t border-border pt-4">
            <label className="flex items-center gap-3 text-small">
              <input type="checkbox" checked disabled className="rounded" />
              <span>
                <strong>{labels.necessary}</strong> — {labels.necessaryBody}
              </span>
            </label>
            <label className="flex items-center gap-3 text-small">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="rounded"
              />
              <span>
                <strong>{labels.analytics}</strong>
              </span>
            </label>
            <label className="flex items-center gap-3 text-small">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
                className="rounded"
              />
              <span>
                <strong>{labels.marketing}</strong>
              </span>
            </label>
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={acceptAll} className="flex-1 min-h-11">
            {labels.acceptAll}
          </Button>
          <Button variant="outline" onClick={rejectAll} className="flex-1 min-h-11">
            {labels.rejectAll}
          </Button>
          {!showDetails ? (
            <Button
              variant="ghost"
              onClick={() => setShowDetails(true)}
              className="flex-1 min-h-11"
            >
              {labels.customize}
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={() => {
                savePreferences({ functional: false, analytics, marketing });
                setShowBanner(false);
              }}
              className="flex-1 min-h-11"
            >
              {labels.save}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
