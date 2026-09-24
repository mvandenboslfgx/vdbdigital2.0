import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminConversationReplyForm } from "@/components/admin/message-reply-form";
import { createServiceRoleClient } from "@/lib/database/server";
import { requireAdmin } from "@/server/auth/require-admin";
import { requirePermission } from "@/server/auth/require-permission";

export const metadata: Metadata = {
  title: "Klantgesprek",
  robots: { index: false, follow: false },
};

export default async function AdminConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireAdmin();
  await requirePermission(ctx, "messages.manage");

  const supabase = createServiceRoleClient();
  if (!supabase) notFound();

  const { data: conversation } = await supabase!
    .from("portal_conversations")
    .select("id, organization_id, subject, status, created_at, last_message_at")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!conversation) notFound();

  const [{ data: organization }, { data: messageRows }] = await Promise.all([
    supabase!
      .from("organizations")
      .select("legal_name, trade_name")
      .eq("id", conversation.organization_id)
      .maybeSingle(),
    supabase!
      .from("portal_messages")
      .select("id, body, created_at, author_user_id, is_internal")
      .eq("conversation_id", id)
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
  ]);

  const authorIds = Array.from(
    new Set((messageRows ?? []).map((m) => m.author_user_id).filter(Boolean)),
  );
  const names = new Map<string, string>();
  if (authorIds.length > 0) {
    const { data: profiles } = await supabase!
      .from("profiles")
      .select("id, full_name, email")
      .in("id", authorIds);
    for (const profile of profiles ?? []) {
      names.set(
        profile.id,
        profile.full_name?.trim() || profile.email || "Gebruiker",
      );
    }
  }

  const orgName =
    organization?.trade_name || organization?.legal_name || "Onbekende organisatie";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/messages" className="text-small text-primary hover:underline">
          ← Terug naar berichten
        </Link>
        <h1 className="text-h1 mt-3">{conversation.subject}</h1>
        <p className="text-small text-muted mt-1">
          {orgName} · {conversation.status}
        </p>
      </div>

      <section className="space-y-3">
        {(messageRows ?? []).length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-5 text-small text-muted">
            Nog geen berichten in dit gesprek.
          </div>
        ) : (
          (messageRows ?? []).map((message) => {
            const mine = message.author_user_id === ctx.user.id;
            return (
              <article
                key={message.id}
                className={
                  mine
                    ? "ml-auto max-w-2xl rounded-2xl border border-primary/30 bg-primary-soft p-4"
                    : "mr-auto max-w-2xl rounded-2xl border border-border bg-surface p-4"
                }
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <p className="text-small font-medium">
                    {mine ? "Jij" : names.get(message.author_user_id) ?? "Klant"}
                    {message.is_internal ? " · intern" : ""}
                  </p>
                  <time className="text-xs text-muted">
                    {new Date(message.created_at).toLocaleString("nl-NL")}
                  </time>
                </div>
                <p className="text-small whitespace-pre-wrap break-words">
                  {message.body}
                </p>
              </article>
            );
          })
        )}
      </section>

      <AdminConversationReplyForm
        conversationId={conversation.id}
        disabled={conversation.status === "CLOSED"}
      />
    </div>
  );
}
