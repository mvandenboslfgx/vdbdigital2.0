"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { submitContactAction } from "@/server/actions/form-actions";
import { useI18n, useT } from "@/i18n/provider";

const fieldClass =
  "bg-light-surface text-light-foreground border-light-border placeholder:text-light-muted";

export function ContactForm() {
  const t = useT();
  const { locale } = useI18n();
  const [state, action, pending] = useActionState(submitContactAction, null);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <Input name="name" label={t("common.name")} required className={fieldClass} />
      <Input
        name="email"
        label={t("forms.emailAddress")}
        type="email"
        required
        className={fieldClass}
      />
      <Input name="company" label={t("forms.companyName")} className={fieldClass} />
      <Input
        name="phone"
        label={t("forms.phoneNumber")}
        type="tel"
        className={fieldClass}
      />
      <Input name="subject" label={t("common.subject")} required className={fieldClass} />
      <Textarea
        name="message"
        label={t("common.message")}
        required
        rows={5}
        className={fieldClass}
      />
      <input
        type="text"
        name="website"
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      {state?.errors && (
        <div className="text-small text-danger" role="alert">
          {state.errors.map((e) => (
            <p key={e}>{e}</p>
          ))}
        </div>
      )}
      {state?.success && (
        <div className="text-small text-success" role="status">
          {t("forms.thanksContact")}
        </div>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? t("common.sending") : t("forms.sendMessage")}
      </Button>
    </form>
  );
}
