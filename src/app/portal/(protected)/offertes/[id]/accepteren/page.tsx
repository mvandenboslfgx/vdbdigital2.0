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
  title: "Offerte accepteren",
  robots: { index: false },
};

export default async function PortalQuoteAcceptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t } = await getDictionary();
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

  const termsVersion = quote.terms_version || "—";

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <Link
          href={`/portal/offertes/${id}`}
          className="text-small text-primary hover:underline"
        >
          {t("portal.quoteAcceptPage.backLink")}
        </Link>
        <h1 className="text-h1 mt-2">{t("portal.quoteAcceptPage.title")}</h1>
        <p className="text-muted text-small mt-2">
          {t("portal.quoteAcceptPage.intro", {
            number: quote.quote_number,
            version: termsVersion,
          })}
        </p>
      </div>
      <label className="flex gap-2 text-small items-start">
        <input type="checkbox" required form="accept-form" className="mt-1" />
        {t("portal.quoteAcceptPage.confirmLabel", { version: termsVersion })}
      </label>
      <div id="accept-form">
        <QuoteResponseForm
          quoteId={quote.id}
          mode="accept"
          labels={quoteResponseLabels(t)}
        />
      </div>
    </div>
  );
}
