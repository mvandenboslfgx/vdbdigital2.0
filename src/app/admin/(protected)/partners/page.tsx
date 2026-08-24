import type { Metadata } from "next";
import { EmptyState } from "@/components/portal/empty-state";
import { listAdminPartners } from "@/server/repositories/admin-commerce";

export const metadata: Metadata = {
  title: "Partners",
  robots: { index: false },
};

export default async function AdminPartnersPage() {
  const partners = await listAdminPartners(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1">Partners</h1>
        <p className="text-muted text-small mt-1">
          Partneridentiteit uit partner_profiles. Klanten betalen altijd aan VDB.
        </p>
      </div>
      {partners.length === 0 ? (
        <EmptyState
          title="Nog geen partners"
          description="Goedgekeurde partnerprofielen verschijnen hier."
        />
      ) : (
        <ul className="space-y-3">
          {partners.map((partner) => (
            <li key={partner.id as string} className="rounded-xl border border-border p-4">
              <p className="font-medium">
                {(partner.display_name as string | null) ||
                  (partner.legal_name as string | null) ||
                  String(partner.id)}
              </p>
              <p className="text-small text-muted">{String(partner.status)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
