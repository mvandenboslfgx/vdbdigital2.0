import type { Metadata } from "next";
import { EmptyState } from "@/components/portal/empty-state";
import { listAdminPayments } from "@/server/repositories/admin-commerce";

export const metadata: Metadata = {
  title: "Betalingen",
  robots: { index: false },
};

function euro(cents: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );
}

export default async function AdminPaymentsPage() {
  const payments = await listAdminPayments(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1">Betalingen</h1>
        <p className="text-muted text-small mt-1">Mollie-statussen uit de database. Geen live mutaties hier.</p>
      </div>
      {payments.length === 0 ? (
        <EmptyState
          title="Nog geen betalingen"
          description="Betalingen verschijnen na Mollie Hosted Checkout (testmodus eerst)."
        />
      ) : (
        <ul className="space-y-3">
          {payments.map((payment) => (
            <li key={payment.id as string} className="rounded-xl border border-border p-4">
              <p className="font-mono text-small">{String(payment.id).slice(0, 18)}</p>
              <p className="text-small text-muted">
                {String(payment.status)} · {euro(Number(payment.amount_cents ?? 0))}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
