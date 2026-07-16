import "server-only";
import { getMfaStatus } from "@/server/auth/mfa-status";
import { AuthError } from "@/server/auth/errors";

/** Vereist actieve AAL2-sessie (MFA geverifieerd). */
export async function requireAal2(): Promise<void> {
  const status = await getMfaStatus();

  if (!status) {
    throw new AuthError("UNAUTHENTICATED");
  }

  if (!status.hasVerifiedFactor) {
    throw new AuthError("MFA_SETUP_REQUIRED");
  }

  if (status.currentLevel !== "aal2") {
    throw new AuthError("MFA_REQUIRED");
  }
}

/** Controleert MFA-status zonder throw — voor redirects in layouts */
export async function getAal2RedirectPath(): Promise<string | null> {
  const status = await getMfaStatus();
  if (!status) return "/admin/login";

  if (!status.hasVerifiedFactor) {
    return "/admin/mfa/setup";
  }

  if (status.currentLevel !== "aal2") {
    return "/admin/mfa/verify";
  }

  return null;
}
