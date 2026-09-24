"use client";

import { useActionState } from "react";
import {
  adminReplyConversationAction,
  adminReplySupportTicketAction,
  type AdminPortalActionState,
} from "@/server/actions/admin-portal-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const initial: AdminPortalActionState = {};

export function AdminConversationReplyForm({
  conversationId,
}: {
  conversationId: string;
}) {
  const [state, action, pending] = useActionState(
    adminReplyConversationAction,
    initial,
  );

  return (
    <form action={action} className="space-y-3 rounded-xl border border-border bg-surface p-5">
      <input type="hidden" name="conversationId" value={conversationId} />
      <Textarea
        name="body"
        label="Reactie naar klant"
        required
        minLength={1}
        maxLength={5000}
        rows={5}
      />
      {state.error ? <p className="text-small text-error">{state.error}</p> : null}
      {state.message ? <p className="text-small text-success">{state.message}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Versturen…" : "Reactie versturen"}
      </Button>
    </form>
  );
}

export function AdminSupportReplyForm({
  ticketId,
}: {
  ticketId: string;
}) {
  const [state, action, pending] = useActionState(
    adminReplySupportTicketAction,
    initial,
  );

  return (
    <form action={action} className="space-y-3 rounded-xl border border-border bg-surface p-5">
      <input type="hidden" name="ticketId" value={ticketId} />
      <Textarea
        name="body"
        label="Reactie naar klant"
        required
        minLength={1}
        maxLength={5000}
        rows={5}
      />
      <div className="space-y-1.5">
        <label htmlFor="status" className="block text-small font-medium">
          Ticketstatus na reactie
        </label>
        <select
          id="status"
          name="status"
          defaultValue="WAITING_FOR_CUSTOMER"
          className="w-full min-h-11 rounded-lg border border-border bg-background px-3 text-sm"
        >
          <option value="WAITING_FOR_CUSTOMER">Wachten op klant</option>
          <option value="IN_PROGRESS">In behandeling</option>
          <option value="OPEN">Open</option>
          <option value="RESOLVED">Opgelost</option>
          <option value="CLOSED">Gesloten</option>
        </select>
      </div>
      {state.error ? <p className="text-small text-error">{state.error}</p> : null}
      {state.message ? <p className="text-small text-success">{state.message}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Opslaan…" : "Reactie opslaan"}
      </Button>
    </form>
  );
}
