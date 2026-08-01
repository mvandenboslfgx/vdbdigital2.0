"use client";

import { useActionState } from "react";
import {
  adminInternalNoteSupportTicketAction,
  type AdminSupportActionState,
} from "@/server/actions/admin-support-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const initial: AdminSupportActionState = {};

export function AdminTicketInternalNoteForm({
  ticketId,
  enabled,
}: {
  ticketId: string;
  enabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    adminInternalNoteSupportTicketAction,
    initial,
  );

  if (!enabled) {
    return (
      <div
        className="rounded-xl border border-dashed border-border p-5"
        data-testid="admin-support-internal-note-disabled"
      >
        <h3 className="text-h3">Interne notitie</h3>
        <p className="text-small text-muted mt-2">
          Interne notities zijn uitgeschakeld (
          <code>support_internal_notes_rpc=false</code>). Er wordt geen externe
          reactie als fallback gebruikt.
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-xl border border-amber-700/40 bg-amber-950/20 p-5"
      data-testid="admin-support-internal-note-form"
    >
      <input type="hidden" name="ticketId" value={ticketId} />
      <h3 className="text-h3">Interne notitie</h3>
      <p className="text-small text-muted">
        Alleen zichtbaar voor Staff/Admin/Owner. Nooit voor Customer/Partner.
      </p>
      <label htmlFor="internal-body" className="block text-small font-medium mb-1">
        Notitie
      </label>
      <Textarea
        id="internal-body"
        name="body"
        required
        rows={3}
        maxLength={5000}
        data-testid="input-admin-support-internal-note"
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
      <Button type="submit" disabled={pending} data-testid="btn-admin-support-internal-note">
        {pending ? "Opslaan…" : "Interne notitie opslaan"}
      </Button>
    </form>
  );
}
