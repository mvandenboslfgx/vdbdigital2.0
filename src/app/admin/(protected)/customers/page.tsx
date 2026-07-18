import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/portal/empty-state";
import { listAdminOrganizations } from "@/server/repositories/admin-portal";
import { CreateCustomerForm } from "@/components/admin/create-customer-form";

export const metadata: Metadata = {
  title: "Klanten",
  robots: { index: false },
};

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const { organizations, total } = await listAdminOrganizations({
    q: params.q,
    status: params.status,
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-h1">Klanten</h1>
          <p className="text-muted text-small mt-1">
            {total} organisatie{total === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <CreateCustomerForm />

      <form className="flex flex-wrap gap-3" method="get">
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Zoek op naam, nummer of e-mail"
          className="min-h-11 px-3 rounded-lg border border-border bg-surface text-sm flex-1 min-w-[200px]"
        />
        <select
          name="status"
          defaultValue={params.status ?? "ALL"}
          className="min-h-11 px-3 rounded-lg border border-border bg-surface text-sm"
        >
          <option value="ALL">Alle statussen</option>
          <option value="ACTIVE">Actief</option>
          <option value="INVITED">Uitgenodigd</option>
          <option value="BLOCKED">Geblokkeerd</option>
          <option value="ARCHIVED">Gearchiveerd</option>
        </select>
        <button
          type="submit"
          className="min-h-11 px-5 rounded-lg bg-primary text-white text-sm"
        >
          Filter
        </button>
      </form>

      {organizations.length === 0 ? (
        <EmptyState
          title="Nog geen klanten"
          description="Maak een klantorganisatie aan en verstuur een uitnodiging. Geen fictieve data."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-small text-left">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="py-2 pr-3">Klant</th>
                <th className="py-2 pr-3">Nummer</th>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2">Contact</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((org) => (
                <tr key={org.id} className="border-b border-border/60">
                  <td className="py-3 pr-3">
                    <Link
                      href={`/admin/customers/${org.id}`}
                      className="text-primary hover:underline font-medium"
                    >
                      {org.trade_name || org.legal_name}
                    </Link>
                  </td>
                  <td className="py-3 pr-3">{org.customer_number ?? "—"}</td>
                  <td className="py-3 pr-3">{org.type}</td>
                  <td className="py-3 pr-3">{org.status}</td>
                  <td className="py-3">{org.contact_email ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
