import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/portal/empty-state";
import { listAdminOrders } from "@/server/repositories/admin-commerce";

export const metadata: Metadata = {
  title: "Orders",
  robots: { index: false },
};

function euro(cents: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page || "1") || 1;
  const { orders, total, pageSize, error } = await listAdminOrders({
    q: params.q,
    status: params.status,
    page,
  });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1">Orders</h1>
        <p className="text-muted text-small mt-1">
          {total} bestelling{total === 1 ? "" : "en"} · echte data uit de database
        </p>
      </div>

      <form className="flex flex-wrap gap-3" method="get">
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Zoek nummer, e-mail of bedrijf"
          className="min-h-11 px-3 rounded-lg border border-border bg-surface text-sm flex-1 min-w-[200px]"
        />
        <select
          name="status"
          defaultValue={params.status ?? "ALL"}
          className="min-h-11 px-3 rounded-lg border border-border bg-surface text-sm"
        >
          <option value="ALL">Alle statussen</option>
          <option value="PENDING">Pending</option>
          <option value="PAID">Betaald</option>
          <option value="FAILED">Mislukt</option>
          <option value="CANCELLED">Geannuleerd</option>
          <option value="REFUNDED">Terugbetaald</option>
        </select>
        <button type="submit" className="min-h-11 px-5 rounded-lg bg-primary text-white text-sm">
          Filter
        </button>
      </form>

      {error ? (
        <EmptyState title="Orders konden niet worden geladen" description="Probeer het later opnieuw." />
      ) : orders.length === 0 ? (
        <EmptyState
          title="Nog geen bestellingen"
          description="Zodra een klant afrekent, verschijnt de order hier met snapshot en status."
        />
      ) : (
        <>
          <div className="md:hidden space-y-3">
            {orders.map((order) => (
              <article
                key={order.id}
                className="rounded-xl border border-border bg-surface p-4 space-y-2"
              >
                <p className="font-medium">{order.order_number}</p>
                <p className="text-small text-muted">
                  {order.customer_company ||
                    `${order.customer_first_name} ${order.customer_last_name}`}
                </p>
                <p className="text-small">
                  {order.status} · {euro(order.total_cents)}
                </p>
                {order.organization_id ? (
                  <Link
                    href={`/admin/customers/${order.organization_id}`}
                    className="text-small text-primary hover:underline"
                  >
                    Open klant
                  </Link>
                ) : null}
              </article>
            ))}
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-small text-left">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="py-2 pr-3">Nummer</th>
                  <th className="py-2 pr-3">Klant</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Totaal</th>
                  <th className="py-2">Datum</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-border/60">
                    <td className="py-3 pr-3 font-mono">{order.order_number}</td>
                    <td className="py-3 pr-3">
                      {order.organization_id ? (
                        <Link
                          href={`/admin/customers/${order.organization_id}`}
                          className="text-primary hover:underline"
                        >
                          {order.customer_company || order.customer_email}
                        </Link>
                      ) : (
                        order.customer_company || order.customer_email
                      )}
                    </td>
                    <td className="py-3 pr-3">{order.status}</td>
                    <td className="py-3 pr-3">{euro(order.total_cents)}</td>
                    <td className="py-3">
                      {new Date(order.created_at).toLocaleDateString("nl-NL")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {totalPages > 1 ? (
        <p className="text-small text-muted">
          Pagina {page} van {totalPages}
        </p>
      ) : null}
    </div>
  );
}
