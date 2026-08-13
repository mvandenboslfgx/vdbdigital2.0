"use client";

import { useActionState } from "react";
import {
  createCustomerAction,
  type AdminPortalActionState,
} from "@/server/actions/admin-portal-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CreateCustomerFormLabels } from "@/lib/admin/support-form-labels";

const initial: AdminPortalActionState = {};

export function CreateCustomerForm({
  labels,
}: {
  /** Resolved server-side; this form does no dictionary lookups. */
  labels: CreateCustomerFormLabels;
}) {
  const [state, formAction, pending] = useActionState(
    createCustomerAction,
    initial,
  );

  return (
    <form
      action={formAction}
      className="rounded-xl border border-border bg-surface p-5 space-y-4"
    >
      <h2 className="text-h3">{labels.heading}</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="legalName" className="block text-small font-medium mb-1">
            {labels.legalName}
          </label>
          <Input id="legalName" name="legalName" required maxLength={200} />
        </div>
        <div>
          <label htmlFor="tradeName" className="block text-small font-medium mb-1">
            {labels.tradeName}
          </label>
          <Input id="tradeName" name="tradeName" maxLength={200} />
        </div>
        <div>
          <label htmlFor="type" className="block text-small font-medium mb-1">
            {labels.type}
          </label>
          <select
            id="type"
            name="type"
            className="w-full min-h-11 px-3 rounded-lg border border-border bg-background text-sm"
            defaultValue="BUSINESS"
          >
            <option value="BUSINESS">{labels.typeBusiness}</option>
            <option value="CONSUMER">{labels.typeConsumer}</option>
          </select>
        </div>
        <div>
          <label
            htmlFor="contactEmail"
            className="block text-small font-medium mb-1"
          >
            {labels.contactEmail}
          </label>
          <Input
            id="contactEmail"
            name="contactEmail"
            type="email"
            required
            maxLength={254}
          />
        </div>
        <div className="sm:col-span-2">
          <label
            htmlFor="inviteEmail"
            className="block text-small font-medium mb-1"
          >
            {labels.inviteEmail}
          </label>
          <Input
            id="inviteEmail"
            name="inviteEmail"
            type="email"
            required
            maxLength={254}
          />
        </div>
      </div>
      {state.error && (
        <p className="text-small text-error" role="alert">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? labels.creating : labels.submit}
      </Button>
    </form>
  );
}
