import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/container";
import { getPortalTicket } from "@/server/repositories/portal";
import { TICKET_STATUS_KEYS, labelFor } from "@/lib/portal/labels";
import { getDictionary } from "@/i18n/get-dictionary";
import { formatDateTime } from "@/i18n/format-date";
import { withLocale } from "@/i18n/config";
import { TicketReplyForm } from "@/components/portal/ticket-reply-form";
import { ticketReplyLabels } from "@/lib/portal/form-labels";

export const metadata: Metadata = {
  title: "Supportticket",
  robots: { index: false },
};

export default async function PortalTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t, locale } = await getDictionary();
  const { id } = await params;
  const { ticket, replies } = await getPortalTicket(id);
  if (!ticket) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={withLocale("/portal/support", locale)}
          className="text-small text-primary hover:underline"
        >
          {t("portal.supportPage.backToSupport")}
        </Link>
        <h1 className="text-h1 mt-2">
          {ticket.ticket_number}: {ticket.subject}
        </h1>
        <p className="text-muted">
          {labelFor(t, TICKET_STATUS_KEYS, ticket.status)}
        </p>
      </div>

      <Card>
        <p className="text-small whitespace-pre-wrap">{ticket.description}</p>
      </Card>

      <section className="space-y-3">
        <h2 className="text-h3">{t("portal.supportPage.repliesTitle")}</h2>
        {replies.length === 0 ? (
          <p className="text-muted text-small">
            {t("portal.supportPage.noReplies")}
          </p>
        ) : (
          replies.map((r: { id: string; body: string; created_at: string }) => (
            <div key={r.id} className="rounded-lg border border-border p-4 text-small">
              <p className="whitespace-pre-wrap">{r.body}</p>
              <p className="text-muted mt-2">
                {formatDateTime(r.created_at, locale)}
              </p>
            </div>
          ))
        )}
      </section>

      {ticket.status !== "CLOSED" ? (
        <TicketReplyForm
          ticketId={ticket.id}
          labels={ticketReplyLabels(t)}
        />
      ) : null}
    </div>
  );
}
