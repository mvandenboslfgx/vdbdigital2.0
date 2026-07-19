/**
 * Customer org-role permissions (portal).
 * Deny-by-default for mutating actions.
 */
import type { CustomerOrgRole } from "@/server/auth/require-customer";

export type CustomerPortalPermission =
  | "portal.access"
  | "portal.profile.edit"
  | "portal.quotes.respond"
  | "portal.quotes.view"
  | "portal.quotes.download"
  | "portal.quotes.accept"
  | "portal.quotes.decline"
  | "portal.support.create"
  | "portal.support.reply"
  | "portal.billing.view"
  | "portal.invoices.view"
  | "portal.invoices.download"
  | "portal.projects.view"
  | "portal.projects.feedback"
  | "portal.projects.approve_deliverable"
  | "portal.projects.complete_action"
  | "portal.documents.view"
  | "portal.documents.download"
  | "portal.documents.upload"
  | "portal.documents.manage_own_uploads";

const ROLE_PERMS: Record<CustomerOrgRole, readonly CustomerPortalPermission[]> = {
  VIEW_ONLY: [
    "portal.access",
    "portal.profile.edit",
    "portal.billing.view",
    "portal.invoices.view",
    "portal.invoices.download",
    "portal.projects.view",
    "portal.documents.view",
    "portal.documents.download",
    "portal.quotes.view",
    "portal.quotes.download",
  ],
  BILLING: [
    "portal.access",
    "portal.profile.edit",
    "portal.billing.view",
    "portal.invoices.view",
    "portal.invoices.download",
    "portal.projects.view",
    "portal.documents.view",
    "portal.documents.download",
    "portal.quotes.view",
    "portal.quotes.download",
  ],
  MEMBER: [
    "portal.access",
    "portal.profile.edit",
    "portal.quotes.respond",
    "portal.quotes.view",
    "portal.quotes.download",
    "portal.quotes.accept",
    "portal.quotes.decline",
    "portal.support.create",
    "portal.support.reply",
    "portal.invoices.view",
    "portal.invoices.download",
    "portal.projects.view",
    "portal.projects.feedback",
    "portal.projects.approve_deliverable",
    "portal.projects.complete_action",
    "portal.documents.view",
    "portal.documents.download",
    "portal.documents.upload",
  ],
  PRIMARY: [
    "portal.access",
    "portal.profile.edit",
    "portal.quotes.respond",
    "portal.quotes.view",
    "portal.quotes.download",
    "portal.quotes.accept",
    "portal.quotes.decline",
    "portal.support.create",
    "portal.support.reply",
    "portal.billing.view",
    "portal.invoices.view",
    "portal.invoices.download",
    "portal.projects.view",
    "portal.projects.feedback",
    "portal.projects.approve_deliverable",
    "portal.projects.complete_action",
    "portal.documents.view",
    "portal.documents.download",
    "portal.documents.upload",
    "portal.documents.manage_own_uploads",
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
