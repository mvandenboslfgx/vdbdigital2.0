"use client";

import { useActionState } from "react";
import {
  replyAdminSupportTicketAction,
  type AdminPortalActionState,
} from "@/server/actions/admin-portal-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const initial: AdminPortalActionState = {};

export function AdminSupportReplyForm({
  ticketId,
  disabled = false,
}: {
  ticketId: string;
  disabled?: boolean;
}) {
  const [state, action, pending] = useActionState(
    replyAdminSupportTicketAction,
    initial,
  );

  return (
    <form action={action} className="space-y-4 rounded-xl border border-border bg-surface p-5">
      <input type="hidden" name="ticketId" value={ticketId} />

      <Textarea
        name="body"
        label="Reactie aan klant"
        required
        minLength={1}
        maxLength={5000}
        rows={5}
        disabled={disabled}
      />

      <div>
        <label htmlFor="status" className="mb-1 block text-small font-medium">
          Status na reactie
        </label>
        <select
          id="status"
          name="status"
          defaultValue="WAITING_FOR_CUSTOMER"
          disabled={disabled}
          className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
        >
          <option value="WAITING_FOR_CUSTOMER">Wachten op klant</option>
          <option value="IN_PROGRESS">In behandeling</option>
          <option value="OPEN">Open</option>
          <option value="RESOLVED">Opgelost</option>
          <option value="CLOSED">Gesloten</option>
        </select>
      </div>

      {state.error ? (
        <p className="text-small text-error" role="alert">{state.error}</p>
      ) : null}
      {state.message ? (
        <p className="text-small text-success" role="status">{state.message}</p>
      ) : null}

      <Button type="submit" disabled={pending || disabled}>
        {pending ? "Versturen…" : "Reactie verzenden"}
      </Button>
    </form>
  );
}
