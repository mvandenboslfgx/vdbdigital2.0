"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type AuthActionState } from "@/server/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: AuthActionState = {};

type LoginLabels = {
  email: string;
  password: string;
  submit: string;
  submitting: string;
  forgot: string;
  requestAccount: string;
};

export function AuthLoginForm({
  next,
  labels = {
    email: "E-mailadres",
    password: "Wachtwoord",
    submit: "Inloggen",
    submitting: "Bezig met inloggen…",
    forgot: "Wachtwoord vergeten?",
    requestAccount: "Account aanvragen",
  },
}: {
  next?: string;
  labels?: LoginLabels;
}) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <div>
        <label htmlFor="email" className="mb-1.5 block text-small font-medium">
          {labels.email}
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          required
          maxLength={254}
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-small font-medium">
          {labels.password}
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

      {state.error ? (
        <p className="rounded-lg border border-error/20 bg-error/10 px-3 py-2 text-small text-error" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? labels.submitting : labels.submit}
      </Button>

      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-small">
        <Link href="/wachtwoord-vergeten" className="text-primary hover:underline">
          {labels.forgot}
        </Link>
        <span className="text-muted" aria-hidden="true">•</span>
        <Link href="/account-aanmaken" className="text-primary hover:underline">
          {labels.requestAccount}
        </Link>
      </div>
    </form>
  );
}
