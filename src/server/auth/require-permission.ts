import "server-only";
import {
  hasPermission,
  SENSITIVE_PERMISSIONS,
} from "@/lib/auth/permissions";
import type { Permission } from "@/lib/auth/permissions";
import type { AdminContext } from "@/server/auth/types";
import { AuthError } from "@/server/auth/errors";
import { writeAuditLog } from "@/lib/security/audit-log";

export async function requirePermission(
  ctx: AdminContext,
  permission: Permission,
): Promise<void> {
  if (!hasPermission(ctx.role, permission)) {
    await writeAuditLog({
      userId: ctx.user.id,
      action: "auth.permission_denied",
      metadata: { permission, role: ctx.role },
    });
    throw new AuthError("FORBIDDEN");
  }

  if (SENSITIVE_PERMISSIONS.has(permission) && ctx.aal !== "aal2") {
    throw new AuthError("MFA_REQUIRED");
  }
}

export async function requireAnyPermission(
  ctx: AdminContext,
  permissions: Permission[],
): Promise<void> {
  const allowed = permissions.some((p) => hasPermission(ctx.role, p));
  if (!allowed) {
    await writeAuditLog({
      userId: ctx.user.id,
      action: "auth.permission_denied",
      metadata: { permissions, role: ctx.role },
    });
    throw new AuthError("FORBIDDEN");
  }
}
