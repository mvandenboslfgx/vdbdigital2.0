"use client";

import { useActionState, useEffect, useState } from "react";
import {
  mfaEnrollAction,
  mfaVerifyEnrollAction,
  type AuthActionState,
} from "@/server/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/provider";

const initialState: AuthActionState = {};

export function MfaSetupForm() {
  const t = useT();
  const [enrollState, setEnrollState] = useState<AuthActionState>({});
  const [verifyState, verifyAction, pending] = useActionState(
    mfaVerifyEnrollAction,
    initialState,
  );

  useEffect(() => {
    mfaEnrollAction().then(setEnrollState);
  }, []);

  if (!enrollState.qrCode && !enrollState.error) {
    return <p className="text-muted text-small">{t("mfa.enrolling")}</p>;
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
        {t("mfa.setupStepScan")} {t("mfa.setupStepCode")}
      </p>
      {enrollState.qrCode && (
        <div
          className="bg-white p-4 rounded-lg inline-block"
          role="img"
          aria-label={t("mfa.qrAlt")}
          dangerouslySetInnerHTML={{ __html: enrollState.qrCode }}
        />
      )}
      <form action={verifyAction} className="space-y-4">
        <input type="hidden" name="factorId" value={enrollState.factorId ?? ""} />
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
        {verifyState.error && (
          <p className="text-small text-error" role="alert">
            {verifyState.error}
          </p>
        )}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? t("mfa.verifying") : t("mfa.enable")}
        </Button>
      </form>
    </div>
  );
}
