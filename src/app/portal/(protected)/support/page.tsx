import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/portal/empty-state";
import { listPortalTickets } from "@/server/repositories/portal";
import { TICKET_STATUS_NL, labelNl } from "@/lib/portal/labels";
import { CreateTicketForm } from "@/components/portal/create-ticket-form";

export const metadata: Metadata = {
  title: "Support",
  robots: { index: false },
};

export default async function PortalSupportPage() {
  const { tickets } = await listPortalTickets();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-h1">Support</h1>
        <p className="text-muted text-small mt-1">
          Stel een vraag of volg bestaande tickets.
        </p>
      </div>

      <CreateTicketForm />

      <section>
        <h2 className="text-h3 mb-4">Jouw tickets</h2>
        {tickets.length === 0 ? (
          <EmptyState
            title="Nog geen tickets"
            description="Open een ticket als je hulp nodig hebt bij een project of account."
          />
        ) : (
          <ul className="space-y-3">
            {tickets.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/portal/support/${t.id}`}
                  className="block rounded-xl border border-border bg-surface p-5 hover:border-primary"
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <p className="font-medium">
                      {t.ticket_number}: {t.subject}
                    </p>
                    <span className="text-small text-muted">
                      {labelNl(TICKET_STATUS_NL, t.status)}
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
