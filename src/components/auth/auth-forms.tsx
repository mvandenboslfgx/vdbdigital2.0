"use client";

import { useActionState } from "react";
import {
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
import { useT } from "@/i18n/provider";

const initialState: AuthActionState = {};

export function PasswordResetRequestForm() {
  const t = useT();
  const [state, formAction, pending] = useActionState(
    requestPasswordResetAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-small font-medium mb-1">
          {t("auth.emailLabel")}
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
        {pending ? t("auth.forgotPending") : t("auth.forgotSubmit")}
      </Button>
    </form>
  );
}

export function PasswordUpdateForm() {
  const t = useT();
  const [state, formAction, pending] = useActionState(
    updatePasswordAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="password" className="block text-small font-medium mb-1">
          {t("auth.resetPasswordLabel")}
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
        {pending ? t("auth.resetPending") : t("auth.resetSubmit")}
      </Button>
    </form>
  );
}

export function MagicLinkForm() {
  const t = useT();
  const [state, formAction, pending] = useActionState(
    requestMagicLinkAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="magic-email" className="block text-small font-medium mb-1">
          {t("auth.magicLinkLabel")}
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
        {pending ? t("auth.magicLinkPending") : t("auth.magicLinkButton")}
      </Button>
    </form>
  );
}

export function AccountRequestForm() {
  const t = useT();
  const [state, formAction, pending] = useActionState(
    requestAccountAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="fullName" className="block text-small font-medium mb-1">
          {t("auth.registerNameLabel")}
        </label>
        <Input id="fullName" name="fullName" required maxLength={120} />
      </div>
      <div>
        <label htmlFor="email" className="block text-small font-medium mb-1">
          {t("auth.registerEmailLabel")}
        </label>
        <Input id="email" name="email" type="email" required maxLength={254} />
      </div>
      <div>
        <label htmlFor="company" className="block text-small font-medium mb-1">
          {t("auth.registerCompanyLabel")}
        </label>
        <Input id="company" name="company" maxLength={200} />
      </div>
      <div>
        <label htmlFor="message" className="block text-small font-medium mb-1">
          {t("auth.registerMessageLabel")}
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
        {pending ? t("auth.registerPending") : t("auth.registerSubmit")}
      </Button>
      <p className="text-small text-muted">{t("auth.registerNote")}</p>
    </form>
  );
}

export function AcceptInvitationForm({ token }: { token: string }) {
  const t = useT();
  const [state, formAction, pending] = useActionState(
    acceptInvitationAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <label htmlFor="fullName" className="block text-small font-medium mb-1">
          {t("auth.inviteNameLabel")}
        </label>
        <Input id="fullName" name="fullName" required maxLength={120} />
      </div>
      <div>
        <label htmlFor="password" className="block text-small font-medium mb-1">
          {t("auth.invitePasswordLabel")}
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
        {pending ? t("auth.invitePending") : t("auth.inviteSubmit")}
      </Button>
    </form>
  );
}
