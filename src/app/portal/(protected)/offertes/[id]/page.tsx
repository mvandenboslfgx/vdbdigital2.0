import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/container";
import { formatEuro, getPortalQuote } from "@/server/repositories/portal";
import { QUOTE_STATUS_NL, labelNl } from "@/lib/portal/labels";
import { QuoteResponseForm } from "@/components/portal/quote-response-form";

export const metadata: Metadata = {
  title: "Offerte",
  robots: { index: false },
};

export default async function PortalQuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { quote } = await getPortalQuote(id);
  if (!quote) notFound();

  const canRespond = quote.status === "SENT" || quote.status === "VIEWED";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/portal/offertes" className="text-small text-primary hover:underline">
          ← Offertes
        </Link>
        <h1 className="text-h1 mt-2">{quote.title}</h1>
        <p className="text-muted">
          {quote.quote_number} · {labelNl(QUOTE_STATUS_NL, quote.status)}
        </p>
      </div>

      <Card className="space-y-3">
        {quote.description ? (
          <p className="text-small whitespace-pre-wrap">{quote.description}</p>
        ) : null}
        <dl className="grid sm:grid-cols-2 gap-3 text-small">
          <div>
            <dt className="text-muted">Subtotaal</dt>
            <dd>{formatEuro(quote.subtotal_cents, quote.currency)}</dd>
          </div>
          <div>
            <dt className="text-muted">BTW</dt>
            <dd>{formatEuro(quote.vat_cents, quote.currency)}</dd>
          </div>
          <div>
            <dt className="text-muted">Totaal</dt>
            <dd className="font-semibold text-lg">
              {formatEuro(quote.total_cents, quote.currency)}
            </dd>
          </div>
          {quote.valid_until ? (
            <div>
              <dt className="text-muted">Geldig tot</dt>
              <dd>{new Date(quote.valid_until).toLocaleDateString("nl-NL")}</dd>
            </div>
          ) : null}
        </dl>
        <p className="text-small text-muted border-t border-border pt-3">
          Acceptatie start geen betaling. Checkout blijft uitgeschakeld.
        </p>
      </Card>

      {canRespond ? <QuoteResponseForm quoteId={quote.id} /> : null}
    </div>
  );
}
