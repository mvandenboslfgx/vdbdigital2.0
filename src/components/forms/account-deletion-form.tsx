"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { submitAccountDeletionAction } from "@/server/actions/account-deletion-actions";
import { useI18n } from "@/i18n/provider";
import { paths } from "@/i18n/config";

const fieldClass =
  "bg-light-surface text-light-foreground border-light-border placeholder:text-light-muted";

export function AccountDeletionForm() {
  const { locale } = useI18n();
  const [state, action, pending] = useActionState(submitAccountDeletionAction, null);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <Input
        name="email"
        label={locale === "nl" ? "E-mailadres van je account" : "Account email address"}
        type="email"
        required
        autoComplete="email"
        className={fieldClass}
      />
      <label className="flex items-start gap-3 text-small text-light-muted">
        <input
          type="checkbox"
          name="confirm"
          value="true"
          required
          className="mt-1"
        />
        <span>
          {locale === "nl"
            ? "Ik begrijp dat mijn account en verwijderbare persoonsgegevens worden verwerkt volgens het beleid op deze pagina."
            : "I understand that my account and deletable personal data will be processed according to the policy on this page."}
        </span>
      </label>
      <input
        type="text"
        name="website"
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      {state?.errors?.map((error) => (
        <p key={error} className="text-small text-light-muted" role="status">
          {error}
        </p>
      ))}

      {state?.success ? (
        <p className="text-small text-success" role="status">
          {locale === "nl"
            ? "Als dit adres aan een VDB Digital-account is gekoppeld, ontvang je verdere instructies per e-mail."
            : "If this address is linked to a VDB Digital account, you will receive further instructions by email."}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} variant="danger">
        {pending
          ? locale === "nl"
            ? "Versturen…"
            : "Submitting…"
          : locale === "nl"
            ? "Verwijdering aanvragen"
            : "Request deletion"}
      </Button>

      <p className="text-small text-light-muted">
        {locale === "nl" ? "Meer informatie: " : "More information: "}
        <Link href={paths.privacy} className="underline">
          {locale === "nl" ? "Privacyverklaring" : "Privacy policy"}
        </Link>
      </p>
    </form>
  );
}
