"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createActionItemAction,
  createDeliverableAction,
  createMilestoneAction,
  shareDeliverableAction,
  type ProjectActionState,
} from "@/server/actions/project-actions";
import type {
  ActionFormLabels,
  DeliverableFormLabels,
  MilestoneFormLabels,
  ShareDeliverableLabels,
} from "@/lib/admin/project-forms-labels";

function FormMessage({ state }: { state: ProjectActionState }) {
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

export function CreateMilestoneForm({
  projectId,
  labels,
}: {
  projectId: string;
  labels: MilestoneFormLabels;
}) {
  const [state, action, pending] = useActionState(createMilestoneAction, {});
  return (
    <form action={action} className="space-y-3 rounded-xl border border-border p-4">
      <h3 className="font-medium">{labels.heading}</h3>
      <FormMessage state={state} />
      <input type="hidden" name="projectId" value={projectId} />
      <Input name="title" placeholder={labels.title} required maxLength={200} />
      <Textarea name="description" placeholder={labels.description} rows={2} />
      <Input name="dueDate" type="date" />
      <Input name="sortOrder" type="number" min={0} defaultValue={0} />
      <label className="flex gap-2 text-small items-center">
        <input type="checkbox" name="customerVisible" value="1" />
        {labels.customerVisible}
      </label>
      <label className="flex gap-2 text-small items-center">
        <input type="checkbox" name="requiresCustomerAction" value="1" />
        {labels.requiresCustomerAction}
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? labels.saving : labels.submit}
      </Button>
    </form>
  );
}

export function CreateActionForm({
  projectId,
  labels,
}: {
  projectId: string;
  labels: ActionFormLabels;
}) {
  const [state, action, pending] = useActionState(createActionItemAction, {});
  return (
    <form action={action} className="space-y-3 rounded-xl border border-border p-4">
      <h3 className="font-medium">{labels.heading}</h3>
      <FormMessage state={state} />
      <input type="hidden" name="projectId" value={projectId} />
      <Input name="title" placeholder={labels.title} required maxLength={200} />
      <Textarea name="description" placeholder={labels.description} rows={2} />
      <select
        name="assignedToType"
        className="w-full min-h-11 px-3 rounded-lg border border-border bg-background text-sm"
        defaultValue="INTERNAL"
      >
        <option value="INTERNAL">{labels.assignedInternal}</option>
        <option value="CUSTOMER">{labels.assignedCustomer}</option>
        <option value="UNASSIGNED">{labels.assignedUnassigned}</option>
      </select>
      <Input name="dueDate" type="date" />
      <label className="flex gap-2 text-small items-center">
        <input type="checkbox" name="customerVisible" value="1" />
        {labels.customerVisible}
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? labels.saving : labels.submit}
      </Button>
    </form>
  );
}

export function CreateDeliverableForm({
  projectId,
  labels,
}: {
  projectId: string;
  labels: DeliverableFormLabels;
}) {
  const [state, action, pending] = useActionState(createDeliverableAction, {});
  return (
    <form action={action} className="space-y-3 rounded-xl border border-border p-4">
      <h3 className="font-medium">{labels.heading}</h3>
      <p className="text-small text-muted">{labels.note}</p>
      <FormMessage state={state} />
      <input type="hidden" name="projectId" value={projectId} />
      <Input name="title" placeholder={labels.title} required maxLength={200} />
      <Textarea name="description" placeholder={labels.description} rows={2} />
      <label className="flex gap-2 text-small items-center">
        <input type="checkbox" name="requiresApproval" value="1" defaultChecked />
        {labels.requiresApproval}
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? labels.saving : labels.submit}
      </Button>
    </form>
  );
}

export function ShareDeliverableButton({
  deliverableId,
  version,
  labels,
}: {
  deliverableId: string;
  version: number;
  labels: ShareDeliverableLabels;
}) {
  const [state, action, pending] = useActionState(shareDeliverableAction, {});
  return (
    <form action={action} className="inline-flex flex-col gap-1">
      <input type="hidden" name="deliverableId" value={deliverableId} />
      <input type="hidden" name="expectedVersion" value={version} />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? labels.sharing : labels.submit}
      </Button>
      <FormMessage state={state} />
    </form>
  );
}
