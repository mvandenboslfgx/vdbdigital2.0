"use client";

import { useActionState } from "react";
import {
  approvePayoutRequestAction,
  markPayoutPaidAction,
  rejectPayoutRequestAction,
  type PayoutActionState,
} from "@/server/actions/partner-payout-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initial: PayoutActionState = {};

function euro(cents: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export function PayoutReviewActions(props: {
  requestId: string;
  status: string;
  payoutId?: string | null;
  payoutStatus?: string | null;
}) {
  const [approveState, approveAction, approvePending] = useActionState(
    approvePayoutRequestAction,
    initial,
  );
  const [rejectState, rejectAction, rejectPending] = useActionState(
    rejectPayoutRequestAction,
    initial,
  );
  const [paidState, paidAction, paidPending] = useActionState(
    markPayoutPaidAction,
    initial,
  );

  const error = approveState.error || rejectState.error || paidState.error;
  const notice = approveState.notice || rejectState.notice || paidState.notice;

  return (
    <div className="space-y-2">
      {props.status === "REQUESTED" ? (
        <div className="flex flex-wrap gap-2 items-end">
          <form action={approveAction}>
            <input type="hidden" name="requestId" value={props.requestId} />
            <Button type="submit" size="sm" disabled={approvePending}>
              {approvePending ? "Goedkeuren…" : "Goedkeuren"}
            </Button>
          </form>
          <form action={rejectAction} className="flex gap-2 items-end">
            <input type="hidden" name="requestId" value={props.requestId} />
            <Input
              name="reason"
              placeholder="Afwijsreden"
              maxLength={500}
              required
              className="min-h-11"
            />
            <Button
              type="submit"
              size="sm"
              variant="secondary"
              disabled={rejectPending}
            >
              {rejectPending ? "Afwijzen…" : "Afwijzen"}
            </Button>
          </form>
        </div>
      ) : null}
      {props.payoutId && props.payoutStatus === "PENDING" ? (
        <form action={paidAction} className="flex flex-wrap gap-2 items-end">
          <input type="hidden" name="payoutId" value={props.payoutId} />
          <Input
            name="externalReference"
            placeholder="Betaalreferentie"
            maxLength={120}
          />
          <Button type="submit" size="sm" disabled={paidPending}>
            {paidPending ? "Markeren…" : "Markeer betaald"}
          </Button>
        </form>
      ) : null}
      {error ? (
        <p className="text-small text-error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="text-small text-success" role="status">
          {notice}
        </p>
      ) : null}
    </div>
  );
}

export { euro };
