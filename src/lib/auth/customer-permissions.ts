/**
 * Customer org-role permissions (portal).
 * Deny-by-default for mutating actions.
 */
import type { CustomerOrgRole } from "@/server/auth/require-customer";

export type CustomerPortalPermission =
  | "portal.access"
  | "portal.profile.edit"
  | "portal.quotes.respond"
  | "portal.support.create"
  | "portal.support.reply"
  | "portal.billing.view";

const ROLE_PERMS: Record<CustomerOrgRole, readonly CustomerPortalPermission[]> = {
  VIEW_ONLY: ["portal.access", "portal.profile.edit", "portal.billing.view"],
  BILLING: [
    "portal.access",
    "portal.profile.edit",
    "portal.billing.view",
    "portal.quotes.respond",
  ],
  MEMBER: [
    "portal.access",
    "portal.profile.edit",
    "portal.quotes.respond",
    "portal.support.create",
    "portal.support.reply",
  ],
  PRIMARY: [
    "portal.access",
    "portal.profile.edit",
    "portal.quotes.respond",
    "portal.support.create",
    "portal.support.reply",
    "portal.billing.view",
  ],
};

export function hasCustomerPermission(
  role: CustomerOrgRole,
  permission: CustomerPortalPermission,
): boolean {
  return ROLE_PERMS[role]?.includes(permission) ?? false;
}

export function assertCustomerPermission(
  role: CustomerOrgRole,
  permission: CustomerPortalPermission,
): void {
  if (!hasCustomerPermission(role, permission)) {
    throw new Error("PORTAL_PERMISSION_DENIED");
  }
}
