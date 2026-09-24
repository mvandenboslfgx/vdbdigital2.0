"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/database/server";
import { verifyOrigin } from "@/lib/security/origin";
import { writeAuditLog } from "@/lib/security/audit-log";
import { requireCustomer } from "@/server/auth/require-customer";

export type PortalMfaState = {
  error?: string;
  message?: string;
  success?: boolean;
  enabled?: boolean;
  factorId?: string;
  qrCode?: string;
};

const codeSchema = z.object({
  code: z.string().regex(/^\d{6}$/),
});

export async function portalMfaEnrollAction(): Promise<PortalMfaState> {
  const ctx = await requireCustomer();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Authenticatie is niet beschikbaar." };

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const verified = factors?.totp?.find((factor) => factor.status === "verified");
  if (verified) {
    return {
      enabled: true,
      success: true,
      message: "Tweestapsverificatie is al actief.",
    };
  }

  for (const factor of factors?.totp ?? []) {
    if (factor.status !== "verified") {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "VDB klantportaal",
  });

  if (error || !data) {
    return { error: "Tweestapsverificatie kon niet worden gestart." };
  }

  await writeAuditLog({
    userId: ctx.user.id,
    action: "portal.mfa_enroll_started",
    metadata: { factorId: data.id },
  });

  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
  };
}

export async function portalMfaVerifyEnrollAction(
  _prev: PortalMfaState,
  formData: FormData,
): Promise<PortalMfaState> {
  if (!(await verifyOrigin())) return { error: "Verzoek geweigerd." };

  const ctx = await requireCustomer();
  const factorId = String(formData.get("factorId") ?? "");
  const parsed = codeSchema.safeParse({ code: formData.get("code") });

  if (!factorId || !parsed.success) {
    return { error: "Vul de 6-cijferige verificatiecode in." };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Authenticatie is niet beschikbaar." };

  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId });

  if (challengeError || !challenge) {
    return { error: "Verificatie kon niet worden gestart." };
  }

  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code: parsed.data.code,
  });

  if (error) {
    await writeAuditLog({
      userId: ctx.user.id,
      action: "portal.mfa_verify_failed",
    });
    return { error: "De verificatiecode is niet geldig." };
  }

  await writeAuditLog({
    userId: ctx.user.id,
    action: "portal.mfa_enabled",
  });

  revalidatePath("/portal/beveiliging");
  return {
    success: true,
    enabled: true,
    message: "Tweestapsverificatie is ingeschakeld.",
  };
}
