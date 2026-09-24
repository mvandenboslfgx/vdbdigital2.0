import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/portal/empty-state";
import { StartConversationForm } from "@/components/portal/conversation-forms";
import { listPortalConversations } from "@/server/repositories/portal";
import { hasCustomerPermission } from "@/lib/auth/customer-permissions";

export const metadata: Metadata = {
  title: "Berichten",
  robots: { index: false },
};

export default async function PortalMessagesPage() {
  const { ctx, conversations } = await listPortalConversations();
  const canStart = hasCustomerPermission(ctx.customerRole, "portal.messages.create");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-h1">Berichten</h1>
        <p className="text-muted text-small mt-1">
          Beveiligde gesprekken met VDB Digital binnen je klantportaal.
        </p>
      </div>

      {canStart ? <StartConversationForm /> : null}

      <section>
        <h2 className="text-h3 mb-4">Gesprekken</h2>
        {conversations.length === 0 ? (
          <EmptyState
            title="Nog geen gesprekken"
            description={
              canStart
                ? "Start hierboven je eerste gesprek met VDB Digital."
                : "Wanneer VDB Digital een gesprek met jouw organisatie deelt, verschijnt dat hier."
            }
          />
        ) : (
          <ul className="space-y-3">
            {conversations.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/portal/berichten/${c.id}`}
                  className="block rounded-xl border border-border bg-surface p-5 transition-colors hover:border-primary"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{c.subject}</p>
                    <span className="text-small text-muted">{c.status}</span>
                  </div>
                  <p className="text-small text-muted mt-1">
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
