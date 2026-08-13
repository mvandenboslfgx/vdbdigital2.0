import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/container";
import { getAdminOrganization } from "@/server/repositories/admin-portal";
import {
  INVOICE_STATUS_KEYS,
  PROJECT_STATUS_KEYS,
  QUOTE_STATUS_KEYS,
  TICKET_STATUS_KEYS,
  labelFor,
} from "@/lib/portal/labels";
import { getDictionary } from "@/i18n/get-dictionary";
import { formatDate, formatDateTime } from "@/i18n/format-date";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return {
    title: t("admin.page.customers.detailTitle"),
    robots: { index: false },
  };
}

export default async function AdminCustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ invite?: string }>;
}) {
  const { t, locale } = await getDictionary();
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
          {t("admin.page.customers.backToList")}
        </Link>
        <h1 className="text-h1 mt-2">{org.trade_name || org.legal_name}</h1>
        <p className="text-muted text-small">
          {org.customer_number} · {org.type} · {org.status}
        </p>
        {sp.invite === "1" ? (
          <p className="text-small text-success mt-2" role="status">
            {t("admin.page.customers.inviteRegistered")}
          </p>
        ) : null}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-h3 mb-3">{t("admin.page.customers.contacts")}</h2>
          {members.length === 0 ? (
            <p className="text-small text-muted">
              {t("admin.page.customers.noMembers")}
            </p>
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
                  {m.is_primary_contact
                    ? ` · ${t("admin.page.customers.primaryTag")}`
                    : ""}{" "}
                  · {m.status}
                </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="text-h3 mb-3">
            {t("admin.page.customers.invitations")}
          </h2>
          {invites.length === 0 ? (
            <p className="text-small text-muted">
              {t("admin.page.customers.noInvitations")}
            </p>
          ) : (
            <ul className="space-y-2 text-small">
              {invites.map((i: { id: string; email: string; status: string; expires_at: string }) => (
                <li key={i.id}>
                  {i.email} · {i.status} ·{" "}
                  {t("admin.page.customers.expiresOn", {
                    date: formatDate(i.expires_at, locale),
                  })}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="text-h3 mb-3">{t("admin.page.projects.title")}</h2>
        {projects.length === 0 ? (
          <p className="text-small text-muted">
            {t("admin.page.customers.noProjects")}
          </p>
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
          <h2 className="text-h3 mb-3">{t("admin.page.quotes.title")}</h2>
          {quotes.length === 0 ? (
            <p className="text-small text-muted">
              {t("admin.page.customers.noQuotes")}
            </p>
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
          <h2 className="text-h3 mb-3">{t("admin.page.invoices.title")}</h2>
          {invoices.length === 0 ? (
            <p className="text-small text-muted">
              {t("admin.page.customers.noInvoices")}
            </p>
          ) : (
            <ul className="space-y-2 text-small">
              {invoices.map((inv: { id: string; invoice_number: string; status: string }) => (
                <li key={inv.id}>
                  {inv.invoice_number} ·{" "}
                  {labelFor(t, INVOICE_STATUS_KEYS, inv.status)}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="text-h3 mb-3">{t("admin.page.support.title")}</h2>
        {tickets.length === 0 ? (
          <p className="text-small text-muted">
            {t("admin.page.customers.noTickets")}
          </p>
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
        <h2 className="text-h3 mb-3">
          {t("admin.page.customers.internalNotes")}
        </h2>
        <p className="text-small text-muted mb-3">
          {t("admin.page.customers.internalNotesHint")}
        </p>
        {notes.length === 0 ? (
          <p className="text-small text-muted">
            {t("admin.page.customers.noNotes")}
          </p>
        ) : (
          <ul className="space-y-3 text-small">
            {notes.map((n: { id: string; body: string; created_at: string }) => (
              <li key={n.id} className="border-b border-border/50 pb-2 whitespace-pre-wrap">
                {n.body}
                <span className="block text-muted mt-1">
                  {formatDateTime(n.created_at, locale)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
