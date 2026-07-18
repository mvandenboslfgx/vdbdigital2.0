"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  approveDeliverableAction,
  completeCustomerActionAction,
  rejectDeliverableAction,
  submitProjectFeedbackAction,
} from "@/server/actions/portal-project-actions";
import type { PortalActionState } from "@/server/actions/portal-actions";

function Msg({ state }: { state: PortalActionState }) {
  if (state.error) {
    return (
      <p className="text-sm text-red-600" role="alert">
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return (
      <p className="text-sm text-green-700" role="status">
        {state.message}
      </p>
    );
  }
  return null;
}

export function CompleteActionForm({
  actionId,
  version,
}: {
  actionId: string;
  version: number;
}) {
  const [state, action, pending] = useActionState(
    completeCustomerActionAction,
    {},
  );
  return (
    <form action={action} className="space-y-2 mt-3">
      <input type="hidden" name="actionId" value={actionId} />
      <input type="hidden" name="expectedVersion" value={version} />
      <Textarea name="note" placeholder="Optionele toelichting" rows={2} maxLength={2000} />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Bezig…" : "Markeer als afgerond"}
      </Button>
      <Msg state={state} />
    </form>
  );
}

export function ApproveDeliverableForm({
  deliverableId,
  version,
}: {
  deliverableId: string;
  version: number;
}) {
  const [state, action, pending] = useActionState(approveDeliverableAction, {});
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="deliverableId" value={deliverableId} />
      <input type="hidden" name="expectedVersion" value={version} />
      <input type="hidden" name="confirm" value="yes" />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Bezig…" : "Goedkeuren"}
      </Button>
      <Msg state={state} />
    </form>
  );
}

export function RejectDeliverableForm({
  deliverableId,
  version,
}: {
  deliverableId: string;
  version: number;
}) {
  const [state, action, pending] = useActionState(rejectDeliverableAction, {});
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="deliverableId" value={deliverableId} />
      <input type="hidden" name="expectedVersion" value={version} />
      <Textarea
        name="reason"
        required
        minLength={3}
        placeholder="Reden voor afwijzing"
        rows={2}
        maxLength={2000}
      />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "Bezig…" : "Afwijzen"}
      </Button>
      <Msg state={state} />
    </form>
  );
}

export function ProjectFeedbackForm({
  projectId,
  deliverableId,
}: {
  projectId: string;
  deliverableId?: string;
}) {
  const [state, action, pending] = useActionState(
    submitProjectFeedbackAction,
    {},
  );
  return (
    <form action={action} className="space-y-3 rounded-xl border border-border p-4">
      <h3 className="font-medium">Feedback plaatsen</h3>
      <input type="hidden" name="projectId" value={projectId} />
      {deliverableId ? (
        <input type="hidden" name="deliverableId" value={deliverableId} />
      ) : null}
      <Textarea
        name="body"
        required
        minLength={2}
        maxLength={4000}
        rows={4}
        placeholder="Jouw feedback (platte tekst)"
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Versturen…" : "Feedback versturen"}
      </Button>
      <Msg state={state} />
    </form>
  );
}
