import type { Metadata } from "next";
import { EmptyState } from "@/components/portal/empty-state";
import { listAdminCommissions } from "@/server/repositories/admin-commerce";

export const metadata: Metadata = {
  title: "Commissies",
  robots: { index: false },
};

function euro(cents: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );
}

export default async function AdminCommissionsPage() {
  const commissions = await listAdminCommissions(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1">Commissies</h1>
        <p className="text-muted text-small mt-1">
          Server-side berekend. Geen client-manipulatie.
        </p>
      </div>
      {commissions.length === 0 ? (
        <EmptyState
          title="Nog geen commissies"
          description="Commissies ontstaan na een bevestigde partnerverkoop."
        />
      ) : (
        <ul className="space-y-3">
          {commissions.map((row) => (
            <li key={row.id as string} className="rounded-xl border border-border p-4">
              <p className="font-medium">{String(row.status)}</p>
              <p className="text-small text-muted">{euro(Number(row.amount_cents ?? 0))}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
