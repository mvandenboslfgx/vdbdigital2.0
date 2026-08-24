/**
 * Customer SSOT — organizations + ACTIVE organization_members.
 *
 * CUSTOMER is never implied by:
 * - auth.users / profiles existence
 * - OWNER / ADMIN / SUPPORT staff roles
 * - PARTNER / partner_pending
 * - a lead or contact row
 * - project visibility alone
 *
 * A customer account is an `organizations` row.
 * A customer user is a person with status=ACTIVE membership on a
 * non-BLOCKED, non-ARCHIVED organization.
 */

export const CUSTOMER_MEMBERSHIP_TABLE = "organization_members" as const;
export const CUSTOMER_ACCOUNT_TABLE = "organizations" as const;

export const NON_CUSTOMER_ROLES = [
  "OWNER",
  "ADMIN",
  "SUPPORT",
  "CONTENT",
  "PARTNER",
  "PARTNER_PENDING",
] as const;

export function isCustomerOrganizationStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  const normalized = status.toUpperCase();
  return normalized !== "BLOCKED" && normalized !== "ARCHIVED" && normalized !== "SUSPENDED";
}

export function isActiveCustomerMembership(status: string | null | undefined): boolean {
  return (status ?? "").toUpperCase() === "ACTIVE";
}
