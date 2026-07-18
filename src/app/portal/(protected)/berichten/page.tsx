import type { Metadata } from "next";
import { EmptyState } from "@/components/portal/empty-state";
import { listPortalConversations } from "@/server/repositories/portal";

export const metadata: Metadata = {
  title: "Berichten",
  robots: { index: false },
};

export default async function PortalMessagesPage() {
  const { conversations } = await listPortalConversations();

  return (
    <div className="space-y-6">
      <h1 className="text-h1">Berichten</h1>
      <p className="text-muted text-small">
        Beveiligd berichtencentrum met VDB Digital. Geen externe chatwidget.
      </p>
      {conversations.length === 0 ? (
        <EmptyState
          title="Nog geen gesprekken"
          description="Wanneer VDB Digital of jij een gesprek start, verschijnt dat hier."
          actionHref="/portal/support"
          actionLabel="Open een supportticket"
        />
      ) : (
        <ul className="space-y-3">
          {conversations.map((c) => (
            <li
              key={c.id}
              className="rounded-xl border border-border bg-surface p-5"
            >
              <p className="font-medium">{c.subject}</p>
              <p className="text-small text-muted mt-1">
                {c.last_message_at
                  ? new Date(c.last_message_at).toLocaleString("nl-NL")
                  : "Nog geen berichten"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
