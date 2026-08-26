"use server";

import { accountDeletionFormSchema } from "@/lib/validation/forms";
import { checkRateLimit, rateLimitErrorMessage } from "@/lib/security/rate-limit";
import { verifyOrigin } from "@/lib/security/origin";
import { createServiceRoleClient } from "@/lib/database/server";
import { createInviteToken, hashInviteToken } from "@/lib/auth/invite-token";
import { sendAccountDeletionVerifyEmail } from "@/lib/email/resend";
import { resolveAppUrl } from "@/lib/url/app-url";
import { paths } from "@/i18n/config";
import { parseFormLocale } from "@/i18n/locale-query";
import { writeAuditLog } from "@/lib/security/audit-log";

export type AccountDeletionFormState = {
  errors?: string[];
  success?: boolean;
  genericAck?: boolean;
} | null;

const GENERIC_ACK =
  "If this address is linked to a VDB Digital account, you will receive further instructions by email.";

const GENERIC_ACK_NL =
  "Als dit adres aan een VDB Digital-account is gekoppeld, ontvang je verdere instructies per e-mail.";

export async function submitAccountDeletionAction(
  _prev: AccountDeletionFormState,
  formData: FormData,
): Promise<AccountDeletionFormState> {
  if (!(await verifyOrigin())) {
    return { errors: ["Invalid request"] };
  }

  const parsed = accountDeletionFormSchema.safeParse({
    email: formData.get("email"),
    confirm: formData.get("confirm") === "on" || formData.get("confirm") === "true",
    website: formData.get("website") ?? "",
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.issues.map((issue) => issue.message),
    };
  }

  const email = parsed.data.email.toLowerCase();
  const rateLimit = await checkRateLimit("account-deletion", email);
  if (!rateLimit.success) {
    return { errors: [rateLimitErrorMessage(rateLimit)] };
  }

  const locale = parseFormLocale(formData.get("locale"));
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { errors: ["Account deletion is not configured"] };
  }

  const token = createInviteToken();
  const tokenHash = hashInviteToken(token);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { data: stored, error } = await supabase.rpc(
    "create_account_deletion_web_verification",
    {
      p_email: email,
      p_token_hash: tokenHash,
      p_expires_at: expiresAt,
    },
  );

  if (error) {
    await writeAuditLog({
      action: "account.deletion.web_request_failed",
      metadata: { reason: error.message },
    });
    return {
      success: true,
      genericAck: true,
      errors: undefined,
    };
  }

  const payload = stored as { stored?: boolean } | null;
  if (payload?.stored === true) {
    const verifyUrl = `${resolveAppUrl()}${paths.accountDeletion}/confirm?token=${token}`;
    await sendAccountDeletionVerifyEmail(email, verifyUrl, locale);
    await writeAuditLog({
      action: "account.deletion.web_verification_sent",
      metadata: { source: "WEB" },
    });
  }

  return {
    success: true,
    genericAck: true,
  };
}

export async function confirmAccountDeletionToken(token: string): Promise<{
  ok: boolean;
  error?: string;
  requestId?: string;
  status?: string;
}> {
  if (!token || token.length < 32) {
    return { ok: false, error: "INVALID_TOKEN" };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { ok: false, error: "NOT_CONFIGURED" };
  }

  const tokenHash = hashInviteToken(token);
  const { data: verified, error: verifyError } = await supabase.rpc(
    "verify_account_deletion_web_token",
    { p_token_hash: tokenHash },
  );

  if (verifyError) {
    const msg = verifyError.message ?? "VERIFY_FAILED";
    if (msg.includes("TOKEN_EXPIRED")) return { ok: false, error: "TOKEN_EXPIRED" };
    if (msg.includes("TOKEN_ALREADY_USED")) return { ok: false, error: "TOKEN_ALREADY_USED" };
    return { ok: false, error: "INVALID_TOKEN" };
  }

  const requestId = (verified as { request_id?: string; status?: string } | null)?.request_id;
  const status = (verified as { request_id?: string; status?: string } | null)?.status;
  if (!requestId) {
    return { ok: false, error: "INVALID_TOKEN" };
  }

  // Production apex closeout: verify + create canonical request only.
  // Never call process_account_deletion here — auto-erasure is fail-closed until separately approved.
  await writeAuditLog({
    action: "account.deletion.web_verified",
    resourceType: "account_deletion_requests",
    resourceId: requestId,
    metadata: { source: "WEB", status: status ?? "VERIFIED", auto_erasure: false },
  });

  return { ok: true, requestId, status: status ?? "VERIFIED" };
}
