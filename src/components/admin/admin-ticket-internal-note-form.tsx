"use client";

import { useActionState } from "react";
import {
  adminInternalNoteSupportTicketAction,
  type AdminSupportActionState,
} from "@/server/actions/admin-support-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { TicketInternalNoteFormLabels } from "@/lib/admin/support-form-labels";

const initial: AdminSupportActionState = {};

export function AdminTicketInternalNoteForm({
  ticketId,
  enabled,
  labels,
}: {
  ticketId: string;
  enabled: boolean;
  /** Resolved server-side; this form does no dictionary lookups. */
  labels: TicketInternalNoteFormLabels;
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
        <h3 className="text-h3">{labels.heading}</h3>
        <p className="text-small text-muted mt-2">
          <code>support_internal_notes_rpc=false</code> — {labels.disabled}
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
      <h3 className="text-h3">{labels.heading}</h3>
      <p className="text-small text-muted">{labels.visibility}</p>
      <label htmlFor="internal-body" className="block text-small font-medium mb-1">
        {labels.field}
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
        {pending ? labels.saving : labels.submit}
      </Button>
    </form>
  );
}
