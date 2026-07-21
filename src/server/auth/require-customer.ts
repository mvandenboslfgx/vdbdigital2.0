import "server-only";
import { createServiceRoleClient } from "@/lib/database/server";
import { requireAuthenticatedUser } from "@/server/auth/require-session";
import { AuthError } from "@/server/auth/errors";
import { writeAuditLog } from "@/lib/security/audit-log";
import type { AuthenticatedUser } from "@/server/auth/types";

export type CustomerOrgRole = "PRIMARY" | "MEMBER" | "BILLING" | "VIEW_ONLY";

export type CustomerOrganization = {
  id: string;
  legalName: string;
  tradeName: string | null;
  status: string;
  type: string;
};

export type CustomerContext = {
  user: AuthenticatedUser;
  organization: CustomerOrganization;
  membershipId: string;
  customerRole: CustomerOrgRole;
  displayName: string;
};

async function loadStaffRole(userId: string): Promise<boolean> {
  const supabase = createServiceRoleClient();
  if (!supabase) return false;
  const { data } = await supabase
    .from("admin_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data?.role);
}

export type CustomerMembershipRow = {
  membershipId: string;
  customerRole: CustomerOrgRole;
  organization: CustomerOrganization;
};

export type CustomerMembershipLookup =
  | { ok: true; memberships: CustomerMembershipRow[] }
  | { ok: false; reason: "unavailable" };

/**
 * Actieve organisatielidmaatschappen — onderscheidt lege resultaten van
 * schema/DB-fouten (fail-closed voor post-login).
 */
export async function lookupCustomerMemberships(
  userId: string,
): Promise<CustomerMembershipLookup> {
  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, reason: "unavailable" };

  const { data, error } = await supabase
    .from("organization_members")
    .select(
      "id, customer_role, organization:organizations(id, legal_name, trade_name, status, type)",
    )
    .eq("user_id", userId)
    .eq("status", "ACTIVE");

  if (error) return { ok: false, reason: "unavailable" };
  if (!data) return { ok: true, memberships: [] };

  const memberships = data
    .map((row) => {
      const rawOrg = row.organization as unknown;
      const org = (Array.isArray(rawOrg) ? rawOrg[0] : rawOrg) as
        | {
            id: string;
            legal_name: string;
            trade_name: string | null;
            status: string;
            type: string;
          }
        | null
        | undefined;
      if (!org || org.status === "BLOCKED" || org.status === "ARCHIVED") {
        return null;
      }
      return {
        membershipId: row.id as string,
        customerRole: row.customer_role as CustomerOrgRole,
        organization: {
          id: org.id,
          legalName: org.legal_name,
          tradeName: org.trade_name,
          status: org.status,
          type: org.type,
        },
      };
    })
    .filter((m): m is CustomerMembershipRow => m !== null);

  return { ok: true, memberships };
}

/** Actieve organisatielidmaatschappen voor de huidige gebruiker. */
export async function listCustomerMemberships(
  userId: string,
): Promise<CustomerMembershipRow[]> {
  const result = await lookupCustomerMemberships(userId);
  if (!result.ok) return [];
  return result.memberships;
}

export async function requireCustomer(
  organizationId?: string,
): Promise<CustomerContext> {
  const user = await requireAuthenticatedUser();
  const supabase = createServiceRoleClient();
  if (!supabase) {
    throw new AuthError("UNAUTHENTICATED", "Authenticatie niet geconfigureerd");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.is_active === false) {
    await writeAuditLog({
      userId: user.id,
      action: "auth.portal_access_denied",
      metadata: { reason: "account_disabled" },
    });
    throw new AuthError("ACCOUNT_DISABLED");
  }

  const memberships = await listCustomerMemberships(user.id);
  if (memberships.length === 0) {
    await writeAuditLog({
      userId: user.id,
      action: "auth.portal_access_denied",
      metadata: { reason: "no_membership" },
    });
    throw new AuthError("FORBIDDEN");
  }

  const selected =
    (organizationId
      ? memberships.find((m) => m.organization.id === organizationId)
      : memberships[0]) ?? null;

  if (!selected) {
    throw new AuthError("FORBIDDEN");
  }

  return {
    user,
    organization: selected.organization,
    membershipId: selected.membershipId,
    customerRole: selected.customerRole,
    displayName: profile.full_name?.trim() || profile.email || user.email,
  };
}

export async function checkCustomerAccess(): Promise<{
  authorized: boolean;
  redirectTo?: string;
  context?: CustomerContext;
  isStaff?: boolean;
}> {
  try {
    const user = await requireAuthenticatedUser();
    const isStaff = await loadStaffRole(user.id);
    if (isStaff) {
      return { authorized: false, redirectTo: "/admin", isStaff: true };
    }
    const context = await requireCustomer();
    return { authorized: true, context };
  } catch (err) {
    if (err instanceof AuthError && err.code === "ACCOUNT_DISABLED") {
      return { authorized: false, redirectTo: "/inloggen?fout=geblokkeerd" };
    }
    return { authorized: false, redirectTo: "/inloggen" };
  }
}
