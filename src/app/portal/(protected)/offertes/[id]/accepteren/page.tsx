import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPortalQuote } from "@/server/repositories/portal";
import { QuoteResponseForm } from "@/components/portal/quote-response-form";
import { hasCustomerPermission } from "@/lib/auth/customer-permissions";
import { isQuoteExpired } from "@/lib/commerce/quote-money";

export const metadata: Metadata = {
  title: "Offerte accepteren",
  robots: { index: false },
};

export default async function PortalQuoteAcceptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { quote, ctx } = await getPortalQuote(id);
  if (!quote) notFound();

  if (
    !hasCustomerPermission(ctx.customerRole, "portal.quotes.accept") ||
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
        <h1 className="text-h1 mt-2">Digitale offerteacceptatie</h1>
        <p className="text-muted text-small mt-2">
          Je accepteert offerte {quote.quote_number} onder voorwaardenversie{" "}
          {quote.terms_version || "—"}. Dit is geen gekwalificeerde elektronische
          handtekening en start geen betaling.
        </p>
      </div>
      <p className="text-small text-muted">
        Voorwaardenversie: {quote.terms_version || "—"}
      </p>
      <QuoteResponseForm quoteId={quote.id} mode="accept" />
    </div>
  );
}
