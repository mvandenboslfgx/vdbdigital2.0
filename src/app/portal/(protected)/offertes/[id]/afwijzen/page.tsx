import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPortalQuote } from "@/server/repositories/portal";
import { QuoteResponseForm } from "@/components/portal/quote-response-form";
import { quoteResponseLabels } from "@/lib/portal/form-labels";
import { hasCustomerPermission } from "@/lib/auth/customer-permissions";
import { isQuoteExpired } from "@/lib/commerce/quote-money";
import { getDictionary } from "@/i18n/get-dictionary";

export const metadata: Metadata = {
  title: "Offerte afwijzen",
  robots: { index: false },
};

export default async function PortalQuoteDeclinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t } = await getDictionary();
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
          {t("portal.quoteDeclinePage.backLink")}
        </Link>
        <h1 className="text-h1 mt-2">{t("portal.quoteDeclinePage.title")}</h1>
        <p className="text-muted text-small mt-2">
          {t("portal.quoteDeclinePage.intro", { number: quote.quote_number })}
        </p>
      </div>
      <QuoteResponseForm
        quoteId={quote.id}
        mode="decline"
        labels={quoteResponseLabels(t)}
      />
    </div>
  );
}
