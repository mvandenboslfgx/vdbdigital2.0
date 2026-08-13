import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/container";
import { formatEuro, getPortalQuote } from "@/server/repositories/portal";
import { QUOTE_STATUS_KEYS, labelFor } from "@/lib/portal/labels";
import { getDictionary } from "@/i18n/get-dictionary";
import { formatDate } from "@/i18n/format-date";
import { withLocale } from "@/i18n/config";
import { QuoteResponseForm } from "@/components/portal/quote-response-form";
import { quoteResponseLabels } from "@/lib/portal/form-labels";
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
  const { t, locale } = await getDictionary();
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
          href={withLocale("/portal/offertes", locale)}
          className="text-small text-primary hover:underline"
        >
          {t("portal.quotesPage.backToQuotes")}
        </Link>
        <h1 className="text-h1 mt-2">{quote.title}</h1>
        <p className="text-muted">
          {quote.quote_number} · {labelFor(t, QUOTE_STATUS_KEYS, quote.status)}
          {expired ? t("portal.quotesPage.expiredSuffix") : ""}
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
                    {item.is_optional
                      ? t("portal.quotesPage.optionalSuffix")
                      : ""}
                  </span>
                  <span>{formatEuro(item.total_cents, quote.currency)}</span>
                </li>
              ),
            )}
          </ul>
        ) : null}

        <dl className="grid sm:grid-cols-2 gap-3 text-small">
          <div>
            <dt className="text-muted">{t("portal.quotesPage.subtotal")}</dt>
            <dd>{formatEuro(quote.subtotal_cents, quote.currency)}</dd>
          </div>
          <div>
            <dt className="text-muted">{t("portal.quotesPage.vat")}</dt>
            <dd>{formatEuro(quote.vat_cents, quote.currency)}</dd>
          </div>
          <div>
            <dt className="text-muted">{t("portal.quotesPage.total")}</dt>
            <dd className="font-semibold text-lg">
              {formatEuro(quote.total_cents, quote.currency)}
            </dd>
          </div>
          {quote.valid_until ? (
            <div>
              <dt className="text-muted">
                {t("portal.quotesPage.validUntil")}
              </dt>
              <dd>{formatDate(quote.valid_until, locale)}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-muted">{t("portal.quotesPage.termsVersion")}</dt>
            <dd>{quote.terms_version || "—"}</dd>
          </div>
        </dl>
        <p className="text-small text-muted border-t border-border pt-3">
          {t("portal.quotesPage.acceptanceNote")}
        </p>
      </Card>

      {canRespond ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3 text-small">
            <Link
              href={withLocale(`/portal/offertes/${id}/accepteren`, locale)}
              className="text-primary hover:underline"
            >
              {t("portal.quotesPage.goToAccept")}
            </Link>
            <Link
              href={withLocale(`/portal/offertes/${id}/afwijzen`, locale)}
              className="text-primary hover:underline"
            >
              {t("portal.quotesPage.goToDecline")}
            </Link>
          </div>
          <QuoteResponseForm
            quoteId={quote.id}
            labels={quoteResponseLabels(t)}
          />
        </div>
      ) : null}
    </div>
  );
}
