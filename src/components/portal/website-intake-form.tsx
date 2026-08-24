"use client";

import { useState, useTransition } from "react";
import { submitWebsiteIntakeAction } from "@/server/actions/website-intake-actions";

export function WebsiteIntakeForm({
  projectId,
  status,
  payload,
}: {
  projectId: string;
  status: string;
  payload: Record<string, string>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(status === "SUBMITTED" || status === "APPROVED");
  const locked = status === "SUBMITTED" || status === "APPROVED";

  return (
    <form
      className="space-y-4 rounded-xl border border-border p-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          setError(null);
          const result = await submitWebsiteIntakeAction(formData);
          if (!result.ok) {
            setError(
              result.error === "validation"
                ? "Bedrijfsnaam en contact zijn verplicht."
                : "Opslaan is niet gelukt. Probeer opnieuw.",
            );
            return;
          }
          setSaved(true);
        });
      }}
    >
      <input type="hidden" name="projectId" value={projectId} />
      <Field name="companyName" label="Bedrijfsnaam" defaultValue={payload.companyName} required disabled={locked} />
      <Field name="existingWebsite" label="Bestaande website" defaultValue={payload.existingWebsite} disabled={locked} />
      <Field name="sector" label="Sector" defaultValue={payload.sector} disabled={locked} />
      <Field name="contact" label="Contact" defaultValue={payload.contact} required disabled={locked} />
      <Field name="pages" label="Gewenste pagina's" defaultValue={payload.pages} disabled={locked} />
      <Field name="languages" label="Talen" defaultValue={payload.languages} disabled={locked} />
      <Field name="domain" label="Domein" defaultValue={payload.domain} disabled={locked} />
      <Field name="features" label="Functies" defaultValue={payload.features} disabled={locked} />
      <Field name="deadline" label="Gewenste deadline" defaultValue={payload.deadline} disabled={locked} />
      <label className="block space-y-1">
        <span className="text-small text-muted">Huisstijl / branding</span>
        <textarea
          name="brandingNotes"
          defaultValue={payload.brandingNotes ?? ""}
          disabled={locked}
          className="min-h-24 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
      </label>
      {error ? <p className="text-small text-red-400">{error}</p> : null}
      {saved ? (
        <p className="text-small text-muted">Intake is ingediend. We gaan hiermee het buildplan maken.</p>
      ) : (
        <button
          type="submit"
          disabled={pending || locked}
          className="min-h-11 rounded-lg bg-primary px-5 text-sm text-white disabled:opacity-60"
        >
          {pending ? "Versturen…" : "Intake indienen"}
        </button>
      )}
    </form>
  );
}

function Field({
  name,
  label,
  defaultValue,
  required,
  disabled,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-small text-muted">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        disabled={disabled}
        className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm"
      />
    </label>
  );
}
