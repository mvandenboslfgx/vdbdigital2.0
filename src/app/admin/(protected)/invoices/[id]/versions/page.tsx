import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminInvoice } from "@/server/repositories/admin-invoices";

export const metadata: Metadata = {
  title: "Factuurversies",
  robots: { index: false },
};

export default async function AdminInvoiceVersionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getAdminInvoice(id);
  if (!bundle) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link
          href={`/admin/invoices/${id}`}
          className="text-small text-primary underline-offset-2 hover:underline"
        >
          ← Terug
        </Link>
        <h1 className="text-h1 mt-2">Versies · {bundle.invoice.invoice_number}</h1>
      </div>
      {bundle.versions.length === 0 ? (
        <p className="text-muted text-small">
          Nog geen uitgegeven snapshot. Uitgeven maakt een onveranderlijke versie.
        </p>
      ) : (
        <ul className="space-y-3">
          {bundle.versions.map((v) => (
            <li key={v.id} className="rounded-lg border border-border p-4 text-small">
              Versie {v.version_number} · {v.status} ·{" "}
              {new Date(v.created_at).toLocaleString("nl-NL")}
              <div className="text-muted mt-1 font-mono text-xs break-all">
                {v.snapshot_checksum}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
