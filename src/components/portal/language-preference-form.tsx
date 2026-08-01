"use client";

import { useActionState } from "react";
import {
  updatePreferredLocaleAction,
  type LocaleActionState,
} from "@/server/actions/locale-actions";
import { Button } from "@/components/ui/button";
import { locales, localeLabels, type Locale } from "@/i18n/config";

const initial: LocaleActionState = {};

export function LanguagePreferenceForm({
  currentLocale,
  savedLocale,
  labels,
}: {
  /** Locale the page is rendered in — the select's fallback selection. */
  currentLocale: Locale;
  /** `profiles.preferred_locale`; null when the account never chose one. */
  savedLocale: Locale | null;
  labels: {
    title: string;
    description: string;
    fieldLabel: string;
    save: string;
    saving: string;
    notSetHint: string;
  };
}) {
  const [state, formAction, pending] = useActionState(
    updatePreferredLocaleAction,
    initial,
  );

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <h2 className="text-h3">{labels.title}</h2>
        <p className="text-small text-muted mt-1">{labels.description}</p>
      </div>
      <div>
        <label
          htmlFor="preferredLocale"
          className="block text-small font-medium mb-1"
        >
          {labels.fieldLabel}
        </label>
        <select
          id="preferredLocale"
          name="locale"
          defaultValue={savedLocale ?? currentLocale}
          className="w-full min-h-11 px-3 rounded-lg border border-border bg-background text-sm"
        >
          {locales.map((code) => (
            <option key={code} value={code} lang={code}>
              {localeLabels[code]}
            </option>
          ))}
        </select>
        {savedLocale === null ? (
          <p className="text-small text-muted mt-1">{labels.notSetHint}</p>
        ) : null}
      </div>
      {state.error ? (
        <p className="text-small text-error" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? labels.saving : labels.save}
      </Button>
    </form>
  );
}
