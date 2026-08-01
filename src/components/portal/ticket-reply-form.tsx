"use client";

import { useActionState } from "react";
import {
  replySupportTicketAction,
  type PortalActionState,
} from "@/server/actions/portal-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const initial: PortalActionState = {};

export type TicketReplyFormLabels = {
  label: string;
  submit: string;
  submitting: string;
};

export function TicketReplyForm({
  ticketId,
  labels,
}: {
  ticketId: string;
  labels: TicketReplyFormLabels;
}) {
  const [state, formAction, pending] = useActionState(
    replySupportTicketAction,
    initial,
  );

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-border p-5">
      <input type="hidden" name="ticketId" value={ticketId} />
      <label htmlFor="body" className="block text-small font-medium mb-1">
        {labels.label}
      </label>
      <Textarea id="body" name="body" required rows={4} maxLength={5000} />
      {state.error && (
        <p className="text-small text-error" role="alert">
          {state.error}
        </p>
      )}
      {state.message && (
        <p className="text-small text-success" role="status">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? labels.submitting : labels.submit}
      </Button>
    </form>
  );
}
