"use client";

import { useActionState, useEffect, useState } from "react";
import {
  mfaEnrollAction,
  mfaVerifyEnrollAction,
  type AuthActionState,
} from "@/server/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: AuthActionState = {};

export function MfaSetupForm() {
  const [enrollState, setEnrollState] = useState<AuthActionState>({});
  const [verifyState, verifyAction, pending] = useActionState(
    mfaVerifyEnrollAction,
    initialState,
  );

  useEffect(() => {
    mfaEnrollAction().then(setEnrollState);
  }, []);

  if (!enrollState.qrCode && !enrollState.error) {
    return <p className="text-muted text-small">Preparing MFA…</p>;
  }

  if (enrollState.error) {
    return (
      <p className="text-small text-error" role="alert">
        {enrollState.error}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-small text-muted">
        Scan the QR code with your authenticator app, then enter the 6-digit code.
      </p>
      {enrollState.qrCode && (
        <div
          className="bg-white p-4 rounded-lg inline-block"
          dangerouslySetInnerHTML={{ __html: enrollState.qrCode }}
        />
      )}
      <form action={verifyAction} className="space-y-4">
        <input type="hidden" name="factorId" value={enrollState.factorId ?? ""} />
        <div>
          <label htmlFor="code" className="block text-small font-medium mb-1">
            Verification code
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
        {verifyState.error && (
          <p className="text-small text-error" role="alert">
            {verifyState.error}
          </p>
        )}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Enabling…" : "Enable MFA"}
        </Button>
      </form>
    </div>
  );
}
