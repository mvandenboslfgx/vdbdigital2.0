"use client";

import { useActionState } from "react";
import {
  adminReplySupportTicketAction,
  type AdminSupportActionState,
} from "@/server/actions/admin-support-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const initial: AdminSupportActionState = {};

export function AdminTicketExternalReplyForm({ ticketId }: { ticketId: string }) {
  const [state, formAction, pending] = useActionState(
    adminReplySupportTicketAction,
    initial,
  );

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-xl border border-border p-5"
      data-testid="admin-support-external-reply-form"
    >
      <input type="hidden" name="ticketId" value={ticketId} />
      <h3 className="text-h3">Externe reactie</h3>
      <p className="text-small text-muted">
        Zichtbaar voor de klant/partner. Geen interne notitie.
      </p>
      <label htmlFor="external-body" className="block text-small font-medium mb-1">
        Bericht
      </label>
      <Textarea
        id="external-body"
        name="body"
        required
        rows={4}
        maxLength={5000}
        data-testid="input-admin-support-external-reply"
      />
      {state.error ? (
        <p className="text-small text-error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="text-small text-success" role="status">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} data-testid="btn-admin-support-external-reply">
        {pending ? "Versturen…" : "Externe reactie versturen"}
      </Button>
    </form>
  );
}
