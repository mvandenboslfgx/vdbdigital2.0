"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type AuthActionState } from "@/server/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: AuthActionState = {};

export function AuthLoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <div>
        <label htmlFor="email" className="block text-small font-medium mb-1">
          E-mailadres
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
          Wachtwoord
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
        {pending ? "Bezig met inloggen…" : "Inloggen"}
      </Button>
      <p className="text-small text-muted text-center">
        <Link href="/wachtwoord-vergeten" className="text-primary hover:underline">
          Wachtwoord vergeten?
        </Link>
        {" · "}
        <Link href="/account-aanmaken" className="text-primary hover:underline">
          Account aanvragen
        </Link>
      </p>
    </form>
  );
}
