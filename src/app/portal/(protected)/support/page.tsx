import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/portal/empty-state";
import { listPortalTickets } from "@/server/repositories/portal";
import { TICKET_STATUS_KEYS, labelFor } from "@/lib/portal/labels";
import { getDictionary } from "@/i18n/get-dictionary";
import { withLocale } from "@/i18n/config";
import { CreateTicketForm } from "@/components/portal/create-ticket-form";
import { ticketCreateLabels } from "@/lib/portal/form-labels";

export const metadata: Metadata = {
  title: "Support",
  robots: { index: false },
};

export default async function PortalSupportPage() {
  const { t, locale } = await getDictionary();
  const { tickets } = await listPortalTickets();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-h1">{t("portal.supportPage.title")}</h1>
        <p className="text-muted text-small mt-1">
          {t("portal.supportPage.intro")}
        </p>
      </div>

      <CreateTicketForm labels={ticketCreateLabels(t)} />

      <section>
        <h2 className="text-h3 mb-4">{t("portal.supportPage.yourTickets")}</h2>
        {tickets.length === 0 ? (
          <EmptyState
            title={t("portal.supportPage.emptyTitle")}
            description={t("portal.supportPage.emptyBody")}
          />
        ) : (
          <ul className="space-y-3">
            {tickets.map((ticket) => (
              <li key={ticket.id}>
                <Link
                  href={withLocale(`/portal/support/${ticket.id}`, locale)}
                  className="block rounded-xl border border-border bg-surface p-5 hover:border-primary"
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <p className="font-medium">
                      {ticket.ticket_number}: {ticket.subject}
                    </p>
                    <span className="text-small text-muted">
                      {labelFor(t, TICKET_STATUS_KEYS, ticket.status)}
                    </span>
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
