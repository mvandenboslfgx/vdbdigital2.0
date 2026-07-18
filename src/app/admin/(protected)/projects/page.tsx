import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/portal/empty-state";
import { listAdminProjectsFiltered } from "@/server/repositories/admin-projects";
import {
  PROJECT_STATUS_NL,
  PROJECT_TYPE_NL,
  labelNl,
} from "@/lib/portal/labels";

export const metadata: Metadata = {
  title: "Projecten",
  robots: { index: false },
};

export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    type?: string;
    visibility?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const page = Number(sp.page || "1") || 1;
  const { projects, total, pageSize, error } = await listAdminProjectsFiltered({
    q: sp.q,
    status: sp.status,
    projectType: sp.type,
    visibility: sp.visibility,
    page,
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-h1">Projecten</h1>
          <p className="text-muted text-small mt-1">
            {total} project{total === 1 ? "" : "en"} · echte data uit de database
          </p>
        </div>
        <Link
          href="/admin/projects/new"
          className="rounded-lg bg-primary text-white px-4 py-2 text-sm min-h-11 inline-flex items-center"
        >
          Nieuw project
        </Link>
      </div>

      <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Zoek naam of nummer"
          className="min-h-11 px-3 rounded-lg border border-border bg-background text-sm lg:col-span-2"
        />
        <select
          name="status"
          defaultValue={sp.status ?? "ACTIVE"}
          className="min-h-11 px-3 rounded-lg border border-border bg-background text-sm"
        >
          <option value="ACTIVE">Actief (niet gearchiveerd)</option>
          <option value="ALL">Alle statussen</option>
          {Object.entries(PROJECT_STATUS_NL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          name="type"
          defaultValue={sp.type ?? "ALL"}
          className="min-h-11 px-3 rounded-lg border border-border bg-background text-sm"
        >
          <option value="ALL">Alle types</option>
          {Object.entries(PROJECT_TYPE_NL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          name="visibility"
          defaultValue={sp.visibility ?? "ALL"}
          className="min-h-11 px-3 rounded-lg border border-border bg-background text-sm"
        >
          <option value="ALL">Alle zichtbaarheid</option>
          <option value="INTERNAL">Intern</option>
          <option value="CUSTOMER_VISIBLE">Klantzichtbaar</option>
        </select>
        <button
          type="submit"
          className="min-h-11 rounded-lg border border-border px-4 text-sm hover:border-primary"
        >
          Filter
        </button>
      </form>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          Projecten konden niet geladen worden: {error}
        </p>
      ) : null}

      {projects.length === 0 ? (
        <EmptyState
          title="Nog geen projecten"
          description="Maak een project aan voor een actieve klantorganisatie. Geen fictieve data."
          actionHref="/admin/projects/new"
          actionLabel="Project aanmaken"
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-surface-elevated text-left text-muted">
              <tr>
                <th className="px-3 py-3 font-medium">Nummer</th>
                <th className="px-3 py-3 font-medium">Naam</th>
                <th className="px-3 py-3 font-medium">Organisatie</th>
                <th className="px-3 py-3 font-medium">Type</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Voortgang</th>
                <th className="px-3 py-3 font-medium">Oplevering</th>
                <th className="px-3 py-3 font-medium">Zichtbaar</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-3 py-3 whitespace-nowrap">
                    <Link
                      href={`/admin/projects/${p.id}/overview`}
                      className="text-primary hover:underline"
                    >
                      {p.project_number}
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/admin/projects/${p.id}/overview`}
                      className="font-medium hover:underline"
                    >
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    {p.organization?.trade_name ||
                      p.organization?.legal_name ||
                      "—"}
                  </td>
                  <td className="px-3 py-3">
                    {labelNl(PROJECT_TYPE_NL, p.project_type)}
                  </td>
                  <td className="px-3 py-3">
                    {labelNl(PROJECT_STATUS_NL, p.status)}
                  </td>
                  <td className="px-3 py-3">{p.progress_percent}%</td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {p.planned_delivery_date
                      ? new Date(p.planned_delivery_date).toLocaleDateString(
                          "nl-NL",
                        )
                      : "—"}
                  </td>
                  <td className="px-3 py-3">
                    {p.visibility === "CUSTOMER_VISIBLE" ? "Klant" : "Intern"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex gap-2 text-small">
          {page > 1 ? (
            <Link
              href={`?page=${page - 1}&q=${sp.q ?? ""}&status=${sp.status ?? "ACTIVE"}`}
              className="text-primary hover:underline"
            >
              Vorige
            </Link>
          ) : null}
          <span className="text-muted">
            Pagina {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={`?page=${page + 1}&q=${sp.q ?? ""}&status=${sp.status ?? "ACTIVE"}`}
              className="text-primary hover:underline"
            >
              Volgende
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
