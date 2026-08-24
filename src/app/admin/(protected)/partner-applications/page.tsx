import type { Metadata } from "next";
import { EmptyState } from "@/components/portal/empty-state";
import { listAdminPartnerApplications } from "@/server/repositories/admin-commerce";

export const metadata: Metadata = {
  title: "Partneraanvragen",
  robots: { index: false },
};

export default async function AdminPartnerApplicationsPage() {
  const applications = await listAdminPartnerApplications(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1">Partneraanvragen</h1>
        <p className="text-muted text-small mt-1">
          KVK is niet verplicht voor particulier. Zakelijk wel volgens de bestaande flow.
        </p>
      </div>
      {applications.length === 0 ? (
        <EmptyState
          title="Nog geen aanvragen"
          description="Nieuwe partneraanvragen verschijnen hier ter review."
        />
      ) : (
        <ul className="space-y-3">
          {applications.map((row) => (
            <li key={row.id as string} className="rounded-xl border border-border p-4">
              <p className="font-medium">{(row.legal_name as string) || "Aanvraag"}</p>
              <p className="text-small text-muted">
                {String(row.status)} · {(row.contact_email as string) || "—"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
