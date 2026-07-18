"use client";

import { useActionState } from "react";
import {
  respondToQuoteAction,
  type PortalActionState,
} from "@/server/actions/portal-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const initial: PortalActionState = {};

export function QuoteResponseForm({ quoteId }: { quoteId: string }) {
  const [state, formAction, pending] = useActionState(
    respondToQuoteAction,
    initial,
  );

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-border p-5">
      <input type="hidden" name="quoteId" value={quoteId} />
      <h2 className="text-h3">Reageren</h2>
      <div>
        <label htmlFor="note" className="block text-small font-medium mb-1">
          Opmerking (optioneel)
        </label>
        <Textarea id="note" name="note" rows={3} maxLength={2000} />
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
      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          name="decision"
          value="ACCEPT"
          disabled={pending}
        >
          Offerte accepteren
        </Button>
        <Button
          type="submit"
          name="decision"
          value="DECLINE"
          variant="outline"
          disabled={pending}
        >
          Offerte afwijzen
        </Button>
      </div>
    </form>
  );
}
