import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/portal/empty-state";
import { listAdminQuotes } from "@/server/repositories/admin-quotes";
import { formatEuro } from "@/server/repositories/portal";
import {
  QUOTE_STATUS_KEYS,
  labelFor,
  labelOptions,
} from "@/lib/portal/labels";
import { getDictionary } from "@/i18n/get-dictionary";

export const metadata: Metadata = { title: "Offertes", robots: { index: false } };

export default async function AdminQuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const { t } = await getDictionary();
  const sp = await searchParams;
  const { quotes, total, error } = await listAdminQuotes({
    q: sp.q,
    status: sp.status,
    page: Number(sp.page || "1") || 1,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-h1">Offertes</h1>
          <p className="text-muted text-small mt-1">
            {total} offerte{total === 1 ? "" : "s"} · geen Mollie / checkout
          </p>
        </div>
        <Link
          href="/admin/quotes/new"
          className="rounded-lg bg-primary text-white px-4 py-2 text-sm min-h-11 inline-flex items-center"
        >
          Nieuwe offerte
        </Link>
      </div>

      <form className="flex flex-wrap gap-3">
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Zoek nummer of titel"
          className="min-h-11 px-3 rounded-lg border border-border bg-background text-sm"
        />
        <select
          name="status"
          defaultValue={sp.status ?? "ALL"}
          className="min-h-11 px-3 rounded-lg border border-border bg-background text-sm"
        >
          <option value="ALL">Alle statussen</option>
          {labelOptions(t, QUOTE_STATUS_KEYS).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button type="submit" className="min-h-11 px-4 rounded-lg border border-border text-sm">
          Filter
        </button>
      </form>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {quotes.length === 0 ? (
        <EmptyState
          title="Nog geen offertes"
          description="Maak een conceptofferte voor een actieve organisatie."
          actionHref="/admin/quotes/new"
          actionLabel="Offerte aanmaken"
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-surface-elevated text-muted text-left">
              <tr>
                <th className="px-3 py-3 font-medium">Nummer</th>
                <th className="px-3 py-3 font-medium">Titel</th>
                <th className="px-3 py-3 font-medium">Organisatie</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Totaal</th>
                <th className="px-3 py-3 font-medium">Geldig tot</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => {
                const org = q.organization as
                  | { legal_name?: string; trade_name?: string }
                  | null
                  | undefined;
                return (
                  <tr key={q.id} className="border-t border-border">
                    <td className="px-3 py-3">
                      <Link
                        href={`/admin/quotes/${q.id}`}
                        className="text-primary hover:underline"
                      >
                        {q.quote_number}
                      </Link>
                    </td>
                    <td className="px-3 py-3">{q.title}</td>
                    <td className="px-3 py-3">
                      {org?.trade_name || org?.legal_name || "—"}
                    </td>
                    <td className="px-3 py-3">
                      {labelFor(t, QUOTE_STATUS_KEYS, q.status)}
                    </td>
                    <td className="px-3 py-3">
                      {formatEuro(q.total_cents, q.currency)}
                    </td>
                    <td className="px-3 py-3">
                      {q.valid_until
                        ? new Date(q.valid_until).toLocaleDateString("nl-NL")
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
