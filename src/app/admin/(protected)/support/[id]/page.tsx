import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminSupportReplyForm } from "@/components/admin/support-reply-form";
import { createServiceRoleClient } from "@/lib/database/server";
import { TICKET_STATUS_NL, labelNl } from "@/lib/portal/labels";
import { requireAdmin } from "@/server/auth/require-admin";
import { requirePermission } from "@/server/auth/require-permission";

export const metadata: Metadata = {
  title: "Supportticket",
  robots: { index: false, follow: false },
};

export default async function AdminSupportTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireAdmin();
  await requirePermission(ctx, "support.manage");

  const supabase = createServiceRoleClient();
  if (!supabase) notFound();

  const { data: ticket } = await supabase!
    .from("portal_support_tickets")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!ticket) notFound();

  const [{ data: organization }, { data: replies }] = await Promise.all([
    supabase!
      .from("organizations")
      .select("legal_name, trade_name")
      .eq("id", ticket.organization_id)
      .maybeSingle(),
    supabase!
      .from("portal_support_replies")
      .select("id, body, created_at, author_user_id, is_internal")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true }),
  ]);

  const authorIds = Array.from(
    new Set((replies ?? []).map((reply) => reply.author_user_id).filter(Boolean)),
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
  const closed = ticket.status === "CLOSED";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/support" className="text-small text-primary hover:underline">
          ← Terug naar support
        </Link>
        <h1 className="text-h1 mt-3">
          {ticket.ticket_number}: {ticket.subject}
        </h1>
        <p className="text-small text-muted mt-1">
          {orgName} · {labelNl(TICKET_STATUS_NL, ticket.status)} · prioriteit {ticket.priority}
        </p>
      </div>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-h3 mb-2">Vraag van klant</h2>
        <p className="text-small whitespace-pre-wrap">{ticket.description}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-h3">Reacties</h2>
        {(replies ?? []).length === 0 ? (
          <p className="text-small text-muted">Nog geen reacties.</p>
        ) : (
          (replies ?? []).map((reply) => {
            const mine = reply.author_user_id === ctx.user.id;
            return (
              <article
                key={reply.id}
                className={
                  mine
                    ? "ml-auto max-w-2xl rounded-2xl border border-primary/30 bg-primary-soft p-4"
                    : "mr-auto max-w-2xl rounded-2xl border border-border bg-surface p-4"
                }
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <p className="text-small font-medium">
                    {mine ? "Jij" : names.get(reply.author_user_id) ?? "Klant"}
                    {reply.is_internal ? " · intern" : ""}
                  </p>
                  <time className="text-xs text-muted">
                    {new Date(reply.created_at).toLocaleString("nl-NL")}
                  </time>
                </div>
                <p className="text-small whitespace-pre-wrap break-words">
                  {reply.body}
                </p>
              </article>
            );
          })
        )}
      </section>

      <AdminSupportReplyForm ticketId={ticket.id} disabled={closed} />
    </div>
  );
}
