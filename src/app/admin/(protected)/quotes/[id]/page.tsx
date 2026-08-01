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

export const metadata: Metadata = { title: "Offerte", robots: { index: false } };

export default async function AdminQuoteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fout?: string }>;
}) {
  const { t } = await getDictionary();
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
          ← Offertes
        </Link>
        <h1 className="text-h1 mt-2">{quote.title}</h1>
        <p className="text-muted text-small mt-1">
          {quote.quote_number} · {labelFor(t, QUOTE_STATUS_KEYS, quote.status)} ·{" "}
          {org?.trade_name || org?.legal_name}
        </p>
      </div>

      {fout ? (
        <p className="text-sm text-red-600" role="alert">
          Actie mislukt ({fout}). Controleer status, voorwaarden en versie.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {["DRAFT", "IN_REVIEW", "READY"].includes(quote.status) ? (
          <Link
            href={`/admin/quotes/${quote.id}/edit`}
            className="min-h-11 inline-flex items-center px-4 rounded-lg border border-border text-sm"
          >
            Bewerken
          </Link>
        ) : null}
        <Link
          href={`/admin/quotes/${quote.id}/preview`}
          className="min-h-11 inline-flex items-center px-4 rounded-lg border border-border text-sm"
        >
          Preview
        </Link>
        <Link
          href={`/admin/quotes/${quote.id}/versions`}
          className="min-h-11 inline-flex items-center px-4 rounded-lg border border-border text-sm"
        >
          Versies
        </Link>
      </div>

      <Card>
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
          <div>
            <dt className="text-muted">Voorwaarden</dt>
            <dd>{quote.terms_version || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">Geldig tot</dt>
            <dd>
              {quote.valid_until
                ? new Date(quote.valid_until).toLocaleDateString("nl-NL")
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Verzonden</dt>
            <dd>
              {quote.sent_at
                ? new Date(quote.sent_at).toLocaleString("nl-NL")
                : "—"}
            </dd>
          </div>
        </dl>
      </Card>

      <section>
        <h2 className="text-h3 mb-3">Regels</h2>
        {items.length === 0 ? (
          <p className="text-muted text-small">Nog geen regels.</p>
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
                    {item.is_optional ? " (optioneel)" : ""} · {item.quantity}×
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
          <h2 className="text-h3 mb-2">Acceptatie</h2>
          <p className="text-small">
            Digitale offerteacceptatie op{" "}
            {new Date(acceptance.accepted_at).toLocaleString("nl-NL")} ·{" "}
            {formatEuro(acceptance.accepted_total_cents, acceptance.accepted_currency)}{" "}
            · voorwaarden {acceptance.accepted_terms_version}
          </p>
          <p className="text-small text-muted mt-2">
            Dit is geen gekwalificeerde elektronische handtekening en start geen
            betaling.
          </p>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-3 border-t border-border pt-4">
        {hasPermission(ctx.role, "quotes.review") &&
        ["DRAFT", "IN_REVIEW"].includes(quote.status) ? (
          <form action={markQuoteReadyAction}>
            <input type="hidden" name="quoteId" value={quote.id} />
            <input type="hidden" name="expectedVersion" value={quote.version} />
            <Button type="submit">Markeer als gereed</Button>
          </form>
        ) : null}
        {hasPermission(ctx.role, "quotes.send") &&
        quote.status === "READY" ? (
          <form action={sendQuoteAction}>
            <input type="hidden" name="quoteId" value={quote.id} />
            <input type="hidden" name="expectedVersion" value={quote.version} />
            <Button type="submit">Verzenden</Button>
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
              placeholder="Reden intrekking"
              className="min-h-11 px-3 rounded-lg border border-border text-sm"
            />
            <Button type="submit" variant="outline">
              Intrekken
            </Button>
          </form>
        ) : null}
        {hasPermission(ctx.role, "invoices.create") &&
        quote.status === "ACCEPTED" ? (
          <form action={createInvoiceFromAcceptedQuoteAction}>
            <input type="hidden" name="quoteId" value={quote.id} />
            <Button type="submit" variant="outline">
              Factuurconcept maken
            </Button>
          </form>
        ) : null}
      </div>

      <p className="text-small text-muted">
        Versies in snapshot: {versions.length}. PDF-generatie volgt later; preview
        is printbare HTML zonder nep-PDF.
      </p>
    </div>
  );
}
