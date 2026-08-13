"use client";

import { useActionState } from "react";
import { loginAction, type AuthActionState } from "@/server/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/provider";
import { LocaleLink } from "@/i18n/locale-link";

const initialState: AuthActionState = {};

export function AuthLoginForm({ next }: { next?: string }) {
  const t = useT();
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <div>
        <label htmlFor="email" className="block text-small font-medium mb-1">
          {t("auth.emailLabel")}
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          maxLength={254}
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-small font-medium mb-1">
          {t("auth.passwordLabel")}
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          maxLength={128}
        />
      </div>
      {state.error && (
        <p className="text-small text-error" role="alert">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t("auth.loginPending") : t("auth.loginButton")}
      </Button>
      <p className="text-small text-muted text-center">
        <LocaleLink href="/wachtwoord-vergeten" className="text-primary hover:underline">
          {t("auth.forgotPassword")}
        </LocaleLink>
        {" · "}
        <LocaleLink href="/account-aanmaken" className="text-primary hover:underline">
          {t("auth.requestAccount")}
        </LocaleLink>
      </p>
    </form>
  );
}
