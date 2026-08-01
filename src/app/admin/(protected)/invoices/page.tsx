import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/portal/empty-state";
import { listAdminInvoices } from "@/server/repositories/admin-invoices";
import { formatEuro } from "@/server/repositories/portal";
import {
  INVOICE_STATUS_KEYS,
  INVOICE_TYPE_KEYS,
  labelFor,
  labelOptions,
} from "@/lib/portal/labels";
import { getDictionary } from "@/i18n/get-dictionary";

export const metadata: Metadata = { title: "Facturen", robots: { index: false } };

export default async function AdminInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const { t } = await getDictionary();
  const sp = await searchParams;
  const { invoices, total, error } = await listAdminInvoices({
    q: sp.q,
    status: sp.status,
    page: Number(sp.page || "1") || 1,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-h1">Facturen</h1>
          <p className="text-muted text-small mt-1">
            {total} factuur{total === 1 ? "" : "en"} · weergave & handmatige
            registratie · geen Mollie
          </p>
        </div>
        <Link
          href="/admin/invoices/new"
          className="rounded-lg bg-primary text-white px-4 py-2 text-sm min-h-11 inline-flex items-center"
        >
          Nieuwe factuur
        </Link>
      </div>

      <form className="flex flex-wrap gap-3">
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Zoek nummer of titel"
          className="min-h-11 px-3 rounded-lg border border-border text-sm"
        />
        <select
          name="status"
          defaultValue={sp.status ?? "ALL"}
          className="min-h-11 px-3 rounded-lg border border-border text-sm"
        >
          <option value="ALL">Alle statussen</option>
          {labelOptions(t, INVOICE_STATUS_KEYS).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="min-h-11 px-4 rounded-lg border border-border text-sm"
        >
          Filter
        </button>
      </form>

      {error ? <p className="text-small text-error">{error}</p> : null}

      {invoices.length === 0 ? (
        <EmptyState
          title="Nog geen facturen"
          description="Maak een concept of zet een geaccepteerde offerte om naar een factuurconcept."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-small text-left">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="py-2 pr-3">Nummer</th>
                <th className="py-2 pr-3">Organisatie</th>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Totaal</th>
                <th className="py-2 pr-3">Openstaand</th>
                <th className="py-2 pr-3">Verval</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const org = inv.organization as
                  | { trade_name?: string; legal_name?: string }
                  | null
                  | undefined;
                return (
                  <tr key={inv.id} className="border-b border-border/60">
                    <td className="py-3 pr-3">
                      <Link
                        href={`/admin/invoices/${inv.id}`}
                        className="text-primary underline-offset-2 hover:underline"
                      >
                        {inv.invoice_number}
                      </Link>
                      {inv.title ? (
                        <div className="text-muted">{inv.title}</div>
                      ) : null}
                    </td>
                    <td className="py-3 pr-3">
                      {org?.trade_name || org?.legal_name || "—"}
                    </td>
                    <td className="py-3 pr-3">
                      {labelFor(
                        t,
                        INVOICE_TYPE_KEYS,
                        inv.invoice_type ?? "INVOICE",
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      {labelFor(t, INVOICE_STATUS_KEYS, inv.status)}
                    </td>
                    <td className="py-3 pr-3">
                      {formatEuro(inv.total_cents, inv.currency)}
                    </td>
                    <td className="py-3 pr-3">
                      {formatEuro(
                        (inv as { amount_due_cents?: number }).amount_due_cents ??
                          0,
                        inv.currency,
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      {(inv as { due_date?: string | null }).due_date?.slice(0, 10) ||
                        "—"}
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
