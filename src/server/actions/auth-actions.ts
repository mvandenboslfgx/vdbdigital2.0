"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/database/server";
import { createServiceRoleClient } from "@/lib/database/server";
import { verifyOrigin } from "@/lib/security/origin";
import { writeAuditLog } from "@/lib/security/audit-log";
import { AuthError } from "@/server/auth/errors";
import { requireAdminWithoutMfa } from "@/server/auth/require-admin";
import { resolvePostLoginPath } from "@/server/auth/resolve-home";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { resolveAppUrl } from "@/lib/url/app-url";
import { hashInviteToken } from "@/lib/auth/invite-token";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  next: z.string().max(500).optional(),
});

const emailSchema = z.object({
  email: z.string().email().max(254),
});

const resetSchema = z.object({
  password: z.string().min(8).max(128),
});

const mfaCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/),
});

const accountRequestSchema = z.object({
  email: z.string().email().max(254),
  fullName: z.string().min(2).max(120),
  company: z.string().max(200).optional(),
  message: z.string().max(2000).optional(),
});

export type AuthActionState = {
  error?: string;
  errorCode?:
    | "denied"
    | "session"
    | "invalid_code"
    | "existing_factor"
    | "rate_limit"
    | "network"
    | "aal2_pending"
    | "unknown";
  success?: boolean;
  message?: string;
  qrCode?: string;
  /** TOTP manual secret — never log or render in audit trails */
  secret?: string;
  factorId?: string;
  challengeId?: string;
  aal2?: boolean;
  correlationId?: string;
  status?: {
    currentLevel: "aal1" | "aal2";
    hasVerifiedFactor: boolean;
    hasUnverifiedFactor: boolean;
    verifiedFactorId: string | null;
    unverifiedFactorId: string | null;
  };
};

function newCorrelationId(): string {
  return crypto.randomUUID();
}

function mapMfaError(
  raw: string | undefined,
  fallback: AuthActionState["errorCode"] = "unknown",
): Pick<AuthActionState, "error" | "errorCode"> {
  const lower = (raw ?? "").toLowerCase();
  if (
    lower.includes("session") ||
    lower.includes("jwt") ||
    lower.includes("not authenticated") ||
    lower.includes("auth session missing")
  ) {
    return {
      errorCode: "session",
      error: "Je sessie is verlopen. Log opnieuw in om verder te gaan.",
    };
  }
  if (
    lower.includes("already") ||
    lower.includes("exists") ||
    lower.includes("factor_name") ||
    lower.includes("enrolled")
  ) {
    return {
      errorCode: "existing_factor",
      error: "Er is al een verificatiemethode gekoppeld. Gebruik je bestaande code.",
    };
  }
  if (lower.includes("rate") || lower.includes("too many")) {
    return {
      errorCode: "rate_limit",
      error: "Er zijn te veel pogingen gedaan. Wacht even en probeer het opnieuw.",
    };
  }
  if (
    lower.includes("invalid") ||
    lower.includes("expired") ||
    lower.includes("code")
  ) {
    return {
      errorCode: "invalid_code",
      error:
        "De code klopt niet of is verlopen. Open je authenticator-app en probeer het opnieuw.",
    };
  }
  if (fallback === "network") {
    return {
      errorCode: "network",
      error:
        "Instellen lukt momenteel niet. Probeer het opnieuw of log uit en opnieuw in.",
    };
  }
  return {
    errorCode: fallback,
    error: "Er ging iets mis. Probeer het opnieuw of log uit en opnieuw in.",
  };
}

function genericAuthError(): AuthActionState {
  return {
    error: "Inloggen is niet gelukt. Controleer je gegevens en probeer het opnieuw.",
  };
}

function dutchRateLimitMessage(result: Awaited<ReturnType<typeof checkRateLimit>>): string {
  if (result.retryAfterSeconds) {
    return `Te veel pogingen. Probeer het over ${result.retryAfterSeconds} seconden opnieuw.`;
  }
  return "Te veel pogingen. Probeer het later opnieuw.";
}

export async function loginAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!(await verifyOrigin())) {
    await writeAuditLog({ action: "auth.login_failed", metadata: { reason: "origin" } });
    return { error: "Verzoek geweigerd." };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });

  if (!parsed.success) {
    return genericAuthError();
  }

  const limited = await checkRateLimit(
    "auth-login",
    parsed.data.email.toLowerCase(),
  );
  if (!limited.success) {
    return { error: dutchRateLimitMessage(limited) };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { error: "Authenticatie is niet geconfigureerd." };
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

  const destination = await resolvePostLoginPath(data.user.id, parsed.data.next);
  redirect(destination);
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
  redirect("/inloggen");
}

export async function requestPasswordResetAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!(await verifyOrigin())) {
    return { error: "Verzoek geweigerd." };
  }

  const parsed = emailSchema.safeParse({ email: formData.get("email") });
  // Anti-enumeration: always same success message
  const successMessage =
    "Als dit e-mailadres bij ons bekend is, ontvang je binnen enkele minuten een resetlink.";

  if (!parsed.success) {
    return { success: true, message: successMessage };
  }

  const limited = await checkRateLimit(
    "auth-reset",
    parsed.data.email.toLowerCase(),
  );
  if (!limited.success) {
    return { error: dutchRateLimitMessage(limited) };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { error: "Authenticatie is niet geconfigureerd." };
  }

  const redirectTo = `${resolveAppUrl()}/wachtwoord-herstellen`;
  await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo });

  await writeAuditLog({
    action: "auth.password_reset_requested",
    metadata: { outcome: "accepted" },
  });

  return { success: true, message: successMessage };
}

export async function updatePasswordAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!(await verifyOrigin())) {
    return { error: "Verzoek geweigerd." };
  }

  const parsed = resetSchema.safeParse({ password: formData.get("password") });
  if (!parsed.success) {
    return { error: "Kies een wachtwoord van minimaal 8 tekens." };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { error: "Authenticatie is niet geconfigureerd." };
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { error: "Deze resetlink is ongeldig of verlopen." };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: "Wachtwoord kon niet worden bijgewerkt. Probeer opnieuw." };
  }

  await writeAuditLog({
    userId: userData.user.id,
    action: "auth.password_updated",
  });

  const destination = await resolvePostLoginPath(userData.user.id);
  redirect(destination);
}

export async function requestMagicLinkAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!(await verifyOrigin())) {
    return { error: "Verzoek geweigerd." };
  }

  const parsed = emailSchema.safeParse({ email: formData.get("email") });
  const successMessage =
    "Als dit e-mailadres bij ons bekend is, ontvang je een inloglink.";

  if (!parsed.success) {
    return { success: true, message: successMessage };
  }

  const limited = await checkRateLimit(
    "auth-magic",
    parsed.data.email.toLowerCase(),
  );
  if (!limited.success) {
    return { error: dutchRateLimitMessage(limited) };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { error: "Authenticatie is niet geconfigureerd." };
  }

  const emailRedirectTo = `${resolveAppUrl()}/auth/callback?next=/portal`;
  await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo, shouldCreateUser: false },
  });

  await writeAuditLog({
    action: "auth.magic_link_requested",
    metadata: { outcome: "accepted" },
  });

  return { success: true, message: successMessage };
}

/** Publieke accountaanvraag — geen automatische toegang tot klantdata. */
export async function requestAccountAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!(await verifyOrigin())) {
    return { error: "Verzoek geweigerd." };
  }

  const parsed = accountRequestSchema.safeParse({
    email: formData.get("email"),
    fullName: formData.get("fullName"),
    company: formData.get("company") || undefined,
    message: formData.get("message") || undefined,
  });

  if (!parsed.success) {
    return { error: "Controleer je gegevens en probeer het opnieuw." };
  }

  const limited = await checkRateLimit(
    "auth-account-request",
    parsed.data.email.toLowerCase(),
  );
  if (!limited.success) {
    return { error: dutchRateLimitMessage(limited) };
  }

  const service = createServiceRoleClient();
  if (!service) {
    return { error: "Aanvraag kon niet worden opgeslagen." };
  }

  const { error } = await service.from("leads").insert({
    type: "CONTACT",
    status: "NEW",
    email: parsed.data.email,
    name: parsed.data.fullName,
    subject: "Accountaanvraag klantenportaal",
    message: parsed.data.message
      ? `[Accountaanvraag]\n${parsed.data.message}`
      : "[Accountaanvraag]",
    metadata: {
      kind: "account_request",
      company: parsed.data.company ?? null,
    },
  });

  if (error) {
    await writeAuditLog({
      action: "auth.account_request_failed",
      metadata: { reason: "db" },
    });
    return { error: "Aanvraag kon niet worden opgeslagen. Probeer later opnieuw." };
  }

  await writeAuditLog({
    action: "auth.account_request_created",
    metadata: { outcome: "lead" },
  });

  return {
    success: true,
    message:
      "Je aanvraag is ontvangen. We nemen contact op na controle. Dit geeft nog geen toegang tot klantdata.",
  };
}

export async function acceptInvitationAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!(await verifyOrigin())) {
    return { error: "Verzoek geweigerd." };
  }

  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();

  if (!token || token.length < 32) {
    return { error: "Deze uitnodiging is ongeldig of verlopen." };
  }
  if (password.length < 8 || password.length > 128) {
    return { error: "Kies een wachtwoord van minimaal 8 tekens." };
  }

  const limited = await checkRateLimit("auth-invite", token.slice(0, 16));
  if (!limited.success) {
    return { error: dutchRateLimitMessage(limited) };
  }

  const service = createServiceRoleClient();
  if (!service) {
    return { error: "Uitnodiging kon niet worden verwerkt." };
  }

  const tokenHash = hashInviteToken(token);
  const { data: invite } = await service
    .from("organization_invitations")
    .select("*")
    .eq("token_hash", tokenHash)
    .eq("status", "PENDING")
    .maybeSingle();

  if (!invite || new Date(invite.expires_at).getTime() < Date.now()) {
    return { error: "Deze uitnodiging is ongeldig of verlopen." };
  }

  const { data: created, error: createError } =
    await service.auth.admin.createUser({
      email: invite.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName || undefined },
    });

  if (createError || !created.user) {
    // Existing user path: sign-in then attach
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return { error: "Uitnodiging kon niet worden verwerkt." };
    }
    const { data: signedIn, error: signError } =
      await supabase.auth.signInWithPassword({
        email: invite.email,
        password,
      });
    if (signError || !signedIn.user) {
      return {
        error:
          "Er bestaat al een account met dit e-mailadres. Log in met het juiste wachtwoord om de uitnodiging te accepteren.",
      };
    }
    await attachMembership(service, invite, signedIn.user.id, fullName);
    const destination = await resolvePostLoginPath(signedIn.user.id);
    redirect(destination);
  }

  await attachMembership(service, invite, created.user.id, fullName);

  const supabase = await createServerSupabaseClient();
  if (supabase) {
    await supabase.auth.signInWithPassword({
      email: invite.email,
      password,
    });
  }

  await writeAuditLog({
    userId: created.user.id,
    action: "auth.invitation_accepted",
    metadata: { organizationId: invite.organization_id },
  });

  redirect("/portal");
}

async function attachMembership(
  service: NonNullable<ReturnType<typeof createServiceRoleClient>>,
  invite: {
    id: string;
    organization_id: string;
    customer_role: string;
    email: string;
  },
  userId: string,
  fullName: string,
) {
  await service.from("profiles").upsert({
    id: userId,
    email: invite.email,
    full_name: fullName || null,
    is_active: true,
  });

  await service.from("organization_members").upsert(
    {
      organization_id: invite.organization_id,
      user_id: userId,
      customer_role: invite.customer_role,
      status: "ACTIVE",
      joined_at: new Date().toISOString(),
    },
    { onConflict: "organization_id,user_id" },
  );

  await service
    .from("organization_invitations")
    .update({
      status: "ACCEPTED",
      accepted_at: new Date().toISOString(),
    })
    .eq("id", invite.id);
}

export async function mfaGetStatusAction(): Promise<AuthActionState> {
  const correlationId = newCorrelationId();
  try {
    await requireAdminWithoutMfa();
  } catch {
    return {
      errorCode: "denied",
      error: "Toegang geweigerd.",
      correlationId,
    };
  }

  const { getMfaStatus } = await import("@/server/auth/mfa-status");
  const status = await getMfaStatus();
  if (!status) {
    return {
      errorCode: "session",
      error: "Je sessie is verlopen. Log opnieuw in om verder te gaan.",
      correlationId,
    };
  }

  return {
    success: true,
    correlationId,
    status: {
      currentLevel: status.currentLevel,
      hasVerifiedFactor: status.hasVerifiedFactor,
      hasUnverifiedFactor: status.hasUnverifiedFactor,
      verifiedFactorId: status.verifiedFactorId,
      unverifiedFactorId: status.unverifiedFactorId,
    },
    aal2: status.currentLevel === "aal2",
  };
}

export async function mfaEnrollAction(): Promise<AuthActionState> {
  const correlationId = newCorrelationId();
  let adminUserId: string;
  try {
    const ctx = await requireAdminWithoutMfa();
    adminUserId = ctx.user.id;
  } catch {
    return {
      errorCode: "denied",
      error: "Toegang geweigerd.",
      correlationId,
    };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return {
      errorCode: "network",
      error:
        "Instellen lukt momenteel niet. Probeer het opnieuw of log uit en opnieuw in.",
      correlationId,
    };
  }

  const { getMfaStatus } = await import("@/server/auth/mfa-status");
  const status = await getMfaStatus();
  if (status?.hasVerifiedFactor) {
    await writeAuditLog({
      userId: adminUserId,
      action: "auth.mfa_enroll_blocked",
      metadata: { phase: "enroll", code: "existing_factor", correlationId },
    });
    return {
      ...mapMfaError("already enrolled", "existing_factor"),
      correlationId,
      status: {
        currentLevel: status.currentLevel,
        hasVerifiedFactor: true,
        hasUnverifiedFactor: status.hasUnverifiedFactor,
        verifiedFactorId: status.verifiedFactorId,
        unverifiedFactorId: status.unverifiedFactorId,
      },
    };
  }

  if (status?.unverifiedFactorId) {
    await supabase.auth.mfa.unenroll({ factorId: status.unverifiedFactorId });
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Authenticator-app",
  });

  if (error || !data) {
    await writeAuditLog({
      userId: adminUserId,
      action: "auth.mfa_enroll_failed",
      metadata: {
        phase: "enroll",
        code: error?.code ?? "unknown",
        status: error?.status,
        correlationId,
      },
    });
    return { ...mapMfaError(error?.message, "unknown"), correlationId };
  }

  await writeAuditLog({
    userId: adminUserId,
    action: "auth.mfa_enroll_started",
    metadata: { phase: "enroll", code: "ok", correlationId },
  });

  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    correlationId,
  };
}

export async function mfaUnenrollUnverifiedAction(): Promise<AuthActionState> {
  const correlationId = newCorrelationId();
  let adminUserId: string;
  try {
    const ctx = await requireAdminWithoutMfa();
    adminUserId = ctx.user.id;
  } catch {
    return {
      errorCode: "denied",
      error: "Toegang geweigerd.",
      correlationId,
    };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return {
      errorCode: "network",
      error:
        "Instellen lukt momenteel niet. Probeer het opnieuw of log uit en opnieuw in.",
      correlationId,
    };
  }

  const { getMfaStatus } = await import("@/server/auth/mfa-status");
  const status = await getMfaStatus();
  if (!status?.unverifiedFactorId) {
    return { success: true, correlationId };
  }

  const { error } = await supabase.auth.mfa.unenroll({
    factorId: status.unverifiedFactorId,
  });

  if (error) {
    await writeAuditLog({
      userId: adminUserId,
      action: "auth.mfa_unenroll_failed",
      metadata: {
        phase: "unenroll_unverified",
        code: error.code ?? "unknown",
        correlationId,
      },
    });
    return { ...mapMfaError(error.message, "unknown"), correlationId };
  }

  await writeAuditLog({
    userId: adminUserId,
    action: "auth.mfa_unenroll_unverified",
    metadata: { phase: "unenroll_unverified", code: "ok", correlationId },
  });

  return { success: true, correlationId };
}

async function assertAal2AfterVerify(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
): Promise<boolean> {
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return data?.currentLevel === "aal2";
}

export async function mfaVerifyEnrollAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const correlationId = newCorrelationId();
  let adminUserId: string;
  try {
    const ctx = await requireAdminWithoutMfa();
    adminUserId = ctx.user.id;
  } catch {
    return {
      errorCode: "denied",
      error: "Toegang geweigerd.",
      correlationId,
    };
  }

  const factorId = formData.get("factorId") as string;
  const parsed = mfaCodeSchema.safeParse({ code: formData.get("code") });

  if (!factorId || !parsed.success) {
    return {
      errorCode: "invalid_code",
      error:
        "De code klopt niet of is verlopen. Open je authenticator-app en probeer het opnieuw.",
      correlationId,
    };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return {
      errorCode: "network",
      error:
        "Instellen lukt momenteel niet. Probeer het opnieuw of log uit en opnieuw in.",
      correlationId,
    };
  }

  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId });

  if (challengeError || !challenge) {
    await writeAuditLog({
      userId: adminUserId,
      action: "auth.mfa_verify_failed",
      metadata: {
        phase: "enroll_challenge",
        code: challengeError?.code ?? "challenge_failed",
        correlationId,
      },
    });
    return { ...mapMfaError(challengeError?.message, "unknown"), correlationId };
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
      metadata: {
        phase: "enroll_verify",
        code: verifyError.code ?? "invalid_code",
        correlationId,
      },
    });
    return { ...mapMfaError(verifyError.message, "invalid_code"), correlationId };
  }

  const aal2 = await assertAal2AfterVerify(supabase);
  if (!aal2) {
    await writeAuditLog({
      userId: adminUserId,
      action: "auth.mfa_verify_failed",
      metadata: { phase: "enroll_aal2", code: "aal2_pending", correlationId },
    });
    return {
      errorCode: "aal2_pending",
      error:
        "Er ging iets mis. Probeer het opnieuw of log uit en opnieuw in.",
      aal2: false,
      correlationId,
    };
  }

  await writeAuditLog({
    userId: adminUserId,
    action: "auth.mfa_enroll_completed",
    metadata: { phase: "enroll_verify", code: "ok", correlationId },
  });

  revalidatePath("/admin");
  return { success: true, aal2: true, correlationId };
}

export async function mfaVerifyLoginAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const correlationId = newCorrelationId();
  let adminUserId: string;
  try {
    const ctx = await requireAdminWithoutMfa();
    adminUserId = ctx.user.id;
  } catch {
    return {
      errorCode: "denied",
      error: "Toegang geweigerd.",
      correlationId,
    };
  }

  const parsed = mfaCodeSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) {
    return {
      errorCode: "invalid_code",
      error:
        "De code klopt niet of is verlopen. Open je authenticator-app en probeer het opnieuw.",
      correlationId,
    };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return {
      errorCode: "network",
      error:
        "Instellen lukt momenteel niet. Probeer het opnieuw of log uit en opnieuw in.",
      correlationId,
    };
  }

  const { getMfaStatus } = await import("@/server/auth/mfa-status");
  const status = await getMfaStatus();
  if (!status?.verifiedFactorId) {
    redirect("/admin/mfa/setup");
  }

  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId: status.verifiedFactorId });

  if (challengeError || !challenge) {
    await writeAuditLog({
      userId: adminUserId,
      action: "auth.mfa_verify_failed",
      metadata: {
        phase: "login_challenge",
        code: challengeError?.code ?? "challenge_failed",
        correlationId,
      },
    });
    return { ...mapMfaError(challengeError?.message, "unknown"), correlationId };
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId: status.verifiedFactorId,
    challengeId: challenge.id,
    code: parsed.data.code,
  });

  if (verifyError) {
    await writeAuditLog({
      userId: adminUserId,
      action: "auth.mfa_verify_failed",
      metadata: {
        phase: "login_verify",
        code: verifyError.code ?? "invalid_code",
        correlationId,
      },
    });
    return { ...mapMfaError(verifyError.message, "invalid_code"), correlationId };
  }

  const aal2 = await assertAal2AfterVerify(supabase);
  if (!aal2) {
    await writeAuditLog({
      userId: adminUserId,
      action: "auth.mfa_verify_failed",
      metadata: { phase: "login_aal2", code: "aal2_pending", correlationId },
    });
    return {
      errorCode: "aal2_pending",
      error:
        "Er ging iets mis. Probeer het opnieuw of log uit en opnieuw in.",
      aal2: false,
      correlationId,
    };
  }

  await writeAuditLog({
    userId: adminUserId,
    action: "auth.mfa_verify_success",
    metadata: { phase: "login_verify", code: "ok", correlationId },
  });

  revalidatePath("/admin");
  return { success: true, aal2: true, correlationId };
}

/** Guarded admin noop — gebruikt in bypass-tests */
export async function guardedAdminPingAction(): Promise<{ ok: boolean }> {
  const { requireAdmin } = await import("@/server/auth/require-admin");
  await requireAdmin();
  return { ok: true };
}

export async function handleAuthError(error: unknown): Promise<AuthActionState> {
  if (error instanceof AuthError) {
    return { error: "Toegang geweigerd." };
  }
  return { error: "Er is iets misgegaan." };
}
