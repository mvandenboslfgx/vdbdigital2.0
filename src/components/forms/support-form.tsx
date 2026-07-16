"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { submitSupportAction } from "@/server/actions/form-actions";
import { useI18n, useT } from "@/i18n/provider";

export function SupportForm() {
  const t = useT();
  const { locale } = useI18n();
  const [state, action, pending] = useActionState(submitSupportAction, null);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <Input name="name" label={t("common.name")} required />
      <Input name="email" label={t("forms.emailAddress")} type="email" required />
      <Input name="orderReference" label={t("forms.orderRefOptional")} />
      <div>
        <label htmlFor="priority" className="text-small font-medium block mb-1.5">
          {t("forms.priority")}
        </label>
        <select
          id="priority"
          name="priority"
          className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-foreground"
          defaultValue="normal"
        >
          <option value="low">{t("forms.priorityLow")}</option>
          <option value="normal">{t("forms.priorityNormal")}</option>
          <option value="high">{t("forms.priorityHigh")}</option>
        </select>
      </div>
      <Input name="subject" label={t("common.subject")} required />
      <Textarea name="message" label={t("forms.issueDescription")} required rows={5} />
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
          {t("forms.thanksSupport")}
        </div>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? t("common.sending") : t("forms.sendSupport")}
      </Button>
    </form>
  );
}
