import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/portal/empty-state";
import { formatEuro, listPortalQuotes } from "@/server/repositories/portal";
import { QUOTE_STATUS_NL, labelNl } from "@/lib/portal/labels";

export const metadata: Metadata = {
  title: "Offertes",
  robots: { index: false },
};

export default async function PortalQuotesPage() {
  const { quotes } = await listPortalQuotes();

  return (
    <div className="space-y-6">
      <h1 className="text-h1">Offertes</h1>
      {quotes.length === 0 ? (
        <EmptyState
          title="Geen offertes"
          description="Er zijn nog geen offertes gedeeld met jouw organisatie."
        />
      ) : (
        <ul className="space-y-3">
          {quotes.map((q) => (
            <li key={q.id}>
              <Link
                href={`/portal/offertes/${q.id}`}
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
                      {labelNl(QUOTE_STATUS_NL, q.status)}
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
