import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/container";
import { AdminTicketExternalReplyForm } from "@/components/admin/admin-ticket-external-reply-form";
import { AdminTicketInternalNoteForm } from "@/components/admin/admin-ticket-internal-note-form";
import { AdminTicketStatusForm } from "@/components/admin/admin-ticket-status-form";
import { requireAdmin } from "@/server/auth/require-admin";
import { requirePermission } from "@/server/auth/require-permission";
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from "@/lib/database/server";
import { TICKET_STATUS_KEYS, labelFor } from "@/lib/portal/labels";
import { getDictionary } from "@/i18n/get-dictionary";

export const metadata: Metadata = {
  title: "Supportticket",
  robots: { index: false },
};

type ReplyRow = {
  id: string;
  body: string;
  is_internal: boolean;
  created_at: string;
  author_user_id?: string | null;
};

function asReplyRows(data: unknown): ReplyRow[] {
  if (!data || typeof data !== "object") return [];
  const root = data as { items?: unknown; replies?: unknown };
  const items = Array.isArray(root.items)
    ? root.items
    : Array.isArray(root.replies)
      ? root.replies
      : Array.isArray(data)
        ? data
        : [];
  return items
    .filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null)
    .map((row) => ({
      id: String(row.id ?? ""),
      body: String(row.body ?? ""),
      is_internal: Boolean(row.is_internal),
      created_at: String(row.created_at ?? ""),
      author_user_id:
        typeof row.author_user_id === "string" ? row.author_user_id : null,
    }))
    .filter((row) => row.id.length > 0)
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
}

export default async function AdminSupportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t } = await getDictionary();
  const { id } = await params;
  const ctx = await requireAdmin();
  await requirePermission(ctx, "support.manage");

  const service = createServiceRoleClient();
  if (!service) notFound();

  const { data: ticket, error: ticketError } = await service
    .from("portal_support_tickets")
    .select(
      "id, ticket_number, subject, status, priority, category, description, created_at, organization_id, created_by",
    )
    .eq("id", id)
    .maybeSingle();

  if (ticketError || !ticket) notFound();

  const userClient = await createServerSupabaseClient();
  let replies: ReplyRow[] = [];
  if (userClient) {
    const { data: replyData } = await userClient.rpc(
      "list_portal_support_ticket_replies",
      {
        p_ticket_id: id,
        p_limit: 100,
      },
    );
    replies = asReplyRows(replyData);
  }

  const { data: flag } = await service
    .from("feature_flags")
    .select("enabled")
    .eq("key", "support_internal_notes_rpc")
    .maybeSingle();
  const internalNotesEnabled = flag?.enabled === true;

  const publicReplies = replies.filter((r) => !r.is_internal);
  const internalReplies = replies.filter((r) => r.is_internal);

  return (
    <div className="space-y-8" data-testid="admin-support-detail">
      <div>
        <Link
          href="/admin/support"
          className="text-small text-primary hover:underline"
        >
          ← Support
        </Link>
        <h1 className="text-h1 mt-2">{ticket.subject}</h1>
        <p className="text-muted text-small">
          {ticket.ticket_number} ·{" "}
          {labelFor(t, TICKET_STATUS_KEYS, ticket.status)} ·{" "}
          {ticket.priority} · {ticket.category}
        </p>
        <p className="text-small mt-3 whitespace-pre-wrap">{ticket.description}</p>
      </div>

      <Card>
        <h2 className="text-h3 mb-3">Externe berichten</h2>
        {publicReplies.length === 0 ? (
          <p className="text-small text-muted">Nog geen externe berichten.</p>
        ) : (
          <ul className="space-y-3">
            {publicReplies.map((r) => (
              <li
                key={r.id}
                className="border-b border-border/50 pb-3 text-small"
                data-testid={`admin-support-public-reply-${r.id.slice(0, 8)}`}
              >
                <p className="whitespace-pre-wrap">{r.body}</p>
                <p className="text-muted mt-1 text-xs">
                  {new Date(r.created_at).toLocaleString("nl-NL")} · publiek
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="text-h3 mb-3">Interne notities</h2>
        {internalReplies.length === 0 ? (
          <p className="text-small text-muted">Geen interne notities.</p>
        ) : (
          <ul className="space-y-3">
            {internalReplies.map((r) => (
              <li
                key={r.id}
                className="rounded-md border border-amber-700/40 bg-amber-950/20 p-3 text-small"
                data-testid={`admin-support-internal-reply-${r.id.slice(0, 8)}`}
              >
                <p className="text-xs font-medium text-amber-200 mb-1">
                  Interne notitie
                </p>
                <p className="whitespace-pre-wrap">{r.body}</p>
                <p className="text-muted mt-1 text-xs">
                  {new Date(r.created_at).toLocaleString("nl-NL")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminTicketExternalReplyForm ticketId={ticket.id} />
        <AdminTicketInternalNoteForm
          ticketId={ticket.id}
          enabled={internalNotesEnabled}
        />
      </div>

      <AdminTicketStatusForm
        ticketId={ticket.id}
        currentStatus={String(ticket.status).toUpperCase()}
      />
    </div>
  );
}
