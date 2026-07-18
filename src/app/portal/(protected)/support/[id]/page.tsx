import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/container";
import { getPortalTicket } from "@/server/repositories/portal";
import { TICKET_STATUS_NL, labelNl } from "@/lib/portal/labels";
import { TicketReplyForm } from "@/components/portal/ticket-reply-form";

export const metadata: Metadata = {
  title: "Supportticket",
  robots: { index: false },
};

export default async function PortalTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { ticket, replies } = await getPortalTicket(id);
  if (!ticket) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/portal/support" className="text-small text-primary hover:underline">
          ← Support
        </Link>
        <h1 className="text-h1 mt-2">
          {ticket.ticket_number}: {ticket.subject}
        </h1>
        <p className="text-muted">
          {labelNl(TICKET_STATUS_NL, ticket.status)}
        </p>
      </div>

      <Card>
        <p className="text-small whitespace-pre-wrap">{ticket.description}</p>
      </Card>

      <section className="space-y-3">
        <h2 className="text-h3">Reacties</h2>
        {replies.length === 0 ? (
          <p className="text-muted text-small">Nog geen reacties.</p>
        ) : (
          replies.map((r: { id: string; body: string; created_at: string }) => (
            <div key={r.id} className="rounded-lg border border-border p-4 text-small">
              <p className="whitespace-pre-wrap">{r.body}</p>
              <p className="text-muted mt-2">
                {new Date(r.created_at).toLocaleString("nl-NL")}
              </p>
            </div>
          ))
        )}
      </section>

      {ticket.status !== "CLOSED" ? (
        <TicketReplyForm ticketId={ticket.id} />
      ) : null}
    </div>
  );
}
