"use client";

import { useActionState } from "react";
import {
  registerAction,
  requestPasswordResetAction,
  requestMagicLinkAction,
  requestAccountAction,
  updatePasswordAction,
  acceptInvitationAction,
  type AuthActionState,
} from "@/server/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const initialState: AuthActionState = {};

export function SignupForm() {
  const [state, formAction, pending] = useActionState(
    registerAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="signup-full-name" className="block text-small font-medium mb-1">
          Naam
        </label>
        <Input
          id="signup-full-name"
          name="fullName"
          type="text"
          autoComplete="name"
          required
          minLength={2}
          maxLength={120}
        />
      </div>
      <div>
        <label htmlFor="signup-email" className="block text-small font-medium mb-1">
          E-mailadres
        </label>
        <Input
          id="signup-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
        />
      </div>
      <div>
        <label htmlFor="signup-password" className="block text-small font-medium mb-1">
          Wachtwoord
        </label>
        <Input
          id="signup-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={128}
        />
      </div>
      <div>
        <label htmlFor="signup-confirm-password" className="block text-small font-medium mb-1">
          Herhaal wachtwoord
        </label>
        <Input
          id="signup-confirm-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
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
      {state.message && (
        <p className="text-small text-success" role="status">
          {state.message}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Account aanmaken…" : "Gratis account aanmaken"}
      </Button>

      <p className="text-xs text-muted text-center">
        Na je eerste login wordt automatisch een beveiligde klantomgeving
        aangemaakt. Beheerrechten worden nooit automatisch toegekend.
      </p>
    </form>
  );
}

export function PasswordResetRequestForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordResetAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-small font-medium mb-1">
          E-mailadres
        </label>
        <Input id="email" name="email" type="email" required maxLength={254} />
      </div>
      {state.error && (
        <p className="text-small text-error" role="alert">
          {state.error}
        </p>
      )}
      {state.message && (
        <p className="text-small text-success" role="status">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Versturen…" : "Resetlink versturen"}
      </Button>
    </form>
  );
}

export function PasswordUpdateForm() {
  const [state, formAction, pending] = useActionState(
    updatePasswordAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="password" className="block text-small font-medium mb-1">
          Nieuw wachtwoord
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          maxLength={128}
          autoComplete="new-password"
        />
      </div>
      {state.error && (
        <p className="text-small text-error" role="alert">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Opslaan…" : "Wachtwoord opslaan"}
      </Button>
    </form>
  );
}

export function MagicLinkForm({ compact = false }: { compact?: boolean } = {}) {
  const [state, formAction, pending] = useActionState(
    requestMagicLinkAction,
    initialState,
  );

  return (
    <form action={formAction} className={compact ? "space-y-3" : "space-y-4"}>
      <div>
        <label htmlFor="magic-email" className="block text-small font-medium mb-1">
          E-mailadres
        </label>
        <Input
          id="magic-email"
          name="email"
          type="email"
          required
          maxLength={254}
        />
      </div>
      {state.error && (
        <p className="text-small text-error" role="alert">
          {state.error}
        </p>
      )}
      {state.message && (
        <p className="text-small text-success" role="status">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full" variant="secondary">
        {pending ? "Versturen…" : "Stuur beveiligde inloglink"}
      </Button>
    </form>
  );
}

export function AccountRequestForm() {
  const [state, formAction, pending] = useActionState(
    requestAccountAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="fullName" className="block text-small font-medium mb-1">
          Naam
        </label>
        <Input id="fullName" name="fullName" required maxLength={120} />
      </div>
      <div>
        <label htmlFor="email" className="block text-small font-medium mb-1">
          E-mailadres
        </label>
        <Input id="email" name="email" type="email" required maxLength={254} />
      </div>
      <div>
        <label htmlFor="company" className="block text-small font-medium mb-1">
          Bedrijf (optioneel)
        </label>
        <Input id="company" name="company" maxLength={200} />
      </div>
      <div>
        <label htmlFor="message" className="block text-small font-medium mb-1">
          Toelichting (optioneel)
        </label>
        <Textarea id="message" name="message" maxLength={2000} rows={4} />
      </div>
      {state.error && (
        <p className="text-small text-error" role="alert">
          {state.error}
        </p>
      )}
      {state.message && (
        <p className="text-small text-success" role="status">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Versturen…" : "Aanvraag versturen"}
      </Button>
      <p className="text-small text-muted">
        Een aanvraag geeft geen automatische toegang tot projecten of documenten.
        Toegang volgt via uitnodiging of goedkeuring.
      </p>
    </form>
  );
}

export function AcceptInvitationForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(
    acceptInvitationAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <label htmlFor="fullName" className="block text-small font-medium mb-1">
          Je naam
        </label>
        <Input id="fullName" name="fullName" required maxLength={120} />
      </div>
      <div>
        <label htmlFor="password" className="block text-small font-medium mb-1">
          Kies een wachtwoord
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          maxLength={128}
          autoComplete="new-password"
        />
      </div>
      {state.error && (
        <p className="text-small text-error" role="alert">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Activeren…" : "Uitnodiging accepteren"}
      </Button>
    </form>
  );
}
