import type { Metadata } from "next";
import Link from "next/link";
import { AdminDocumentUploadForm } from "@/components/documents/document-forms";
import { listAdminOrganizations } from "@/server/repositories/admin-portal";

export const metadata: Metadata = {
  title: "Document uploaden",
  robots: { index: false },
};

export default async function AdminNewDocumentPage() {
  const { organizations } = await listAdminOrganizations({
    pageSize: 100,
    status: "ACTIVE",
  });

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <Link
          href="/admin/documents"
          className="text-small text-primary hover:underline"
        >
          ← Documenten
        </Link>
        <h1 className="text-h1 mt-2">Document uploaden</h1>
        <p className="text-muted text-small mt-1">
          Bestanden gaan naar private buckets. Downloads alleen via korte signed
          URLs. Standaard zichtbaarheid: intern.
        </p>
      </div>

      {organizations.length === 0 ? (
        <p className="text-muted text-small">
          Maak eerst een actieve organisatie aan.
        </p>
      ) : (
        <AdminDocumentUploadForm
          organizations={organizations.map((o) => ({
            id: o.id,
            label: o.trade_name || o.legal_name,
          }))}
        />
      )}
    </div>
  );
}
