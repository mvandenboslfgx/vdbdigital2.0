import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/container";
import { getAdminOrganization } from "@/server/repositories/admin-portal";
import {
  PROJECT_STATUS_KEYS,
  QUOTE_STATUS_KEYS,
  TICKET_STATUS_KEYS,
  labelFor,
} from "@/lib/portal/labels";
import { getDictionary } from "@/i18n/get-dictionary";

export const metadata: Metadata = {
  title: "Klantdetail",
  robots: { index: false },
};

export default async function AdminCustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ invite?: string }>;
}) {
  const { t } = await getDictionary();
  const { id } = await params;
  const sp = await searchParams;
  const detail = await getAdminOrganization(id);
  if (!detail) notFound();

  const { organization: org, members, projects, quotes, invoices, tickets, notes, invites } =
    detail;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/customers" className="text-small text-primary hover:underline">
          ← Klanten
        </Link>
        <h1 className="text-h1 mt-2">{org.trade_name || org.legal_name}</h1>
        <p className="text-muted text-small">
          {org.customer_number} · {org.type} · {org.status}
        </p>
        {sp.invite === "1" ? (
          <p className="text-small text-success mt-2" role="status">
            Klant aangemaakt. Uitnodiging is geregistreerd (token niet in UI
            gelogd). Deel de uitnodigingsmail veilig.
          </p>
        ) : null}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-h3 mb-3">Contactpersonen</h2>
          {members.length === 0 ? (
            <p className="text-small text-muted">Nog geen actieve leden.</p>
          ) : (
            <ul className="space-y-2 text-small">
              {members.map((m) => {
                const rawUser = (m as { user?: unknown }).user;
                const user = (Array.isArray(rawUser) ? rawUser[0] : rawUser) as
                  | { email: string; full_name: string | null }
                  | null
                  | undefined;
                return (
                <li key={m.id} className="border-b border-border/50 pb-2">
                  {user?.full_name || user?.email} · {m.customer_role}
                  {m.is_primary_contact ? " · primair" : ""} · {m.status}
                </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="text-h3 mb-3">Uitnodigingen</h2>
          {invites.length === 0 ? (
            <p className="text-small text-muted">Geen uitnodigingen.</p>
          ) : (
            <ul className="space-y-2 text-small">
              {invites.map((i: { id: string; email: string; status: string; expires_at: string }) => (
                <li key={i.id}>
                  {i.email} · {i.status} · verloopt{" "}
                  {new Date(i.expires_at).toLocaleDateString("nl-NL")}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="text-h3 mb-3">Projecten</h2>
        {projects.length === 0 ? (
          <p className="text-small text-muted">Nog geen projecten.</p>
        ) : (
          <ul className="space-y-2 text-small">
            {projects.map((p: { id: string; name: string; status: string; progress_percent: number }) => (
              <li key={p.id}>
                <Link href={`/admin/projects/${p.id}`} className="text-primary hover:underline">
                  {p.name}
                </Link>{" "}
                · {labelFor(t, PROJECT_STATUS_KEYS, p.status)} ·{" "}
                {p.progress_percent}%
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-h3 mb-3">Offertes</h2>
          {quotes.length === 0 ? (
            <p className="text-small text-muted">Geen offertes.</p>
          ) : (
            <ul className="space-y-2 text-small">
              {quotes.map((q: { id: string; quote_number: string; title: string; status: string }) => (
                <li key={q.id}>
                  {q.quote_number}: {q.title} ·{" "}
                  {labelFor(t, QUOTE_STATUS_KEYS, q.status)}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="text-h3 mb-3">Facturen</h2>
          {invoices.length === 0 ? (
            <p className="text-small text-muted">Geen facturen.</p>
          ) : (
            <ul className="space-y-2 text-small">
              {invoices.map((inv: { id: string; invoice_number: string; status: string }) => (
                <li key={inv.id}>
                  {inv.invoice_number} · {inv.status}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="text-h3 mb-3">Support</h2>
        {tickets.length === 0 ? (
          <p className="text-small text-muted">Geen tickets.</p>
        ) : (
          <ul className="space-y-2 text-small">
            {tickets.map(
              (ticket: {
                id: string;
                ticket_number: string;
                subject: string;
                status: string;
              }) => (
                <li key={ticket.id}>
                  {ticket.ticket_number}: {ticket.subject} ·{" "}
                  {labelFor(t, TICKET_STATUS_KEYS, ticket.status)}
                </li>
              ),
            )}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="text-h3 mb-3">Interne notities</h2>
        <p className="text-small text-muted mb-3">
          Nooit zichtbaar in het klantenportaal.
        </p>
        {notes.length === 0 ? (
          <p className="text-small text-muted">Nog geen notities.</p>
        ) : (
          <ul className="space-y-3 text-small">
            {notes.map((n: { id: string; body: string; created_at: string }) => (
              <li key={n.id} className="border-b border-border/50 pb-2 whitespace-pre-wrap">
                {n.body}
                <span className="block text-muted mt-1">
                  {new Date(n.created_at).toLocaleString("nl-NL")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
