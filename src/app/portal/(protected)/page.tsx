import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/container";
import { EmptyState } from "@/components/portal/empty-state";
import {
  formatEuro,
  getPortalDashboard,
} from "@/server/repositories/portal";
import {
  INVOICE_STATUS_KEYS,
  PROJECT_STATUS_KEYS,
  QUOTE_STATUS_KEYS,
  TICKET_STATUS_KEYS,
  labelFor,
} from "@/lib/portal/labels";
import { getDictionary } from "@/i18n/get-dictionary";
import { formatDate } from "@/i18n/format-date";
import { withLocale } from "@/i18n/config";

export const metadata: Metadata = {
  title: "Klantenportaal",
  robots: { index: false, follow: false },
};

export default async function PortalDashboardPage() {
  const { t, locale } = await getDictionary();
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
        <h1 className="text-h1 mb-2">
          {t("portal.dashboard.welcome", { name: ctx.displayName })}
        </h1>
        <p className="text-muted">
          {t("portal.dashboard.overview", { org: orgName })}
        </p>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <p className="text-label text-muted mb-1">
            {t("portal.dashboard.activeProjects")}
          </p>
          <p className="text-3xl font-semibold">{projects.length}</p>
        </Card>
        <Card>
          <p className="text-label text-muted mb-1">
            {t("portal.dashboard.openTickets")}
          </p>
          <p className="text-3xl font-semibold">{tickets.length}</p>
        </Card>
        <Card>
          <p className="text-label text-muted mb-1">
            {t("portal.dashboard.quotesCount")}
          </p>
          <p className="text-3xl font-semibold">{quotes.length}</p>
        </Card>
        <Card>
          <p className="text-label text-muted mb-1">
            {t("portal.dashboard.unreadNotifications")}
          </p>
          <p className="text-3xl font-semibold">{unread}</p>
        </Card>
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-h3">{t("portal.dashboard.projectsTitle")}</h2>
          <Link
            href={withLocale("/portal/projecten", locale)}
            className="text-small text-primary hover:underline"
          >
            {t("portal.dashboard.viewAll")}
          </Link>
        </div>
        {projects.length === 0 ? (
          <EmptyState
            title={t("portal.dashboard.noActiveProjectsTitle")}
            description={t("portal.dashboard.noActiveProjectsBody")}
            actionHref={withLocale("/portal/support", locale)}
            actionLabel={t("portal.dashboard.askQuestion")}
          />
        ) : (
          <ul className="space-y-3">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={withLocale(`/portal/projecten/${p.id}`, locale)}
                  className="block rounded-xl border border-border bg-surface p-4 hover:border-primary transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{p.name}</p>
                    <span className="text-small text-muted">
                      {labelFor(t, PROJECT_STATUS_KEYS, p.status)}
                    </span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-surface-elevated overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${p.progress_percent}%` }}
                    />
                  </div>
                  <p className="text-small text-muted mt-2">
                    {t("portal.dashboard.progress", {
                      percent: p.progress_percent,
                    })}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid lg:grid-cols-2 gap-8">
        <section>
          <h2 className="text-h3 mb-4">
            {t("portal.dashboard.pendingActionsTitle")}
          </h2>
          {tickets.length === 0 && quotes.filter((q) => q.status === "SENT" || q.status === "VIEWED").length === 0 ? (
            <EmptyState
              title={t("portal.dashboard.noPendingActionsTitle")}
              description={t("portal.dashboard.noPendingActionsBody")}
            />
          ) : (
            <ul className="space-y-2">
              {quotes
                .filter((q) => q.status === "SENT" || q.status === "VIEWED")
                .map((q) => (
                  <li key={q.id}>
                    <Link
                      href={withLocale(`/portal/offertes/${q.id}`, locale)}
                      className="block rounded-lg border border-border p-3 text-small hover:border-primary"
                    >
                      {t("portal.dashboard.quoteLine", {
                        number: q.quote_number,
                        status: labelFor(t, QUOTE_STATUS_KEYS, q.status),
                      })}
                    </Link>
                  </li>
                ))}
              {tickets.map((ticket) => (
                <li key={ticket.id}>
                  <Link
                    href={withLocale(`/portal/support/${ticket.id}`, locale)}
                    className="block rounded-lg border border-border p-3 text-small hover:border-primary"
                  >
                    {t("portal.dashboard.ticketLine", {
                      number: ticket.ticket_number,
                      subject: ticket.subject,
                      status: labelFor(t, TICKET_STATUS_KEYS, ticket.status),
                    })}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-h3 mb-4">
            {t("portal.dashboard.recentFilesTitle")}
          </h2>
          {files.length === 0 ? (
            <EmptyState
              title={t("portal.dashboard.noDocumentsTitle")}
              description={t("portal.dashboard.noDocumentsBody")}
              actionHref={withLocale("/portal/documenten", locale)}
              actionLabel={t("portal.dashboard.toDocuments")}
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
                    {formatDate(f.created_at, locale)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <section>
          <h2 className="text-h3 mb-4">
            {t("portal.dashboard.quotesInvoicesTitle")}
          </h2>
          {quotes.length === 0 && invoices.length === 0 ? (
            <EmptyState
              title={t("portal.dashboard.noQuotesInvoicesTitle")}
              description={t("portal.dashboard.noQuotesInvoicesBody")}
            />
          ) : (
            <ul className="space-y-2">
              {quotes.slice(0, 3).map((q) => (
                <li key={q.id}>
                  <Link
                    href={withLocale(`/portal/offertes/${q.id}`, locale)}
                    className="block rounded-lg border border-border p-3 text-small hover:border-primary"
                  >
                    {q.quote_number} · {q.title} ·{" "}
                    {formatEuro(q.total_cents, q.currency)} ·{" "}
                    {labelFor(t, QUOTE_STATUS_KEYS, q.status)}
                  </Link>
                </li>
              ))}
              {invoices.slice(0, 3).map((inv) => (
                <li
                  key={inv.id}
                  className="rounded-lg border border-border p-3 text-small"
                >
                  {inv.invoice_number} · {formatEuro(inv.total_cents, inv.currency)} ·{" "}
                  {labelFor(t, INVOICE_STATUS_KEYS, inv.status)}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-h3 mb-4">
            {t("portal.dashboard.messagesTitle")}
          </h2>
          {conversations.length === 0 ? (
            <EmptyState
              title={t("portal.dashboard.noMessagesTitle")}
              description={t("portal.dashboard.noMessagesBody")}
              actionHref={withLocale("/portal/berichten", locale)}
              actionLabel={t("portal.dashboard.toMessages")}
            />
          ) : (
            <ul className="space-y-2">
              {conversations.map((c) => (
                <li key={c.id}>
                  <Link
                    href={withLocale("/portal/berichten", locale)}
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
