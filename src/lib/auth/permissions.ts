import type { AdminRole } from "@/types";

/** Expliciete permissions — deny by default */
export type Permission =
  | "products.read"
  | "products.create"
  | "products.update"
  | "products.publish"
  | "products.change_price"
  | "orders.read"
  | "orders.update_status"
  | "payments.read"
  | "payments.refund"
  | "leads.read"
  | "leads.update"
  | "content.manage"
  | "cases.manage"
  | "roles.read"
  | "roles.manage"
  | "settings.read"
  | "settings.manage"
  | "audit.read";

const ROLE_PERMISSIONS: Record<AdminRole, readonly Permission[]> = {
  CONTENT: [
    "products.read",
    "products.update",
    "content.manage",
    "cases.manage",
  ],
  SUPPORT: [
    "products.read",
    "orders.read",
    "leads.read",
    "leads.update",
    "payments.read",
  ],
  ADMIN: [
    "products.read",
    "products.create",
    "products.update",
    "products.publish",
    "products.change_price",
    "orders.read",
    "orders.update_status",
    "payments.read",
    "leads.read",
    "leads.update",
    "content.manage",
    "cases.manage",
    "settings.read",
    "audit.read",
  ],
  OWNER: [
    "products.read",
    "products.create",
    "products.update",
    "products.publish",
    "products.change_price",
    "orders.read",
    "orders.update_status",
    "payments.read",
    "payments.refund",
    "leads.read",
    "leads.update",
    "content.manage",
    "cases.manage",
    "roles.read",
    "roles.manage",
    "settings.read",
    "settings.manage",
    "audit.read",
  ],
};

/** Acties die recente herauthenticatie (AAL2) vereisen */
export const SENSITIVE_PERMISSIONS: ReadonlySet<Permission> = new Set([
  "roles.manage",
  "payments.refund",
  "settings.manage",
  "products.change_price",
  "products.publish",
]);

export function getPermissionsForRole(role: AdminRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}

export function hasPermission(role: AdminRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function hasMinRole(userRole: AdminRole, minRole: AdminRole): boolean {
  const hierarchy: AdminRole[] = ["CONTENT", "SUPPORT", "ADMIN", "OWNER"];
  return hierarchy.indexOf(userRole) >= hierarchy.indexOf(minRole);
}

/** @deprecated Gebruik hasPermission("products.update") */
export function canManageProducts(role: AdminRole): boolean {
  return hasPermission(role, "products.update");
}

/** @deprecated Gebruik hasPermission("orders.read") */
export function canManageOrders(role: AdminRole): boolean {
  return hasPermission(role, "orders.read");
}

export function canAssignRole(actorRole: AdminRole, targetRole: AdminRole): boolean {
  if (!hasPermission(actorRole, "roles.manage")) return false;
  if (targetRole === "OWNER" && actorRole !== "OWNER") return false;
  return hasMinRole(actorRole, targetRole);
}

export function canRemoveOwner(actorRole: AdminRole): boolean {
  return actorRole === "OWNER" && hasPermission(actorRole, "roles.manage");
}
