"use client";

import { useActionState } from "react";
import {
  updatePortalProfileAction,
  type PortalActionState,
} from "@/server/actions/portal-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initial: PortalActionState = {};

export function ProfileForm({
  email,
  fullName,
  marketingOptIn,
}: {
  email: string;
  fullName: string;
  marketingOptIn: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    updatePortalProfileAction,
    initial,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="block text-small font-medium mb-1">E-mailadres</label>
        <Input value={email} disabled readOnly />
      </div>
      <div>
        <label htmlFor="fullName" className="block text-small font-medium mb-1">
          Naam
        </label>
        <Input
          id="fullName"
          name="fullName"
          defaultValue={fullName}
          required
          maxLength={120}
        />
      </div>
      <label className="flex items-start gap-3 rounded-lg border border-border p-4">
        <input
          type="checkbox"
          name="marketingConsent"
          value="true"
          defaultChecked={marketingOptIn}
          className="mt-1 accent-primary"
        />
        <span className="text-small">
          Ik wil nieuws, tips en aanbiedingen van VDB Digital per e-mail ontvangen.
        </span>
      </label>
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
        {pending ? "Opslaan…" : "Opslaan"}
      </Button>
    </form>
  );
}
