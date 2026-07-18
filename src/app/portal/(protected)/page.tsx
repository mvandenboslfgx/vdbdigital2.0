import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/container";
import { EmptyState } from "@/components/portal/empty-state";
import {
  formatEuro,
  getPortalDashboard,
} from "@/server/repositories/portal";
import {
  INVOICE_STATUS_NL,
  PROJECT_STATUS_NL,
  QUOTE_STATUS_NL,
  TICKET_STATUS_NL,
  labelNl,
} from "@/lib/portal/labels";

export const metadata: Metadata = {
  title: "Klantenportaal",
  robots: { index: false, follow: false },
};

export default async function PortalDashboardPage() {
  const {
    ctx,
    projects,
    quotes,
    invoices,
    tickets,
    files,
    notifications,
    conversations,
  } = await getPortalDashboard();

  const orgName =
    ctx.organization.tradeName || ctx.organization.legalName;
  const unread = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-h1 mb-2">Welkom, {ctx.displayName}</h1>
        <p className="text-muted">
          Overzicht voor {orgName}. Alleen gegevens van jouw organisatie.
        </p>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <p className="text-label text-muted mb-1">Actieve projecten</p>
          <p className="text-3xl font-semibold">{projects.length}</p>
        </Card>
        <Card>
          <p className="text-label text-muted mb-1">Open tickets</p>
          <p className="text-3xl font-semibold">{tickets.length}</p>
        </Card>
        <Card>
          <p className="text-label text-muted mb-1">Offertes</p>
          <p className="text-3xl font-semibold">{quotes.length}</p>
        </Card>
        <Card>
          <p className="text-label text-muted mb-1">Ongelezen meldingen</p>
          <p className="text-3xl font-semibold">{unread}</p>
        </Card>
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-h3">Projecten</h2>
          <Link href="/portal/projecten" className="text-small text-primary hover:underline">
            Alles bekijken
          </Link>
        </div>
        {projects.length === 0 ? (
          <EmptyState
            title="Geen actieve projecten"
            description="Er zijn momenteel geen actieve projecten gekoppeld aan je account."
            actionHref="/portal/support"
            actionLabel="Stel een vraag"
          />
        ) : (
          <ul className="space-y-3">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/portal/projecten/${p.id}`}
                  className="block rounded-xl border border-border bg-surface p-4 hover:border-primary transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{p.name}</p>
                    <span className="text-small text-muted">
                      {labelNl(PROJECT_STATUS_NL, p.status)}
                    </span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-surface-elevated overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${p.progress_percent}%` }}
                    />
                  </div>
                  <p className="text-small text-muted mt-2">
                    Voortgang {p.progress_percent}%
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid lg:grid-cols-2 gap-8">
        <section>
          <h2 className="text-h3 mb-4">Openstaande acties</h2>
          {tickets.length === 0 && quotes.filter((q) => q.status === "SENT" || q.status === "VIEWED").length === 0 ? (
            <EmptyState
              title="Geen openstaande acties"
              description="Zodra er feedback, een offerte of support nodig is, verschijnt dat hier."
            />
          ) : (
            <ul className="space-y-2">
              {quotes
                .filter((q) => q.status === "SENT" || q.status === "VIEWED")
                .map((q) => (
                  <li key={q.id}>
                    <Link
                      href={`/portal/offertes/${q.id}`}
                      className="block rounded-lg border border-border p-3 text-small hover:border-primary"
                    >
                      Offerte {q.quote_number} — {labelNl(QUOTE_STATUS_NL, q.status)}
                    </Link>
                  </li>
                ))}
              {tickets.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/portal/support/${t.id}`}
                    className="block rounded-lg border border-border p-3 text-small hover:border-primary"
                  >
                    Ticket {t.ticket_number}: {t.subject} —{" "}
                    {labelNl(TICKET_STATUS_NL, t.status)}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-h3 mb-4">Recente bestanden</h2>
          {files.length === 0 ? (
            <EmptyState
              title="Nog geen documenten"
              description="Zichtbare bestanden van VDB Digital verschijnen hier."
              actionHref="/portal/documenten"
              actionLabel="Naar documenten"
            />
          ) : (
            <ul className="space-y-2">
              {files.map((f) => (
                <li
                  key={f.id}
                  className="rounded-lg border border-border p-3 text-small flex justify-between gap-2"
                >
                  <span className="truncate">{f.file_name}</span>
                  <span className="text-muted shrink-0">
                    {new Date(f.created_at).toLocaleDateString("nl-NL")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <section>
          <h2 className="text-h3 mb-4">Offertes & facturen</h2>
          {quotes.length === 0 && invoices.length === 0 ? (
            <EmptyState
              title="Nog geen offertes of facturen"
              description="Wanneer VDB Digital een offerte of factuur deelt, zie je die hier."
            />
          ) : (
            <ul className="space-y-2">
              {quotes.slice(0, 3).map((q) => (
                <li key={q.id}>
                  <Link
                    href={`/portal/offertes/${q.id}`}
                    className="block rounded-lg border border-border p-3 text-small hover:border-primary"
                  >
                    {q.quote_number} · {q.title} ·{" "}
                    {formatEuro(q.total_cents, q.currency)} ·{" "}
                    {labelNl(QUOTE_STATUS_NL, q.status)}
                  </Link>
                </li>
              ))}
              {invoices.slice(0, 3).map((inv) => (
                <li
                  key={inv.id}
                  className="rounded-lg border border-border p-3 text-small"
                >
                  {inv.invoice_number} · {formatEuro(inv.total_cents, inv.currency)} ·{" "}
                  {labelNl(INVOICE_STATUS_NL, inv.status)}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-h3 mb-4">Berichten</h2>
          {conversations.length === 0 ? (
            <EmptyState
              title="Nog geen berichten"
              description="Beveiligde gesprekken met VDB Digital verschijnen hier. Geen externe chatwidget."
              actionHref="/portal/berichten"
              actionLabel="Naar berichten"
            />
          ) : (
            <ul className="space-y-2">
              {conversations.map((c) => (
                <li key={c.id}>
                  <Link
                    href="/portal/berichten"
                    className="block rounded-lg border border-border p-3 text-small hover:border-primary"
                  >
                    {c.subject}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
