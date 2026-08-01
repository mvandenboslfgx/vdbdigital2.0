"use client";

import { useActionState } from "react";
import {
  mfaVerifyLoginAction,
  type AuthActionState,
} from "@/server/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/provider";

const initialState: AuthActionState = {};

export function MfaVerifyForm() {
  const t = useT();
  const [state, formAction, pending] = useActionState(
    mfaVerifyLoginAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <p className="text-small text-muted">{t("mfa.challengeBody")}</p>
      <div>
        <label htmlFor="code" className="block text-small font-medium mb-1">
          {t("mfa.codeLabel")}
        </label>
        <Input
          id="code"
          name="code"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          required
          autoComplete="one-time-code"
        />
      </div>
      {state.error && (
        <p className="text-small text-error" role="alert">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t("mfa.verifying") : t("mfa.verify")}
      </Button>
    </form>
  );
}
