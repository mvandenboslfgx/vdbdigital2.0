import type { Metadata } from "next";
import { EmptyState } from "@/components/portal/empty-state";
import { listAdminLeads } from "@/server/repositories/admin-commerce";

export const metadata: Metadata = {
  title: "Leads",
  robots: { index: false },
};

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const { leads, total, error } = await listAdminLeads({
    q: params.q,
    status: params.status,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1">Leads</h1>
        <p className="text-muted text-small mt-1">
          {total} lead{total === 1 ? "" : "s"} uit contact- en offerteformulieren
        </p>
      </div>

      <form className="flex flex-wrap gap-3" method="get">
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Zoek naam, e-mail of onderwerp"
          className="min-h-11 px-3 rounded-lg border border-border bg-surface text-sm flex-1 min-w-[200px]"
        />
        <select
          name="status"
          defaultValue={params.status ?? "ALL"}
          className="min-h-11 px-3 rounded-lg border border-border bg-surface text-sm"
        >
          <option value="ALL">Alle statussen</option>
          <option value="NEW">Nieuw</option>
          <option value="IN_PROGRESS">In behandeling</option>
          <option value="CLOSED">Gesloten</option>
        </select>
        <button type="submit" className="min-h-11 px-5 rounded-lg bg-primary text-white text-sm">
          Filter
        </button>
      </form>

      {error ? (
        <EmptyState title="Leads konden niet worden geladen" description="Probeer het later opnieuw." />
      ) : leads.length === 0 ? (
        <EmptyState
          title="Nog geen leads"
          description="Nieuwe contact- en offerteaanvragen verschijnen hier automatisch."
        />
      ) : (
        <ul className="space-y-3">
          {leads.map((lead) => (
            <li key={lead.id} className="rounded-xl border border-border bg-surface p-4">
              <p className="font-medium">{lead.name}</p>
              <p className="text-small text-muted">
                {lead.email} · {lead.type} · {lead.status}
              </p>
              {lead.subject ? <p className="text-small mt-1">{lead.subject}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
