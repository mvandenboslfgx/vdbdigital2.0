"use client";

import { useState } from "react";
import { useConsent } from "./consent-provider";
import { useI18n } from "@/i18n/provider";
import { LocaleLink } from "@/i18n/locale-link";
import { Button } from "@/components/ui/button";
import { paths } from "@/i18n/config";

export function CookieBanner() {
  const { showBanner, acceptAll, rejectAll, savePreferences, setShowBanner } =
    useConsent();
  const { t } = useI18n();
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  if (!showBanner) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-title"
      aria-describedby="cookie-desc"
      className="fixed inset-x-0 bottom-0 z-50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6"
    >
      <div data-surface="dark" className="mx-auto max-w-2xl surface-card p-5 sm:p-6 shadow-2xl">
        <h2 id="cookie-title" className="text-h3 mb-2">
          {t("cookies.title")}
        </h2>
        <p id="cookie-desc" className="text-small text-muted mb-4">
          {t("cookies.body")}{" "}
          <LocaleLink href={paths.cookies} className="text-primary underline">
            {t("cookies.more")}
          </LocaleLink>
        </p>

        {showDetails && (
          <div className="space-y-3 mb-4 border-t border-border pt-4">
            <label className="flex items-center gap-3 text-small">
              <input type="checkbox" checked disabled className="rounded" />
              <span>
                <strong>{t("cookies.necessary")}</strong> — {t("cookies.necessaryBody")}
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
                <strong>{t("cookies.analytics")}</strong>
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
                <strong>{t("cookies.marketing")}</strong>
              </span>
            </label>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={acceptAll} className="flex-1">
            {t("cookies.acceptAll")}
          </Button>
          <Button variant="outline" onClick={rejectAll} className="flex-1">
            {t("cookies.rejectAll")}
          </Button>
          {!showDetails ? (
            <Button
              variant="ghost"
              onClick={() => setShowDetails(true)}
              className="flex-1"
            >
              {t("cookies.customize")}
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={() => {
                savePreferences({ functional: false, analytics, marketing });
                setShowBanner(false);
              }}
              className="flex-1"
            >
              {t("cookies.save")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
