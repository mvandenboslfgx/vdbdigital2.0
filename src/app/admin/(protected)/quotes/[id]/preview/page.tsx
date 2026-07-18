import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminQuote } from "@/server/repositories/admin-quotes";
import { formatEuro } from "@/server/repositories/portal";

export const metadata: Metadata = {
  title: "Offerte preview",
  robots: { index: false },
};

/** Print-optimized HTML preview — no fake PDF stored. */
export default async function AdminQuotePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getAdminQuote(id);
  if (!bundle) notFound();
  const { quote, items } = bundle;
  const org = Array.isArray(quote.organization)
    ? quote.organization[0]
    : quote.organization;

  return (
    <div className="mx-auto max-w-3xl space-y-6 print:max-w-none">
      <div className="print:hidden">
        <Link
          href={`/admin/quotes/${id}`}
          className="text-small text-primary hover:underline"
        >
          ← Offerte
        </Link>
      </div>
      <article className="rounded-xl border border-border p-8 space-y-6 bg-white text-black">
        <header>
          <p className="text-sm text-neutral-600">VDB Digital</p>
          <h1 className="text-2xl font-semibold mt-2">{quote.title}</h1>
          <p className="text-sm mt-1">
            {quote.quote_number} · voor {org?.legal_name}
          </p>
        </header>
        {quote.description ? (
          <p className="text-sm whitespace-pre-wrap">{quote.description}</p>
        ) : null}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Omschrijving</th>
              <th className="text-right py-2">Bedrag</th>
            </tr>
          </thead>
          <tbody>
            {items.map(
              (item: {
                id: string;
                title: string;
                quantity: number;
                total_cents: number;
                is_optional: boolean;
              }) => (
                <tr key={item.id} className="border-b border-neutral-200">
                  <td className="py-2">
                    {item.title} ({item.quantity}×)
                    {item.is_optional ? " — optioneel" : ""}
                  </td>
                  <td className="py-2 text-right">
                    {formatEuro(item.total_cents, quote.currency)}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
        <dl className="text-sm space-y-1">
          <div className="flex justify-between">
            <dt>Subtotaal</dt>
            <dd>{formatEuro(quote.subtotal_cents, quote.currency)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>BTW</dt>
            <dd>{formatEuro(quote.vat_cents, quote.currency)}</dd>
          </div>
          <div className="flex justify-between font-semibold text-base">
            <dt>Totaal</dt>
            <dd>{formatEuro(quote.total_cents, quote.currency)}</dd>
          </div>
        </dl>
        <footer className="text-xs text-neutral-600 border-t pt-4 space-y-1">
          <p>Voorwaardenversie: {quote.terms_version || "—"}</p>
          <p>
            Geldig tot:{" "}
            {quote.valid_until
              ? new Date(quote.valid_until).toLocaleDateString("nl-NL")
              : "—"}
          </p>
          <p>
            Dit is een offertepreview. Digitale offerteacceptatie start geen
            betaling.
          </p>
        </footer>
      </article>
    </div>
  );
}
