"use client";

import { useActionState } from "react";
import {
  resendInvitationAction,
  revokeInvitationAction,
  type AdminPortalActionState,
} from "@/server/actions/admin-portal-actions";
import { Button } from "@/components/ui/button";

const initial: AdminPortalActionState = {};

function statusLabel(status: string) {
  switch (status) {
    case "SENT":
      return "Verzonden";
    case "FAILED":
      return "Mislukt";
    case "PENDING":
      return "In behandeling";
    case "ACCEPTED":
      return "Geaccepteerd";
    case "REVOKED":
      return "Ingetrokken";
    case "EXPIRED":
      return "Verlopen";
    default:
      return status;
  }
}

export function InvitationActions(props: {
  invitation: {
    id: string;
    email: string;
    status: string;
    expires_at: string;
    created_at: string;
    sent_at?: string | null;
    last_error?: string | null;
    retry_count?: number | null;
  };
}) {
  const { invitation } = props;
  const [resendState, resendAction, resendPending] = useActionState(
    resendInvitationAction,
    initial,
  );
  const [revokeState, revokeAction, revokePending] = useActionState(
    revokeInvitationAction,
    initial,
  );
  const canResend = ["PENDING", "SENT", "FAILED"].includes(invitation.status);
  const canRevoke = !["ACCEPTED", "REVOKED"].includes(invitation.status);

  return (
    <li className="border-b border-border/50 pb-3 space-y-2">
      <p>
        <span className="font-medium">{invitation.email}</span>
        {" · "}
        {statusLabel(invitation.status)}
      </p>
      <p className="text-muted">
        Aangemaakt {new Date(invitation.created_at).toLocaleString("nl-NL")}
        {invitation.sent_at
          ? ` · verzonden ${new Date(invitation.sent_at).toLocaleString("nl-NL")}`
          : ""}
        {` · verloopt ${new Date(invitation.expires_at).toLocaleDateString("nl-NL")}`}
        {invitation.retry_count
          ? ` · pogingen ${invitation.retry_count}`
          : ""}
      </p>
      {invitation.status === "FAILED" && invitation.last_error ? (
        <p className="text-error" role="alert">
          {invitation.last_error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {canResend ? (
          <form action={resendAction}>
            <input type="hidden" name="invitationId" value={invitation.id} />
            <Button type="submit" size="sm" disabled={resendPending}>
              {resendPending ? "Versturen…" : "Opnieuw versturen"}
            </Button>
          </form>
        ) : null}
        {canRevoke ? (
          <form action={revokeAction}>
            <input type="hidden" name="invitationId" value={invitation.id} />
            <Button
              type="submit"
              size="sm"
              variant="secondary"
              disabled={revokePending}
            >
              {revokePending ? "Intrekken…" : "Intrekken"}
            </Button>
          </form>
        ) : null}
      </div>
      {resendState.error || revokeState.error ? (
        <p className="text-error" role="alert">
          {resendState.error || revokeState.error}
        </p>
      ) : null}
      {resendState.notice || revokeState.notice ? (
        <p className="text-success" role="status">
          {resendState.notice || revokeState.notice}
        </p>
      ) : null}
    </li>
  );
}
