import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/portal/empty-state";
import { listAdminDocuments } from "@/server/repositories/admin-documents";
import { formatBytes } from "@/lib/validation/documents";
import {
  DOCUMENT_CATEGORY_NL,
  DOCUMENT_STATUS_NL,
  DOCUMENT_VISIBILITY_NL,
  labelNl,
} from "@/lib/portal/labels";

export const metadata: Metadata = {
  title: "Documenten",
  robots: { index: false },
};

export default async function AdminDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    visibility?: string;
    category?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const page = Number(sp.page || "1") || 1;
  const { documents, total, pageSize, error } = await listAdminDocuments({
    q: sp.q,
    status: sp.status,
    visibility: sp.visibility,
    category: sp.category,
    page,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-h1">Documenten</h1>
          <p className="text-muted text-small mt-1">
            {total} document{total === 1 ? "" : "en"} · private buckets · signed
            downloads
          </p>
        </div>
        <Link
          href="/admin/documents/new"
          className="rounded-lg bg-primary text-white px-4 py-2 text-sm min-h-11 inline-flex items-center"
        >
          Uploaden
        </Link>
      </div>

      <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Zoek titel, bestand of nummer"
          className="min-h-11 px-3 rounded-lg border border-border bg-background text-sm lg:col-span-2"
        />
        <select
          name="status"
          defaultValue={sp.status ?? "ALL"}
          className="min-h-11 px-3 rounded-lg border border-border bg-background text-sm"
        >
          <option value="ALL">Alle statussen</option>
          {Object.entries(DOCUMENT_STATUS_NL).map(([k, v]) => (
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
          {Object.entries(DOCUMENT_VISIBILITY_NL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="min-h-11 rounded-lg border border-border px-4 text-sm"
        >
          Filter
        </button>
      </form>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          Documenten laden mislukt: {error}
        </p>
      ) : null}

      {documents.length === 0 ? (
        <EmptyState
          title="Nog geen documenten"
          description="Upload een bestand voor een organisatie. Geen fictieve data."
          actionHref="/admin/documents/new"
          actionLabel="Document uploaden"
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-surface-elevated text-left text-muted">
              <tr>
                <th className="px-3 py-3 font-medium">Nummer</th>
                <th className="px-3 py-3 font-medium">Titel</th>
                <th className="px-3 py-3 font-medium">Organisatie</th>
                <th className="px-3 py-3 font-medium">Categorie</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Zichtbaar</th>
                <th className="px-3 py-3 font-medium">Grootte</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.id} className="border-t border-border">
                  <td className="px-3 py-3 whitespace-nowrap">
                    <Link
                      href={`/admin/documents/${d.id}`}
                      className="text-primary hover:underline"
                    >
                      {d.document_number}
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/admin/documents/${d.id}`}
                      className="font-medium hover:underline"
                    >
                      {d.title}
                    </Link>
                    <p className="text-muted text-xs truncate max-w-[14rem]">
                      {d.file_name}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    {d.organization?.trade_name ||
                      d.organization?.legal_name ||
                      "—"}
                  </td>
                  <td className="px-3 py-3">
                    {labelNl(DOCUMENT_CATEGORY_NL, d.category)}
                  </td>
                  <td className="px-3 py-3">
                    {labelNl(DOCUMENT_STATUS_NL, d.status)}
                  </td>
                  <td className="px-3 py-3">
                    {labelNl(DOCUMENT_VISIBILITY_NL, d.visibility)}
                  </td>
                  <td className="px-3 py-3">{formatBytes(d.size_bytes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > pageSize ? (
        <p className="text-small text-muted">
          Pagina {page} · toont max {pageSize} per pagina
        </p>
      ) : null}
    </div>
  );
}
