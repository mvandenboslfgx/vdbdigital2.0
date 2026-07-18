import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminQuote } from "@/server/repositories/admin-quotes";
import { QUOTE_STATUS_NL, labelNl } from "@/lib/portal/labels";

export const metadata: Metadata = {
  title: "Offerteversies",
  robots: { index: false },
};

export default async function AdminQuoteVersionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getAdminQuote(id);
  if (!bundle) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/quotes/${id}`}
          className="text-small text-primary hover:underline"
        >
          ← Offerte
        </Link>
        <h1 className="text-h1 mt-2">Versies</h1>
      </div>
      {bundle.versions.length === 0 ? (
        <p className="text-muted text-small">
          Nog geen verzonden snapshots. Verzenden maakt versie 1.
        </p>
      ) : (
        <ul className="space-y-2">
          {bundle.versions.map(
            (v: {
              id: string;
              version_number: number;
              status: string;
              snapshot_checksum: string;
              created_at: string;
            }) => (
              <li
                key={v.id}
                className="rounded-xl border border-border p-4 text-small"
              >
                <p className="font-medium">
                  Versie {v.version_number} · {labelNl(QUOTE_STATUS_NL, v.status)}
                </p>
                <p className="text-muted mt-1">
                  {new Date(v.created_at).toLocaleString("nl-NL")}
                </p>
                <p className="font-mono text-xs mt-2 break-all">
                  checksum {v.snapshot_checksum}
                </p>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}
