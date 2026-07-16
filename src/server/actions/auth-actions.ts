"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/database/server";
import { verifyOrigin } from "@/lib/security/origin";
import { writeAuditLog } from "@/lib/security/audit-log";
import { AuthError } from "@/server/auth/errors";
import { requireAdminWithoutMfa } from "@/server/auth/require-admin";
import { getAal2RedirectPath } from "@/server/auth/require-aal2";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
});

const mfaCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/),
});

export type AuthActionState = {
  error?: string;
  success?: boolean;
  qrCode?: string;
  factorId?: string;
  challengeId?: string;
};

function genericAuthError(): AuthActionState {
  return { error: "Sign-in failed. Check your details and try again." };
}

export async function loginAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!(await verifyOrigin())) {
    await writeAuditLog({ action: "auth.login_failed", metadata: { reason: "origin" } });
    return { error: "Request denied." };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return genericAuthError();
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { error: "Authentication is not configured." };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    await writeAuditLog({
      action: "auth.login_failed",
      metadata: { reason: "credentials" },
    });
    return genericAuthError();
  }

  await writeAuditLog({
    userId: data.user.id,
    action: "auth.login_success",
    metadata: { step: "password" },
  });

  const mfaRedirect = await getAal2RedirectPath();
  if (mfaRedirect) {
    redirect(mfaRedirect);
  }

  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.auth.signOut();
    if (user) {
      await writeAuditLog({
        userId: user.id,
        action: "auth.logout",
      });
    }
  }
  redirect("/admin/login");
}

export async function mfaEnrollAction(): Promise<AuthActionState> {
  try {
    await requireAdminWithoutMfa();
  } catch {
    return { error: "Access denied." };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Authentication is not configured." };

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Authenticator app",
  });

  if (error || !data) {
    return { error: "MFA enrollment failed." };
  }

  await writeAuditLog({
    action: "auth.mfa_enroll_started",
    metadata: { factorId: data.id },
  });

  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
  };
}

export async function mfaVerifyEnrollAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  let adminUserId: string;
  try {
    const ctx = await requireAdminWithoutMfa();
    adminUserId = ctx.user.id;
  } catch {
    return { error: "Access denied." };
  }

  const factorId = formData.get("factorId") as string;
  const parsed = mfaCodeSchema.safeParse({ code: formData.get("code") });

  if (!factorId || !parsed.success) {
    return { error: "Invalid verification code." };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Authentication is not configured." };

  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId });

  if (challengeError || !challenge) {
    await writeAuditLog({
      userId: adminUserId,
      action: "auth.mfa_verify_failed",
      metadata: { step: "challenge" },
    });
    return { error: "Verification failed." };
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code: parsed.data.code,
  });

  if (verifyError) {
    await writeAuditLog({
      userId: adminUserId,
      action: "auth.mfa_verify_failed",
      metadata: { step: "enroll_verify" },
    });
    return { error: "Invalid verification code." };
  }

  await writeAuditLog({
    userId: adminUserId,
    action: "auth.mfa_enroll_completed",
  });

  revalidatePath("/admin");
  redirect("/admin");
}

export async function mfaVerifyLoginAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  let adminUserId: string;
  try {
    const ctx = await requireAdminWithoutMfa();
    adminUserId = ctx.user.id;
  } catch {
    return { error: "Access denied." };
  }

  const parsed = mfaCodeSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) {
    return { error: "Invalid verification code." };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Authentication is not configured." };

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp?.find((f) => f.status === "verified");

  if (!factor) {
    redirect("/admin/mfa/setup");
  }

  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId: factor!.id });

  if (challengeError || !challenge) {
    return { error: "Verification failed." };
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId: factor!.id,
    challengeId: challenge.id,
    code: parsed.data.code,
  });

  if (verifyError) {
    await writeAuditLog({
      userId: adminUserId,
      action: "auth.mfa_verify_failed",
      metadata: { step: "login_verify" },
    });
    return { error: "Invalid verification code." };
  }

  await writeAuditLog({
    userId: adminUserId,
    action: "auth.mfa_verify_success",
  });

  redirect("/admin");
}

/** Guarded admin noop — gebruikt in bypass-tests */
export async function guardedAdminPingAction(): Promise<{ ok: boolean }> {
  const { requireAdmin } = await import("@/server/auth/require-admin");
  await requireAdmin();
  return { ok: true };
}

export async function handleAuthError(error: unknown): Promise<AuthActionState> {
  if (error instanceof AuthError) {
    return { error: "Access denied." };
  }
  return { error: "Something went wrong." };
}
