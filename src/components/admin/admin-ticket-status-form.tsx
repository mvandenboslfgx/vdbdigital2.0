"use client";

import { useActionState } from "react";
import {
  adminTransitionSupportTicketStatusAction,
  type AdminSupportActionState,
} from "@/server/actions/admin-support-actions";
import { Button } from "@/components/ui/button";

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
}: {
  ticketId: string;
  currentStatus: string;
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
      <h3 className="text-h3">Status</h3>
      <p className="text-small text-muted">Huidig: {currentStatus}</p>
      <label htmlFor="toStatus" className="block text-small font-medium mb-1">
        Nieuwe status
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
        {pending ? "Bijwerken…" : "Status opslaan"}
      </Button>
    </form>
  );
}
