import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPortalQuote } from "@/server/repositories/portal";
import { QuoteResponseForm } from "@/components/portal/quote-response-form";
import { hasCustomerPermission } from "@/lib/auth/customer-permissions";
import { isQuoteExpired } from "@/lib/commerce/quote-money";

export const metadata: Metadata = {
  title: "Offerte afwijzen",
  robots: { index: false },
};

export default async function PortalQuoteDeclinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { quote, ctx } = await getPortalQuote(id);
  if (!quote) notFound();

  if (
    !hasCustomerPermission(ctx.customerRole, "portal.quotes.decline") ||
    isQuoteExpired(quote.valid_until) ||
    (quote.status !== "SENT" && quote.status !== "VIEWED")
  ) {
    redirect(`/portal/offertes/${id}`);
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <Link
          href={`/portal/offertes/${id}`}
          className="text-small text-primary hover:underline"
        >
          ← Offerte
        </Link>
        <h1 className="text-h1 mt-2">Offerte afwijzen</h1>
        <p className="text-muted text-small mt-2">
          Je wijst offerte {quote.quote_number} af. Daarna is accepteren alleen
          mogelijk via een nieuwe verzonden versie.
        </p>
      </div>
      <QuoteResponseForm quoteId={quote.id} mode="decline" />
    </div>
  );
}
