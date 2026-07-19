"use client";

import { useRef, useState, useTransition } from "react";
import { reverseInvoicePaymentAction } from "@/server/actions/invoice-actions";

type Props = {
  invoiceId: string;
  invoiceNumber: string;
  expectedVersion: number;
  paymentRecordId: string;
  amountLabel: string;
  paymentDate: string;
  currency: string;
};

function createReversalIdempotencyKey(paymentRecordId: string): string {
  const nonce =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}`;
  return `rev:${paymentRecordId}:${nonce}`;
}

/**
 * Administrative payment reversal only — never a provider refund.
 */
export function ReversePaymentControls({
  invoiceId,
  invoiceNumber,
  expectedVersion,
  paymentRecordId,
  amountLabel,
  paymentDate,
  currency,
}: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const [idempotencyKey] = useState(() =>
    createReversalIdempotencyKey(paymentRecordId),
  );
  /** Double-submit guard — mutated only in event handlers, never read during render. */
  const submittedRef = useRef(false);

  function onConfirm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending || submittedRef.current) return;
    if (reason.trim().length < 3) return;

    const confirmed = window.confirm(
      [
        "Administratieve betalingsregistratie terugdraaien?",
        "",
        `Factuur: ${invoiceNumber}`,
        `Bedrag: ${amountLabel} (${currency})`,
        `Registratiedatum: ${paymentDate}`,
        "",
        "Deze actie draait alleen de administratieve betalingsregistratie terug. Er wordt geen bedrag via een betaalprovider teruggestort.",
      ].join("\n"),
    );
    if (!confirmed) return;

    submittedRef.current = true;
    startTransition(() => {
      const fd = new FormData(e.currentTarget);
      void reverseInvoicePaymentAction(fd);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        className="text-sm text-primary underline-offset-2 hover:underline min-h-11 px-1"
        onClick={() => setOpen(true)}
      >
        Betaling terugdraaien
      </button>
    );
  }

  return (
    <form
      onSubmit={onConfirm}
      className="mt-2 space-y-2 rounded-lg border border-border/80 bg-surface-elevated/40 p-3"
    >
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <input type="hidden" name="paymentRecordId" value={paymentRecordId} />
      <input type="hidden" name="expectedVersion" value={expectedVersion} />
      <input
        type="hidden"
        name="reversalIdempotencyKey"
        value={idempotencyKey}
      />
      <p className="text-xs text-muted">
        Deze actie draait alleen de administratieve betalingsregistratie terug.
        Er wordt geen bedrag via een betaalprovider teruggestort.
      </p>
      <label className="block text-small" htmlFor={`reason-${paymentRecordId}`}>
        Interne reden (verplicht)
      </label>
      <textarea
        id={`reason-${paymentRecordId}`}
        name="reversalReason"
        required
        minLength={3}
        maxLength={500}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="w-full min-h-[72px] rounded-lg border border-border px-3 py-2 text-sm"
        placeholder="Bijv. dubbele registratie gecorrigeerd"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending || reason.trim().length < 3}
          className="min-h-11 rounded-lg bg-primary px-4 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Bezig…" : "Bevestig terugdraaien"}
        </button>
        <button
          type="button"
          className="min-h-11 rounded-lg border border-border px-4 text-sm"
          disabled={pending}
          onClick={() => {
            setOpen(false);
            setReason("");
          }}
        >
          Annuleren
        </button>
      </div>
    </form>
  );
}
