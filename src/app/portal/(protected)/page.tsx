import type { Metadata } from "next";
import { Card } from "@/components/ui/container";
import { EmptyState } from "@/components/portal/empty-state";
import { LocaleLink } from "@/i18n/locale-link";
import { getLocale } from "@/i18n/get-dictionary";
import {
  formatEuro,
  getPortalDashboard,
} from "@/server/repositories/portal";
import {
  INVOICE_STATUS_NL,
  INVOICE_STATUS_EN,
  PROJECT_STATUS_NL,
  PROJECT_STATUS_EN,
  QUOTE_STATUS_NL,
  QUOTE_STATUS_EN,
  TICKET_STATUS_NL,
  TICKET_STATUS_EN,
  labelLocalized,
} from "@/lib/portal/labels";

export const metadata: Metadata = {
  title: "Klantenportaal",
  robots: { index: false, follow: false },
};

export default async function PortalDashboardPage() {
  const locale = await getLocale();
  const ui = locale === "en"
    ? {
        welcome: "Welcome",
        overviewFor: "Overview for",
        privacy: "Only data from your organisation is shown.",
        activeProjects: "Active projects",
        openTickets: "Open tickets",
        quotes: "Quotes",
        unread: "Unread notifications",
        projects: "Projects",
        viewAll: "View all",
        noProjects: "No active projects",
        noProjectsBody: "There are currently no active projects linked to your account.",
        ask: "Ask a question",
        progress: "Progress",
        actions: "Open actions",
        noActions: "No open actions",
        noActionsBody: "Feedback, quotes or support actions will appear here when needed.",
        recentFiles: "Recent files",
        noDocs: "No documents yet",
        noDocsBody: "Files shared with your organisation will appear here.",
        documents: "Go to documents",
        quotesInvoices: "Quotes & invoices",
        noneFinancial: "No quotes or invoices yet",
        noneFinancialBody: "Quotes and invoices shared by VDB Digital will appear here.",
        messages: "Messages",
        noMessages: "No messages yet",
        noMessagesBody: "Secure conversations with VDB Digital will appear here.",
        goMessages: "Go to messages",
        quote: "Quote",
        ticket: "Ticket",
      }
    : {
        welcome: "Welkom",
        overviewFor: "Overzicht voor",
        privacy: "Alleen gegevens van jouw organisatie.",
        activeProjects: "Actieve projecten",
        openTickets: "Open tickets",
        quotes: "Offertes",
        unread: "Ongelezen meldingen",
        projects: "Projecten",
        viewAll: "Alles bekijken",
        noProjects: "Geen actieve projecten",
        noProjectsBody: "Er zijn momenteel geen actieve projecten gekoppeld aan je account.",
        ask: "Stel een vraag",
        progress: "Voortgang",
        actions: "Openstaande acties",
        noActions: "Geen openstaande acties",
        noActionsBody: "Zodra er feedback, een offerte of support nodig is, verschijnt dat hier.",
        recentFiles: "Recente bestanden",
        noDocs: "Nog geen documenten",
        noDocsBody: "Zichtbare bestanden van VDB Digital verschijnen hier.",
        documents: "Naar documenten",
        quotesInvoices: "Offertes & facturen",
        noneFinancial: "Nog geen offertes of facturen",
        noneFinancialBody: "Wanneer VDB Digital een offerte of factuur deelt, zie je die hier.",
        messages: "Berichten",
        noMessages: "Nog geen berichten",
        noMessagesBody: "Beveiligde gesprekken met VDB Digital verschijnen hier.",
        goMessages: "Naar berichten",
        quote: "Offerte",
        ticket: "Ticket",
      };

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

  const orgName = ctx.organization.tradeName || ctx.organization.legalName;
  const unread = notifications.filter((n) => !n.read_at).length;
  const dateLocale = locale === "en" ? "en-GB" : "nl-NL";

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-h1 mb-2">{ui.welcome}, {ctx.displayName}</h1>
        <p className="text-muted">{ui.overviewFor} {orgName}. {ui.privacy}</p>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><p className="text-label text-muted mb-1">{ui.activeProjects}</p><p className="text-3xl font-semibold">{projects.length}</p></Card>
        <Card><p className="text-label text-muted mb-1">{ui.openTickets}</p><p className="text-3xl font-semibold">{tickets.length}</p></Card>
        <Card><p className="text-label text-muted mb-1">{ui.quotes}</p><p className="text-3xl font-semibold">{quotes.length}</p></Card>
        <Card><p className="text-label text-muted mb-1">{ui.unread}</p><p className="text-3xl font-semibold">{unread}</p></Card>
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-h3">{ui.projects}</h2>
          <LocaleLink href="/portal/projecten" className="text-small text-primary hover:underline">{ui.viewAll}</LocaleLink>
        </div>
        {projects.length === 0 ? (
          <EmptyState title={ui.noProjects} description={ui.noProjectsBody} actionHref="/portal/support" actionLabel={ui.ask} />
        ) : (
          <ul className="space-y-3">
            {projects.map((p) => (
              <li key={p.id}>
                <LocaleLink href={`/portal/projecten/${p.id}`} className="block rounded-xl border border-border bg-surface p-4 hover:border-primary transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{p.name}</p>
                    <span className="text-small text-muted">{labelLocalized(locale, PROJECT_STATUS_NL, PROJECT_STATUS_EN, p.status)}</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-surface-elevated overflow-hidden"><div className="h-full bg-primary" style={{ width: `${p.progress_percent}%` }} /></div>
                  <p className="text-small text-muted mt-2">{ui.progress} {p.progress_percent}%</p>
                </LocaleLink>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid lg:grid-cols-2 gap-8">
        <section>
          <h2 className="text-h3 mb-4">{ui.actions}</h2>
          {tickets.length === 0 && quotes.filter((q) => q.status === "SENT" || q.status === "VIEWED").length === 0 ? (
            <EmptyState title={ui.noActions} description={ui.noActionsBody} />
          ) : (
            <ul className="space-y-2">
              {quotes.filter((q) => q.status === "SENT" || q.status === "VIEWED").map((q) => (
                <li key={q.id}>
                  <LocaleLink href={`/portal/offertes/${q.id}`} className="block rounded-lg border border-border p-3 text-small hover:border-primary">
                    {ui.quote} {q.quote_number} — {labelLocalized(locale, QUOTE_STATUS_NL, QUOTE_STATUS_EN, q.status)}
                  </LocaleLink>
                </li>
              ))}
              {tickets.map((t) => (
                <li key={t.id}>
                  <LocaleLink href={`/portal/support/${t.id}`} className="block rounded-lg border border-border p-3 text-small hover:border-primary">
                    {ui.ticket} {t.ticket_number}: {t.subject} — {labelLocalized(locale, TICKET_STATUS_NL, TICKET_STATUS_EN, t.status)}
                  </LocaleLink>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-h3 mb-4">{ui.recentFiles}</h2>
          {files.length === 0 ? (
            <EmptyState title={ui.noDocs} description={ui.noDocsBody} actionHref="/portal/documenten" actionLabel={ui.documents} />
          ) : (
            <ul className="space-y-2">
              {files.map((f) => (
                <li key={f.id} className="rounded-lg border border-border p-3 text-small flex justify-between gap-2">
                  <span className="truncate">{f.file_name}</span>
                  <span className="text-muted shrink-0">{new Date(f.created_at).toLocaleDateString(dateLocale)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <section>
          <h2 className="text-h3 mb-4">{ui.quotesInvoices}</h2>
          {quotes.length === 0 && invoices.length === 0 ? (
            <EmptyState title={ui.noneFinancial} description={ui.noneFinancialBody} />
          ) : (
            <ul className="space-y-2">
              {quotes.slice(0, 3).map((q) => (
                <li key={q.id}>
                  <LocaleLink href={`/portal/offertes/${q.id}`} className="block rounded-lg border border-border p-3 text-small hover:border-primary">
                    {q.quote_number} · {q.title} · {formatEuro(q.total_cents, q.currency)} · {labelLocalized(locale, QUOTE_STATUS_NL, QUOTE_STATUS_EN, q.status)}
                  </LocaleLink>
                </li>
              ))}
              {invoices.slice(0, 3).map((inv) => (
                <li key={inv.id} className="rounded-lg border border-border p-3 text-small">
                  {inv.invoice_number} · {formatEuro(inv.total_cents, inv.currency)} · {labelLocalized(locale, INVOICE_STATUS_NL, INVOICE_STATUS_EN, inv.status)}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-h3 mb-4">{ui.messages}</h2>
          {conversations.length === 0 ? (
            <EmptyState title={ui.noMessages} description={ui.noMessagesBody} actionHref="/portal/berichten" actionLabel={ui.goMessages} />
          ) : (
            <ul className="space-y-2">
              {conversations.map((c) => (
                <li key={c.id}>
                  <LocaleLink href="/portal/berichten" className="block rounded-lg border border-border p-3 text-small hover:border-primary">{c.subject}</LocaleLink>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
