import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/portal/empty-state";
import { formatEuro, listPortalOrders } from "@/server/repositories/portal";

export const metadata: Metadata = {
  title: "Bestellingen & abonnementen",
  robots: { index: false, follow: false },
};

function orderStatus(status: string) {
  const map: Record<string, string> = {
    PENDING: "In afwachting",
    PAID: "Betaald",
    FAILED: "Mislukt",
    CANCELLED: "Geannuleerd",
    REFUNDED: "Terugbetaald",
    QUOTE_REQUESTED: "Offerte aangevraagd",
  };
  return map[status] ?? status;
}

function subscriptionStatus(status: string) {
  const map: Record<string, string> = {
    PENDING: "Wordt geactiveerd",
    ACTIVE: "Actief",
    PAST_DUE: "Betaling vereist",
    CANCELLED: "Geannuleerd",
    COMPLETED: "Beëindigd",
    FAILED: "Mislukt",
  };
  return map[status] ?? status;
}

export default async function PortalOrdersPage() {
  const { orders, subscriptions } = await listPortalOrders();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-h1">Bestellingen & abonnementen</h1>
        <p className="text-small text-muted mt-1">
          Bekijk aankopen die zijn gedaan met het e-mailadres van dit account.
        </p>
      </div>

      <section>
        <h2 className="text-h3 mb-4">Abonnementen</h2>
        {subscriptions.length === 0 ? (
          <EmptyState
            title="Geen actieve abonnementen"
            description="Care-abonnementen die je via de shop afsluit verschijnen hier na de eerste Mollie-betaling."
            actionHref="/shop"
            actionLabel="Bekijk shop"
          />
        ) : (
          <ul className="space-y-3">
            {subscriptions.map((sub) => (
              <li key={sub.id} className="rounded-xl border border-border bg-surface p-5">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="font-medium">{sub.product_name}</p>
                    <p className="text-small text-muted mt-1">
                      {subscriptionStatus(sub.status)} · {sub.interval === "1 month" ? "maandelijks" : sub.interval}
                    </p>
                  </div>
                  <p className="font-medium">
                    {formatEuro(sub.amount_cents, sub.currency)}
                    {sub.interval === "1 month" ? " / maand" : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-h3 mb-4">Bestellingen</h2>
        {orders.length === 0 ? (
          <EmptyState
            title="Nog geen bestellingen"
            description="Betaalde en lopende shopbestellingen verschijnen hier automatisch."
            actionHref="/shop"
            actionLabel="Naar de shop"
          />
        ) : (
          <ul className="space-y-3">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/portal/bestellingen/${order.id}`}
                  className="block rounded-xl border border-border bg-surface p-5 hover:border-primary transition-colors"
                >
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <p className="font-medium">{order.order_number}</p>
                      <p className="text-small text-muted mt-1">
                        {new Date(order.created_at).toLocaleString("nl-NL")} · {orderStatus(order.status)}
                      </p>
                    </div>
                    <p className="font-medium">{formatEuro(order.total_cents)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
