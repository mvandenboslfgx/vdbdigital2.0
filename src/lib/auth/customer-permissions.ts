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
  | "portal.billing.view"
  | "portal.projects.view"
  | "portal.projects.feedback"
  | "portal.projects.approve_deliverable"
  | "portal.projects.complete_action";

const ROLE_PERMS: Record<CustomerOrgRole, readonly CustomerPortalPermission[]> = {
  VIEW_ONLY: [
    "portal.access",
    "portal.profile.edit",
    "portal.billing.view",
    "portal.projects.view",
  ],
  BILLING: [
    "portal.access",
    "portal.profile.edit",
    "portal.billing.view",
    "portal.quotes.respond",
    "portal.projects.view",
  ],
  MEMBER: [
    "portal.access",
    "portal.profile.edit",
    "portal.quotes.respond",
    "portal.support.create",
    "portal.support.reply",
    "portal.projects.view",
    "portal.projects.feedback",
    "portal.projects.approve_deliverable",
    "portal.projects.complete_action",
  ],
  PRIMARY: [
    "portal.access",
    "portal.profile.edit",
    "portal.quotes.respond",
    "portal.support.create",
    "portal.support.reply",
    "portal.billing.view",
    "portal.projects.view",
    "portal.projects.feedback",
    "portal.projects.approve_deliverable",
    "portal.projects.complete_action",
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
