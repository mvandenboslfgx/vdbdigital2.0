import { ServerLocaleLink } from "@/i18n/server-locale-link";
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

/**
 * Server-rendered cookie banner + plain deferred script (no next/script client runtime).
 * Hidden by default; script reveals only when consent is missing (after idle).
 */
export async function CookieBannerServer({
  labels,
  cookiesHref = paths.cookies,
}: {
  labels: CookieBannerLabels;
  cookiesHref?: string;
}) {
  return (
    <>
      <div
        id="vdb-cookie-banner"
        hidden
        aria-hidden="true"
        role="dialog"
        aria-labelledby="cookie-title"
        aria-describedby="cookie-desc"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4"
      >
        <div
          data-surface="dark"
          className="pointer-events-auto mx-auto max-w-sm border border-border bg-surface p-3 shadow-lg"
        >
          <h2 id="cookie-title" className="mb-1 text-sm font-semibold">
            {labels.title}
          </h2>
          <p id="cookie-desc" className="mb-3 text-xs leading-snug text-muted">
            {labels.shortBody}{" "}
            <ServerLocaleLink
              href={cookiesHref}
              className="text-primary underline"
            >
              {labels.more}
            </ServerLocaleLink>
          </p>

          <div
            data-vdb-consent-details
            hidden
            className="mb-4 space-y-3 border-t border-border pt-4"
          >
            <label className="flex items-center gap-3 text-small">
              <input type="checkbox" checked disabled className="rounded" />
              <span>
                <strong>{labels.necessary}</strong> — {labels.necessaryBody}
              </span>
            </label>
            <label className="flex items-center gap-3 text-small">
              <input
                type="checkbox"
                name="vdb-analytics"
                className="rounded"
              />
              <span>{labels.analytics}</span>
            </label>
            <label className="flex items-center gap-3 text-small">
              <input
                type="checkbox"
                name="vdb-marketing"
                className="rounded"
              />
              <span>{labels.marketing}</span>
            </label>
            <button
              type="button"
              data-vdb-consent="save"
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            >
              {labels.save}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              data-vdb-consent="accept"
              className="rounded-md bg-primary px-3 py-2 text-sm text-primary-fg"
            >
              {labels.acceptAll}
            </button>
            <button
              type="button"
              data-vdb-consent="reject"
              className="rounded-md border border-border px-3 py-2 text-sm"
            >
              {labels.rejectAll}
            </button>
            <button
              type="button"
              data-vdb-consent="customize"
              className="rounded-md px-3 py-2 text-sm text-muted underline"
            >
              {labels.customize}
            </button>
          </div>
        </div>
      </div>
      {/* Plain deferred script — avoid next/script client boundary on marketing pages. */}
      <script src="/scripts/vdb-consent.js" defer />
    </>
  );
}
