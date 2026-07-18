import "server-only";
import { createServiceRoleClient } from "@/lib/database/server";
import { getPermissionsForRole } from "@/lib/auth/permissions";
import type { AdminRole } from "@/types";
import { requireAuthenticatedUser } from "@/server/auth/require-session";
import { requireAal2 } from "@/server/auth/require-aal2";
import { AuthError } from "@/server/auth/errors";
import { writeAuditLog } from "@/lib/security/audit-log";
import type { AdminContext } from "@/server/auth/types";

async function loadTrustedAdminRole(userId: string): Promise<{
  role: AdminRole;
  isActive: boolean;
} | null> {
  const supabase = createServiceRoleClient();
  if (!supabase) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, is_active")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) return null;

  const isActive = profile.is_active !== false;

  const { data: roleRow } = await supabase
    .from("admin_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (!roleRow?.role) return null;

  return {
    role: roleRow.role as AdminRole,
    isActive,
  };
}

/** Admincontext zonder MFA — alleen voor MFA-setup/verify routes */
export async function requireAdminWithoutMfa(): Promise<AdminContext> {
  const user = await requireAuthenticatedUser();
  const trusted = await loadTrustedAdminRole(user.id);

  if (!trusted) {
    await writeAuditLog({
      userId: user.id,
      action: "auth.admin_access_denied",
      metadata: { reason: "no_role" },
    });
    throw new AuthError("FORBIDDEN");
  }

  if (!trusted.isActive) {
    await writeAuditLog({
      userId: user.id,
      action: "auth.admin_access_denied",
      metadata: { reason: "account_disabled" },
    });
    throw new AuthError("ACCOUNT_DISABLED");
  }

  return {
    user,
    role: trusted.role,
    aal: "aal1",
    permissions: getPermissionsForRole(trusted.role),
  };
}

/** Volledige admincontext — sessie + rol + AAL2 */
export async function requireAdmin(): Promise<AdminContext> {
  const user = await requireAuthenticatedUser();
  await requireAal2();

  const trusted = await loadTrustedAdminRole(user.id);

  if (!trusted) {
    await writeAuditLog({
      userId: user.id,
      action: "auth.admin_access_denied",
      metadata: { reason: "no_role" },
    });
    throw new AuthError("FORBIDDEN");
  }

  if (!trusted.isActive) {
    throw new AuthError("ACCOUNT_DISABLED");
  }

  return {
    user,
    role: trusted.role,
    aal: "aal2",
    permissions: getPermissionsForRole(trusted.role),
  };
}

/** Layout-safe variant — geen throw, retourneert authorized boolean */
export async function checkAdminAccess(): Promise<{
  authorized: boolean;
  redirectTo?: string;
  context?: AdminContext;
}> {
  try {
    const user = await requireAuthenticatedUser();
    const trusted = await loadTrustedAdminRole(user.id);

    if (!trusted || !trusted.isActive) {
      const { listCustomerMemberships } = await import(
        "@/server/auth/require-customer"
      );
      const memberships = await listCustomerMemberships(user.id);
      if (memberships.length > 0) {
        return { authorized: false, redirectTo: "/portal" };
      }
      return { authorized: false, redirectTo: "/inloggen" };
    }

    const { getAal2RedirectPath } = await import("@/server/auth/require-aal2");
    const mfaRedirect = await getAal2RedirectPath();
    if (mfaRedirect) {
      return { authorized: false, redirectTo: mfaRedirect };
    }

    return {
      authorized: true,
      context: {
        user,
        role: trusted.role,
        aal: "aal2",
        permissions: getPermissionsForRole(trusted.role),
      },
    };
  } catch {
    return { authorized: false, redirectTo: "/inloggen" };
  }
}
