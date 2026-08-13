import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/portal/empty-state";
import { formatEuro, listPortalQuotes } from "@/server/repositories/portal";
import { QUOTE_STATUS_KEYS, labelFor } from "@/lib/portal/labels";
import { getDictionary } from "@/i18n/get-dictionary";
import { withLocale } from "@/i18n/config";

export const metadata: Metadata = {
  title: "Offertes",
  robots: { index: false },
};

export default async function PortalQuotesPage() {
  const { t, locale } = await getDictionary();
  const { quotes } = await listPortalQuotes();

  return (
    <div className="space-y-6">
      <h1 className="text-h1">{t("portal.quotesPage.title")}</h1>
      {quotes.length === 0 ? (
        <EmptyState
          title={t("portal.quotesPage.emptyTitle")}
          description={t("portal.quotesPage.emptyBody")}
        />
      ) : (
        <ul className="space-y-3">
          {quotes.map((q) => (
            <li key={q.id}>
              <Link
                href={withLocale(`/portal/offertes/${q.id}`, locale)}
                className="block rounded-xl border border-border bg-surface p-5 hover:border-primary"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-medium">{q.title}</p>
                    <p className="text-small text-muted">{q.quote_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatEuro(q.total_cents, q.currency)}
                    </p>
                    <p className="text-small text-muted">
                      {labelFor(t, QUOTE_STATUS_KEYS, q.status)}
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
