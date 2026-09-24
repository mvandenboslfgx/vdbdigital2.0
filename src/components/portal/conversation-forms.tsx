"use client";

import { useActionState } from "react";
import {
  createPortalConversationAction,
  replyPortalConversationAction,
  type PortalActionState,
} from "@/server/actions/portal-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const initial: PortalActionState = {};

export function StartConversationForm() {
  const [state, action, pending] = useActionState(
    createPortalConversationAction,
    initial,
  );

  return (
    <form action={action} className="space-y-4 rounded-xl border border-border bg-surface p-5">
      <div>
        <h2 className="text-h3">Nieuw gesprek</h2>
        <p className="text-small text-muted mt-1">
          Stuur een beveiligd bericht naar VDB Digital.
        </p>
      </div>
      <Input
        name="subject"
        label="Onderwerp"
        required
        minLength={3}
        maxLength={200}
      />
      <Textarea
        name="body"
        label="Bericht"
        required
        minLength={2}
        maxLength={5000}
        rows={5}
      />
      {state.error ? (
        <p className="text-small text-error" role="alert">{state.error}</p>
      ) : null}
      {state.message ? (
        <p className="text-small text-success" role="status">{state.message}</p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Versturen…" : "Gesprek starten"}
      </Button>
    </form>
  );
}

export function ReplyConversationForm({
  conversationId,
  disabled = false,
}: {
  conversationId: string;
  disabled?: boolean;
}) {
  const [state, action, pending] = useActionState(
    replyPortalConversationAction,
    initial,
  );

  return (
    <form action={action} className="space-y-3 rounded-xl border border-border bg-surface p-5">
      <input type="hidden" name="conversationId" value={conversationId} />
      <Textarea
        name="body"
        label="Reactie"
        required
        minLength={1}
        maxLength={5000}
        rows={4}
        disabled={disabled}
      />
      {state.error ? (
        <p className="text-small text-error" role="alert">{state.error}</p>
      ) : null}
      {state.message ? (
        <p className="text-small text-success" role="status">{state.message}</p>
      ) : null}
      <Button type="submit" disabled={pending || disabled}>
        {pending ? "Versturen…" : "Reactie versturen"}
      </Button>
    </form>
  );
}
