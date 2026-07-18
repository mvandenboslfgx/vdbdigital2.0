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

export function CreateMilestoneForm({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState(createMilestoneAction, {});
  return (
    <form action={action} className="space-y-3 rounded-xl border border-border p-4">
      <h3 className="font-medium">Mijlpaal toevoegen</h3>
      <FormMessage state={state} />
      <input type="hidden" name="projectId" value={projectId} />
      <Input name="title" placeholder="Titel" required maxLength={200} />
      <Textarea name="description" placeholder="Omschrijving (intern of zichtbaar)" rows={2} />
      <Input name="dueDate" type="date" />
      <Input name="sortOrder" type="number" min={0} defaultValue={0} />
      <label className="flex gap-2 text-small items-center">
        <input type="checkbox" name="customerVisible" value="1" />
        Zichtbaar voor klant
      </label>
      <label className="flex gap-2 text-small items-center">
        <input type="checkbox" name="requiresCustomerAction" value="1" />
        Vereist klantactie
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Opslaan…" : "Mijlpaal opslaan"}
      </Button>
    </form>
  );
}

export function CreateActionForm({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState(createActionItemAction, {});
  return (
    <form action={action} className="space-y-3 rounded-xl border border-border p-4">
      <h3 className="font-medium">Actie toevoegen</h3>
      <FormMessage state={state} />
      <input type="hidden" name="projectId" value={projectId} />
      <Input name="title" placeholder="Titel" required maxLength={200} />
      <Textarea name="description" placeholder="Omschrijving" rows={2} />
      <select
        name="assignedToType"
        className="w-full min-h-11 px-3 rounded-lg border border-border bg-background text-sm"
        defaultValue="INTERNAL"
      >
        <option value="INTERNAL">Intern</option>
        <option value="CUSTOMER">Klant</option>
        <option value="UNASSIGNED">Niet toegewezen</option>
      </select>
      <Input name="dueDate" type="date" />
      <label className="flex gap-2 text-small items-center">
        <input type="checkbox" name="customerVisible" value="1" />
        Klantzichtbaar (verplicht bij klantactie)
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Opslaan…" : "Actie opslaan"}
      </Button>
    </form>
  );
}

export function CreateDeliverableForm({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState(createDeliverableAction, {});
  return (
    <form action={action} className="space-y-3 rounded-xl border border-border p-4">
      <h3 className="font-medium">Oplevering (metadata)</h3>
      <p className="text-small text-muted">
        Bestanden volgen in de documentenfase. Hier alleen titel en goedkeuringsstatus.
      </p>
      <FormMessage state={state} />
      <input type="hidden" name="projectId" value={projectId} />
      <Input name="title" placeholder="Titel" required maxLength={200} />
      <Textarea name="description" placeholder="Omschrijving" rows={2} />
      <label className="flex gap-2 text-small items-center">
        <input type="checkbox" name="requiresApproval" value="1" defaultChecked />
        Vereist klantgoedkeuring
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Opslaan…" : "Concept opslaan"}
      </Button>
    </form>
  );
}

export function ShareDeliverableButton({
  deliverableId,
  version,
}: {
  deliverableId: string;
  version: number;
}) {
  const [state, action, pending] = useActionState(shareDeliverableAction, {});
  return (
    <form action={action} className="inline-flex flex-col gap-1">
      <input type="hidden" name="deliverableId" value={deliverableId} />
      <input type="hidden" name="expectedVersion" value={version} />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Delen…" : "Deel met klant"}
      </Button>
      <FormMessage state={state} />
    </form>
  );
}
