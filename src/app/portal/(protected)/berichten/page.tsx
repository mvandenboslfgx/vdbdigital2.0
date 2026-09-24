import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/portal/empty-state";
import { listPortalConversations } from "@/server/repositories/portal";
import { StartConversationForm } from "@/components/portal/conversation-forms";

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
          Beveiligd berichtencentrum met VDB Digital.
        </p>
      </div>

      {!denied ? <StartConversationForm /> : null}

      <section>
        <h2 className="text-h3 mb-4">Gesprekken</h2>
        {denied ? (
          <EmptyState
            title="Geen toegang"
            description="Je hebt geen rechten om berichten te gebruiken."
          />
        ) : conversations.length === 0 ? (
          <EmptyState
            title="Nog geen gesprekken"
            description="Start hierboven een gesprek. Reacties van VDB Digital verschijnen daarna in dezelfde thread."
          />
        ) : (
          <ul className="space-y-3">
            {conversations.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/portal/berichten/${c.id}`}
                  className="block rounded-xl border border-border bg-surface p-5 hover:border-primary transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{c.subject}</p>
                    <span className="text-xs text-muted">{c.status}</span>
                  </div>
                  <p className="text-small text-muted mt-2">
                    {c.last_message_at
                      ? `Laatste bericht ${new Date(c.last_message_at).toLocaleString("nl-NL")}`
                      : "Nog geen berichten"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
