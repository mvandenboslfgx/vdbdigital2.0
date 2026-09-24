import type { Metadata } from "next";
import { EmptyState } from "@/components/portal/empty-state";
import { StartConversationForm } from "@/components/portal/conversation-forms";
import { LocaleLink } from "@/i18n/locale-link";
import { listPortalConversations } from "@/server/repositories/portal";

export const metadata: Metadata = {
  title: "Berichten",
  robots: { index: false, follow: false },
};

export default async function PortalMessagesPage() {
  const { conversations, denied } = await listPortalConversations();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-h1">Berichten</h1>
        <p className="text-muted text-small mt-1">
          Beveiligde gesprekken tussen jouw organisatie en VDB Digital.
        </p>
      </div>

      {!denied ? <StartConversationForm /> : null}

      <section>
        <h2 className="text-h3 mb-4">Gesprekken</h2>
        {denied ? (
          <EmptyState
            title="Geen toegang"
            description="Je rol heeft geen toegang tot klantgesprekken."
          />
        ) : conversations.length === 0 ? (
          <EmptyState
            title="Nog geen gesprekken"
            description="Start hierboven een gesprek. Reacties van VDB Digital verschijnen in dezelfde thread."
          />
        ) : (
          <ul className="space-y-3">
            {conversations.map((c) => (
              <li key={c.id}>
                <LocaleLink
                  href={`/portal/berichten/${c.id}`}
                  className="block rounded-xl border border-border bg-surface p-5 hover:border-primary transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{c.subject}</p>
                      <p className="text-small text-muted mt-1">
                        {c.last_message_at
                          ? `Laatste bericht ${new Date(c.last_message_at).toLocaleString("nl-NL")}`
                          : "Nog geen berichten"}
                      </p>
                    </div>
                    <span className="text-xs uppercase tracking-wide text-muted">
                      {c.status}
                    </span>
                  </div>
                </LocaleLink>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
