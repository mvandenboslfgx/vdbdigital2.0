import type { Metadata } from "next";
import Link from "next/link";
import { QuoteEditorForm } from "@/components/admin/quote-editor-form";
import { listAdminOrganizations } from "@/server/repositories/admin-portal";

export const metadata: Metadata = {
  title: "Nieuwe offerte",
  robots: { index: false },
};

export default async function AdminNewQuotePage() {
  const { organizations } = await listAdminOrganizations({
    pageSize: 100,
    status: "ACTIVE",
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/admin/quotes" className="text-small text-primary hover:underline">
          ← Offertes
        </Link>
        <h1 className="text-h1 mt-2">Nieuwe offerte</h1>
        <p className="text-muted text-small mt-1">
          Concept blijft intern. Verzenden maakt een onveranderlijke versie.
          Geen betaling of Mollie.
        </p>
      </div>
      {organizations.length === 0 ? (
        <p className="text-muted text-small">Maak eerst een actieve organisatie aan.</p>
      ) : (
        <QuoteEditorForm
          mode="create"
          organizations={organizations.map((o) => ({
            id: o.id,
            label: o.trade_name || o.legal_name,
          }))}
        />
      )}
    </div>
  );
}
