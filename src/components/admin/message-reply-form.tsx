"use client";

import { useActionState } from "react";
import {
  replyAdminConversationAction,
  type AdminPortalActionState,
} from "@/server/actions/admin-portal-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const initial: AdminPortalActionState = {};

export function AdminConversationReplyForm({
  conversationId,
  disabled = false,
}: {
  conversationId: string;
  disabled?: boolean;
}) {
  const [state, action, pending] = useActionState(
    replyAdminConversationAction,
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
        rows={5}
        disabled={disabled}
      />
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
