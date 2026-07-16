import "server-only";

/**
 * @deprecated Gebruik `@/server/auth/require-admin`.
 */
export { checkAdminAccess } from "@/server/auth/require-admin";
export { getOptionalAuthenticatedUser } from "@/server/auth/require-session";

/** @deprecated Gebruik getOptionalAuthenticatedUser */
export { getOptionalAuthenticatedUser as getSession } from "@/server/auth/require-session";

/** @deprecated Gebruik checkAdminAccess() */
export async function requireAdmin(minRole?: import("@/types").AdminRole) {
  const { checkAdminAccess } = await import("@/server/auth/require-admin");
  const { hasMinRole } = await import("@/lib/auth/permissions");
  const access = await checkAdminAccess();
  if (!access.context) {
    return { authorized: false as const, profile: null };
  }
  if (minRole && !hasMinRole(access.context.role, minRole)) {
    return { authorized: false as const, profile: null };
  }
  return {
    authorized: true as const,
    profile: {
      id: access.context.user.id,
      email: access.context.user.email,
      role: access.context.role,
    },
  };
}

/** @deprecated Gebruik checkAdminAccess() */
export async function getAdminProfile() {
  const { checkAdminAccess } = await import("@/server/auth/require-admin");
  const access = await checkAdminAccess();
  if (!access.context) return null;
  return {
    id: access.context.user.id,
    email: access.context.user.email,
    role: access.context.role,
  };
}
