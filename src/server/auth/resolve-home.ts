import "server-only";
import { createServiceRoleClient } from "@/lib/database/server";
import { listCustomerMemberships } from "@/server/auth/require-customer";
import { getAal2RedirectPath } from "@/server/auth/require-aal2";
import { audienceSafeInternalPath } from "@/lib/security/redirect";

/**
 * Bepaalt de post-login bestemming op basis van rollen.
 * Staff (admin_roles) → /admin (eventueel via MFA).
 * Actief organisatielid → /portal.
 * Anders → /inloggen met generieke fout.
 *
 * `next` wordt server-side gevalideerd én audience-aware.
 */
export async function resolvePostLoginPath(
  userId: string,
  requestedNext?: string | null,
): Promise<string> {
  const supabase = createServiceRoleClient();
  if (!supabase) return "/inloggen";

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.is_active === false) {
    return "/inloggen?fout=geblokkeerd";
  }

  const { data: roleRow } = await supabase
    .from("admin_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (roleRow?.role) {
    const mfaRedirect = await getAal2RedirectPath();
    if (mfaRedirect) return mfaRedirect;
    return audienceSafeInternalPath(requestedNext, "staff", "/admin");
  }

  const memberships = await listCustomerMemberships(userId);
  if (memberships.length > 0) {
    return audienceSafeInternalPath(requestedNext, "customer", "/portal");
  }

  return "/inloggen?fout=geen-toegang";
}
