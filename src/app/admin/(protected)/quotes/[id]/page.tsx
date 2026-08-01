import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { getAdminQuote } from "@/server/repositories/admin-quotes";
import { formatEuro } from "@/server/repositories/portal";
import { QUOTE_STATUS_KEYS, labelFor } from "@/lib/portal/labels";
import { getDictionary } from "@/i18n/get-dictionary";
import {
  markQuoteReadyAction,
  sendQuoteAction,
  withdrawQuoteAction,
} from "@/server/actions/quote-actions";
import { createInvoiceFromAcceptedQuoteAction } from "@/server/actions/invoice-actions";
import { hasPermission } from "@/lib/auth/permissions";
import { formatDate, formatDateTime } from "@/i18n/format-date";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return {
    title: t("admin.page.quotes.detailTitle"),
    robots: { index: false },
  };
}

export default async function AdminQuoteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fout?: string }>;
}) {
  const { t, locale } = await getDictionary();
  const { id } = await params;
  const { fout } = await searchParams;
  const bundle = await getAdminQuote(id);
  if (!bundle) notFound();

  const { quote, items, versions, acceptance, ctx } = bundle;
  const org = Array.isArray(quote.organization)
    ? quote.organization[0]
    : quote.organization;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/quotes" className="text-small text-primary hover:underline">
          {t("admin.page.quotes.backToList")}
        </Link>
        <h1 className="text-h1 mt-2">{quote.title}</h1>
        <p className="text-muted text-small mt-1">
          {quote.quote_number} · {labelFor(t, QUOTE_STATUS_KEYS, quote.status)} ·{" "}
          {org?.trade_name || org?.legal_name}
        </p>
      </div>

      {fout ? (
        <p className="text-sm text-red-600" role="alert">
          {t("admin.page.quotes.actionFailed", { code: fout })}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {["DRAFT", "IN_REVIEW", "READY"].includes(quote.status) ? (
          <Link
            href={`/admin/quotes/${quote.id}/edit`}
            className="min-h-11 inline-flex items-center px-4 rounded-lg border border-border text-sm"
          >
            {t("admin.common.edit")}
          </Link>
        ) : null}
        <Link
          href={`/admin/quotes/${quote.id}/preview`}
          className="min-h-11 inline-flex items-center px-4 rounded-lg border border-border text-sm"
        >
          {t("admin.common.preview")}
        </Link>
        <Link
          href={`/admin/quotes/${quote.id}/versions`}
          className="min-h-11 inline-flex items-center px-4 rounded-lg border border-border text-sm"
        >
          {t("admin.page.quotes.versionsHeading")}
        </Link>
      </div>

      <Card>
        <dl className="grid sm:grid-cols-2 gap-3 text-small">
          <div>
            <dt className="text-muted">{t("admin.page.quotes.subtotal")}</dt>
            <dd>{formatEuro(quote.subtotal_cents, quote.currency)}</dd>
          </div>
          <div>
            <dt className="text-muted">{t("admin.page.quotes.vat")}</dt>
            <dd>{formatEuro(quote.vat_cents, quote.currency)}</dd>
          </div>
          <div>
            <dt className="text-muted">{t("admin.page.quotes.total")}</dt>
            <dd className="font-semibold text-lg">
              {formatEuro(quote.total_cents, quote.currency)}
            </dd>
          </div>
          <div>
            <dt className="text-muted">{t("admin.page.quotes.terms")}</dt>
            <dd>{quote.terms_version || t("admin.common.empty")}</dd>
          </div>
          <div>
            <dt className="text-muted">{t("admin.page.quotes.validUntil")}</dt>
            <dd>{formatDate(quote.valid_until, locale)}</dd>
          </div>
          <div>
            <dt className="text-muted">{t("admin.page.quotes.sentAt")}</dt>
            <dd>{formatDateTime(quote.sent_at, locale)}</dd>
          </div>
        </dl>
      </Card>

      <section>
        <h2 className="text-h3 mb-3">{t("admin.page.quotes.lines")}</h2>
        {items.length === 0 ? (
          <p className="text-muted text-small">
            {t("admin.page.quotes.noLines")}
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map(
              (item: {
                id: string;
                title: string;
                quantity: number;
                total_cents: number;
                is_optional: boolean;
              }) => (
                <li
                  key={item.id}
                  className="rounded-lg border border-border px-3 py-2 text-small flex justify-between gap-3"
                >
                  <span>
                    {item.title}
                    {item.is_optional
                      ? ` ${t("admin.page.quotes.optionalSuffix")}`
                      : ""}{" "}
                    · {item.quantity}×
                  </span>
                  <span>{formatEuro(item.total_cents, quote.currency)}</span>
                </li>
              ),
            )}
          </ul>
        )}
      </section>

      {acceptance ? (
        <Card>
          <h2 className="text-h3 mb-2">
            {t("admin.page.quotes.acceptanceHeading")}
          </h2>
          <p className="text-small">
            {t("admin.page.quotes.acceptanceLine", {
              date: formatDateTime(acceptance.accepted_at, locale),
              total: formatEuro(
                acceptance.accepted_total_cents,
                acceptance.accepted_currency,
              ),
              terms: acceptance.accepted_terms_version,
            })}
          </p>
          <p className="text-small text-muted mt-2">
            {t("admin.page.quotes.acceptanceNote")}
          </p>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-3 border-t border-border pt-4">
        {hasPermission(ctx.role, "quotes.review") &&
        ["DRAFT", "IN_REVIEW"].includes(quote.status) ? (
          <form action={markQuoteReadyAction}>
            <input type="hidden" name="quoteId" value={quote.id} />
            <input type="hidden" name="expectedVersion" value={quote.version} />
            <Button type="submit">{t("admin.page.quotes.markReady")}</Button>
          </form>
        ) : null}
        {hasPermission(ctx.role, "quotes.send") &&
        quote.status === "READY" ? (
          <form action={sendQuoteAction}>
            <input type="hidden" name="quoteId" value={quote.id} />
            <input type="hidden" name="expectedVersion" value={quote.version} />
            <Button type="submit">{t("admin.page.quotes.send")}</Button>
          </form>
        ) : null}
        {hasPermission(ctx.role, "quotes.withdraw") &&
        ["SENT", "VIEWED", "READY"].includes(quote.status) ? (
          <form action={withdrawQuoteAction} className="flex gap-2 items-end">
            <input type="hidden" name="quoteId" value={quote.id} />
            <input type="hidden" name="expectedVersion" value={quote.version} />
            <input
              name="reason"
              required
              placeholder={t("admin.page.quotes.withdrawReason")}
              className="min-h-11 px-3 rounded-lg border border-border text-sm"
            />
            <Button type="submit" variant="outline">
              {t("admin.page.quotes.withdraw")}
            </Button>
          </form>
        ) : null}
        {hasPermission(ctx.role, "invoices.create") &&
        quote.status === "ACCEPTED" ? (
          <form action={createInvoiceFromAcceptedQuoteAction}>
            <input type="hidden" name="quoteId" value={quote.id} />
            <Button type="submit" variant="outline">
              {t("admin.page.quotes.createInvoiceDraft")}
            </Button>
          </form>
        ) : null}
      </div>

      <p className="text-small text-muted">
        {t("admin.page.quotes.snapshotNote", { count: versions.length })}
      </p>
    </div>
  );
}
