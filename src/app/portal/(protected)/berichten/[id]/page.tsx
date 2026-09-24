import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LocaleLink } from "@/i18n/locale-link";
import { ReplyConversationForm } from "@/components/portal/conversation-forms";
import { getPortalConversation } from "@/server/repositories/portal";

export const metadata: Metadata = {
  title: "Gesprek",
  robots: { index: false, follow: false },
};

export default async function PortalConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { conversation, messages, denied } = await getPortalConversation(id);

  if (denied || !conversation) notFound();

  return (
    <div className="space-y-6">
      <div>
        <LocaleLink
          href="/portal/berichten"
          className="text-small text-primary hover:underline"
        >
          ← Terug naar berichten
        </LocaleLink>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-h1">{conversation.subject}</h1>
            <p className="text-small text-muted mt-1">
              Beveiligd gesprek · {conversation.status}
            </p>
          </div>
        </div>
      </div>

      <section className="space-y-3">
        {messages.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-5 text-small text-muted">
            Nog geen berichten in dit gesprek.
          </div>
        ) : (
          messages.map((message) => (
            <article
              key={message.id}
              className={
                message.mine
                  ? "ml-auto max-w-2xl rounded-2xl border border-primary/30 bg-primary-soft p-4"
                  : "mr-auto max-w-2xl rounded-2xl border border-border bg-surface p-4"
              }
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                <p className="text-small font-medium">
                  {message.mine ? "Jij" : message.author_name}
                </p>
                <time className="text-xs text-muted">
                  {new Date(message.created_at).toLocaleString("nl-NL")}
                </time>
              </div>
              <p className="text-small whitespace-pre-wrap break-words">
                {message.body}
              </p>
            </article>
          ))
        )}
      </section>

      <ReplyConversationForm
        conversationId={conversation.id}
        disabled={conversation.status === "CLOSED"}
      />
    </div>
  );
}
