"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  updateProjectAction,
  type ProjectActionState,
} from "@/server/actions/project-actions";
import { PROJECT_TYPES, PROJECT_STATUSES, PROJECT_PRIORITIES } from "@/lib/validation/projects";
import {
  PROJECT_STATUS_NL,
  PROJECT_TYPE_NL,
  labelNl,
} from "@/lib/portal/labels";

const PRIORITY_NL: Record<string, string> = {
  LOW: "Laag",
  NORMAL: "Normaal",
  HIGH: "Hoog",
  URGENT: "Urgent",
};

type Project = {
  id: string;
  name: string;
  description: string | null;
  project_type: string;
  status: string;
  priority: string;
  visibility: string;
  progress_percent: number;
  start_date: string | null;
  planned_delivery_date: string | null;
  actual_delivery_date: string | null;
  project_manager_id: string | null;
  version: number;
};

export function ProjectSettingsForm({ project }: { project: Project }) {
  const [state, action, pending] = useActionState<
    ProjectActionState,
    FormData
  >(updateProjectAction, {});

  return (
    <form action={action} className="space-y-4 max-w-xl">
      <input type="hidden" name="projectId" value={project.id} />
      <input type="hidden" name="expectedVersion" value={project.version} />

      {state.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="text-sm text-green-700" role="status">
          {state.message}
        </p>
      ) : null}

      <div>
        <label htmlFor="name" className="block text-small font-medium mb-1">
          Naam
        </label>
        <Input id="name" name="name" required defaultValue={project.name} maxLength={200} />
      </div>

      <div>
        <label htmlFor="description" className="block text-small font-medium mb-1">
          Omschrijving
        </label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={project.description ?? ""}
          maxLength={5000}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="projectType" className="block text-small font-medium mb-1">
            Type
          </label>
          <select
            id="projectType"
            name="projectType"
            defaultValue={project.project_type}
            className="w-full min-h-11 px-3 rounded-lg border border-border bg-background text-sm"
          >
            {PROJECT_TYPES.map((t) => (
              <option key={t} value={t}>
                {labelNl(PROJECT_TYPE_NL, t)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="status" className="block text-small font-medium mb-1">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={project.status}
            className="w-full min-h-11 px-3 rounded-lg border border-border bg-background text-sm"
          >
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {labelNl(PROJECT_STATUS_NL, s)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="priority" className="block text-small font-medium mb-1">
            Prioriteit
          </label>
          <select
            id="priority"
            name="priority"
            defaultValue={project.priority}
            className="w-full min-h-11 px-3 rounded-lg border border-border bg-background text-sm"
          >
            {PROJECT_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_NL[p] ?? p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="visibility" className="block text-small font-medium mb-1">
            Klantzichtbaarheid
          </label>
          <select
            id="visibility"
            name="visibility"
            defaultValue={project.visibility}
            className="w-full min-h-11 px-3 rounded-lg border border-border bg-background text-sm"
          >
            <option value="INTERNAL">Alleen intern</option>
            <option value="CUSTOMER_VISIBLE">Zichtbaar voor klant</option>
          </select>
        </div>
        <div>
          <label htmlFor="progressPercent" className="block text-small font-medium mb-1">
            Voortgang (%)
          </label>
          <Input
            id="progressPercent"
            name="progressPercent"
            type="number"
            min={0}
            max={100}
            defaultValue={project.progress_percent}
          />
        </div>
        <div>
          <label htmlFor="startDate" className="block text-small font-medium mb-1">
            Startdatum
          </label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={project.start_date ?? ""}
          />
        </div>
        <div>
          <label htmlFor="plannedDeliveryDate" className="block text-small font-medium mb-1">
            Geplande oplevering
          </label>
          <Input
            id="plannedDeliveryDate"
            name="plannedDeliveryDate"
            type="date"
            defaultValue={project.planned_delivery_date ?? ""}
          />
        </div>
        <div>
          <label htmlFor="actualDeliveryDate" className="block text-small font-medium mb-1">
            Werkelijke oplevering
          </label>
          <Input
            id="actualDeliveryDate"
            name="actualDeliveryDate"
            type="date"
            defaultValue={project.actual_delivery_date ?? ""}
          />
        </div>
      </div>

      <input
        type="hidden"
        name="projectManagerId"
        value={project.project_manager_id ?? ""}
      />

      <label className="flex items-start gap-2 text-small">
        <input type="checkbox" name="completeOverride" value="1" className="mt-1" />
        Expliciet afronden onder 100% (wordt gelogd)
      </label>

      <Button type="submit" disabled={pending}>
        {pending ? "Opslaan…" : "Wijzigingen opslaan"}
      </Button>
    </form>
  );
}
