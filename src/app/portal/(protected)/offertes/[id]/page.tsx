import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/container";
import { formatEuro, getPortalQuote } from "@/server/repositories/portal";
import { QUOTE_STATUS_NL, labelNl } from "@/lib/portal/labels";
import { QuoteResponseForm } from "@/components/portal/quote-response-form";
import { hasCustomerPermission } from "@/lib/auth/customer-permissions";
import { isQuoteExpired } from "@/lib/commerce/quote-money";

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
  const { quote, items, ctx } = await getPortalQuote(id);
  if (!quote) notFound();

  const expired = isQuoteExpired(quote.valid_until);
  const canRespond =
    !expired &&
    (quote.status === "SENT" || quote.status === "VIEWED") &&
    (hasCustomerPermission(ctx.customerRole, "portal.quotes.accept") ||
      hasCustomerPermission(ctx.customerRole, "portal.quotes.decline"));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/portal/offertes"
          className="text-small text-primary hover:underline"
        >
          ← Offertes
        </Link>
        <h1 className="text-h1 mt-2">{quote.title}</h1>
        <p className="text-muted">
          {quote.quote_number} · {labelNl(QUOTE_STATUS_NL, quote.status)}
          {expired ? " · Verlopen" : ""}
        </p>
      </div>

      <Card className="space-y-3">
        {quote.description ? (
          <p className="text-small whitespace-pre-wrap">{quote.description}</p>
        ) : null}

        {items.length > 0 ? (
          <ul className="space-y-2 text-small border-t border-border pt-3">
            {items.map(
              (item: {
                id: string;
                title: string;
                quantity: number;
                total_cents: number;
                is_optional: boolean;
              }) => (
                <li key={item.id} className="flex justify-between gap-3">
                  <span>
                    {item.title} ({item.quantity}×)
                    {item.is_optional ? " · optioneel" : ""}
                  </span>
                  <span>{formatEuro(item.total_cents, quote.currency)}</span>
                </li>
              ),
            )}
          </ul>
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
          <div>
            <dt className="text-muted">Voorwaardenversie</dt>
            <dd>{quote.terms_version || "—"}</dd>
          </div>
        </dl>
        <p className="text-small text-muted border-t border-border pt-3">
          Digitale offerteacceptatie start geen betaling en maakt geen factuur
          aan. Checkout blijft uitgeschakeld.
        </p>
      </Card>

      {canRespond ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3 text-small">
            <Link
              href={`/portal/offertes/${id}/accepteren`}
              className="text-primary hover:underline"
            >
              Naar acceptatiepagina
            </Link>
            <Link
              href={`/portal/offertes/${id}/afwijzen`}
              className="text-primary hover:underline"
            >
              Naar afwijspagina
            </Link>
          </div>
          <QuoteResponseForm quoteId={quote.id} />
        </div>
      ) : null}
    </div>
  );
}
