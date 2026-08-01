"use client";

import { useActionState } from "react";
import {
  createSupportTicketAction,
  type PortalActionState,
} from "@/server/actions/portal-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const initial: PortalActionState = {};

export type CreateTicketFormLabels = {
  heading: string;
  subjectLabel: string;
  descriptionLabel: string;
  submit: string;
  submitting: string;
};

export function CreateTicketForm({
  labels,
}: {
  labels: CreateTicketFormLabels;
}) {
  const [state, formAction, pending] = useActionState(
    createSupportTicketAction,
    initial,
  );

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-xl border border-border p-5 bg-surface"
    >
      <h2 className="text-h3">{labels.heading}</h2>
      <div>
        <label htmlFor="subject" className="block text-small font-medium mb-1">
          {labels.subjectLabel}
        </label>
        <Input id="subject" name="subject" required maxLength={200} />
      </div>
      <div>
        <label
          htmlFor="description"
          className="block text-small font-medium mb-1"
        >
          {labels.descriptionLabel}
        </label>
        <Textarea
          id="description"
          name="description"
          required
          minLength={10}
          maxLength={5000}
          rows={5}
        />
      </div>
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
