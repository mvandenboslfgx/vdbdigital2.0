import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatEuro, getPortalOrder } from "@/server/repositories/portal";

export const metadata: Metadata = {
  title: "Bestelling",
  robots: { index: false, follow: false },
};

export default async function PortalOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { order, items, payments, subscription } = await getPortalOrder(id);
  if (!order) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link
          href="/portal/bestellingen"
          className="text-small text-primary hover:underline"
        >
          ← Bestellingen
        </Link>
        <h1 className="text-h1 mt-2">{order.order_number}</h1>
        <p className="text-small text-muted mt-1">
          Status: {order.status} · {new Date(order.created_at).toLocaleString("nl-NL")}
        </p>
      </div>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-h3 mb-3">Orderregels</h2>
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap justify-between gap-3 text-small">
              <span>
                {item.product_name} · {item.quantity}×
                {item.billing_type === "MONTHLY" ? " · maandelijks" : ""}
              </span>
              <span>{formatEuro(item.total_cents)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 border-t border-border pt-4 text-right font-semibold">
          Totaal: {formatEuro(order.total_cents)}
        </div>
      </section>

      {subscription ? (
        <section className="rounded-xl border border-primary/30 bg-primary-soft/30 p-5">
          <h2 className="text-h3">Abonnement</h2>
          <p className="text-small mt-2">
            {subscription.product_name} · {subscription.status}
          </p>
          <p className="text-small text-muted mt-1">
            {formatEuro(subscription.amount_cents, subscription.currency)} · {subscription.interval}
          </p>
          {subscription.last_payment_at ? (
            <p className="text-small text-muted mt-1">
              Laatste betaling: {new Date(subscription.last_payment_at).toLocaleString("nl-NL")}
            </p>
          ) : null}
        </section>
      ) : null}

      <section>
        <h2 className="text-h3 mb-3">Betalingen</h2>
        {payments.length === 0 ? (
          <p className="text-small text-muted">Nog geen betaling geregistreerd.</p>
        ) : (
          <ul className="space-y-2">
            {payments.map((payment) => (
              <li key={payment.id} className="rounded-lg border border-border p-4 text-small">
                <div className="flex flex-wrap justify-between gap-3">
                  <span>{payment.status}</span>
                  <span>{formatEuro(payment.amount_cents)}</span>
                </div>
                <p className="text-xs text-muted mt-1">
                  Providerstatus: {payment.provider_status ?? "—"} · {new Date(payment.updated_at).toLocaleString("nl-NL")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
