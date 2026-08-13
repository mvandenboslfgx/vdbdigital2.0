"use client";

import { useActionState } from "react";
import {
  adminTransitionSupportTicketStatusAction,
  type AdminSupportActionState,
} from "@/server/actions/admin-support-actions";
import { Button } from "@/components/ui/button";
import type { TicketStatusFormLabels } from "@/lib/admin/support-form-labels";

const initial: AdminSupportActionState = {};

const STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_CUSTOMER",
  "WAITING_FOR_VDB",
  "RESOLVED",
  "CLOSED",
] as const;

export function AdminTicketStatusForm({
  ticketId,
  currentStatus,
  labels,
}: {
  ticketId: string;
  currentStatus: string;
  /** Resolved server-side; this form does no dictionary lookups. */
  labels: TicketStatusFormLabels;
}) {
  const [state, formAction, pending] = useActionState(
    adminTransitionSupportTicketStatusAction,
    initial,
  );

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-xl border border-border p-5"
      data-testid="admin-support-status-form"
    >
      <input type="hidden" name="ticketId" value={ticketId} />
      <h3 className="text-h3">{labels.statusHeading}</h3>
      <p className="text-small text-muted">
        {labels.currentStatusTemplate.replace("{status}", currentStatus)}
      </p>
      <label htmlFor="toStatus" className="block text-small font-medium mb-1">
        {labels.newStatus}
      </label>
      <select
        id="toStatus"
        name="toStatus"
        defaultValue={currentStatus}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-small"
        data-testid="select-admin-support-status"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
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
      <Button type="submit" disabled={pending} data-testid="btn-admin-support-status">
        {pending ? labels.updating : labels.submit}
      </Button>
    </form>
  );
}
