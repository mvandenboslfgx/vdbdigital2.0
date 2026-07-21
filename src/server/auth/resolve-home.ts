import "server-only";
import { createServiceRoleClient } from "@/lib/database/server";
import { lookupCustomerMemberships } from "@/server/auth/require-customer";
import { getAal2RedirectPath } from "@/server/auth/require-aal2";
import { audienceSafeInternalPath } from "@/lib/security/redirect";

/** Terminal post-login path for authenticated users without staff/org access. */
export const AUTH_NO_ACCESS_PATH = "/geen-toegang";

export function isAuthNoAccessPath(path: string): boolean {
  const pathname = path.split("?")[0] ?? path;
  return pathname === AUTH_NO_ACCESS_PATH;
}

function temporaryAccessPath(): string {
  return `${AUTH_NO_ACCESS_PATH}?reden=tijdelijk`;
}

function blockedAccessPath(): string {
  return `${AUTH_NO_ACCESS_PATH}?reden=geblokkeerd`;
}

/**
 * Bepaalt de post-login bestemming op basis van rollen.
 * Staff (admin_roles) → /admin (eventueel via MFA).
 * Actief organisatielid → /portal.
 * Authenticated zonder toegang → /geen-toegang (terminal — geen login-loop).
 * Schema/DB-fouten → fail-closed op /geen-toegang?reden=tijdelijk.
 *
 * `next` wordt server-side gevalideerd én audience-aware.
 */
export async function resolvePostLoginPath(
  userId: string,
  requestedNext?: string | null,
): Promise<string> {
  const supabase = createServiceRoleClient();
  if (!supabase) return temporaryAccessPath();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_active")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) return temporaryAccessPath();

  if (profile?.is_active === false) {
    return blockedAccessPath();
  }

  const { data: roleRow, error: roleError } = await supabase
    .from("admin_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (roleError) return temporaryAccessPath();

  if (roleRow?.role) {
    const mfaRedirect = await getAal2RedirectPath();
    if (mfaRedirect) return mfaRedirect;
    return audienceSafeInternalPath(requestedNext, "staff", "/admin");
  }

  const membershipLookup = await lookupCustomerMemberships(userId);
  if (!membershipLookup.ok) {
    return temporaryAccessPath();
  }

  if (membershipLookup.memberships.length > 0) {
    return audienceSafeInternalPath(requestedNext, "customer", "/portal");
  }

  return AUTH_NO_ACCESS_PATH;
}
