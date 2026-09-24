"use client";

import { useActionState, useEffect, useState } from "react";
import {
  portalMfaEnrollAction,
  portalMfaVerifyEnrollAction,
  type PortalMfaState,
} from "@/server/actions/portal-security-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initial: PortalMfaState = {};

export function PortalMfaSetupForm() {
  const [enroll, setEnroll] = useState<PortalMfaState>({});
  const [verify, action, pending] = useActionState(
    portalMfaVerifyEnrollAction,
    initial,
  );

  useEffect(() => {
    portalMfaEnrollAction().then(setEnroll);
  }, []);

  if (verify.enabled || enroll.enabled) {
    return (
      <div className="rounded-lg border border-success/30 bg-success/10 p-4">
        <p className="font-medium">Tweestapsverificatie is actief</p>
        <p className="text-small text-muted mt-1">
          Je account is extra beveiligd met een authenticator-app.
        </p>
      </div>
    );
  }

  if (!enroll.qrCode && !enroll.error) {
    return <p className="text-small text-muted">MFA voorbereiden…</p>;
  }

  if (enroll.error) {
    return <p className="text-small text-error" role="alert">{enroll.error}</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-small text-muted">
        Scan de QR-code met bijvoorbeeld Google Authenticator, Microsoft Authenticator
        of 1Password. Vul daarna de 6-cijferige code in.
      </p>

      {enroll.qrCode ? (
        <div
          className="inline-block rounded-lg bg-white p-4"
          dangerouslySetInnerHTML={{ __html: enroll.qrCode }}
        />
      ) : null}

      <form action={action} className="space-y-4">
        <input type="hidden" name="factorId" value={enroll.factorId ?? ""} />
        <Input
          id="mfa-code"
          name="code"
          label="Verificatiecode"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          required
          autoComplete="one-time-code"
        />
        {verify.error ? (
          <p className="text-small text-error" role="alert">{verify.error}</p>
        ) : null}
        {verify.message ? (
          <p className="text-small text-success" role="status">{verify.message}</p>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Controleren…" : "MFA inschakelen"}
        </Button>
      </form>
    </div>
  );
}
