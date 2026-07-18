"use client";

import { useActionState } from "react";
import {
  createCustomerAction,
  type AdminPortalActionState,
} from "@/server/actions/admin-portal-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initial: AdminPortalActionState = {};

export function CreateCustomerForm() {
  const [state, formAction, pending] = useActionState(
    createCustomerAction,
    initial,
  );

  return (
    <form
      action={formAction}
      className="rounded-xl border border-border bg-surface p-5 space-y-4"
    >
      <h2 className="text-h3">Klant aanmaken & uitnodigen</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="legalName" className="block text-small font-medium mb-1">
            Officiële naam
          </label>
          <Input id="legalName" name="legalName" required maxLength={200} />
        </div>
        <div>
          <label htmlFor="tradeName" className="block text-small font-medium mb-1">
            Handelsnaam
          </label>
          <Input id="tradeName" name="tradeName" maxLength={200} />
        </div>
        <div>
          <label htmlFor="type" className="block text-small font-medium mb-1">
            Type
          </label>
          <select
            id="type"
            name="type"
            className="w-full min-h-11 px-3 rounded-lg border border-border bg-background text-sm"
            defaultValue="BUSINESS"
          >
            <option value="BUSINESS">Zakelijk</option>
            <option value="CONSUMER">Particulier</option>
          </select>
        </div>
        <div>
          <label
            htmlFor="contactEmail"
            className="block text-small font-medium mb-1"
          >
            Contact e-mail
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
            Uitnodiging naar
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
        {pending ? "Aanmaken…" : "Aanmaken en uitnodigen"}
      </Button>
    </form>
  );
}
