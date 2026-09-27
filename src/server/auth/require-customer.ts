import "server-only";
import { cache } from "react";
import { createServiceRoleClient } from "@/lib/database/server";
import { requireAuthenticatedUser, logPortalLayer, detectPortalNavKind } from "@/server/auth/require-session";
import { AuthError, type AuthErrorCode } from "@/server/auth/errors";
import { writeAuditLog } from "@/lib/security/audit-log";
import { isCustomerOrganizationStatus } from "@/lib/auth/customer-ssot";
import { ensureCustomerOrg } from "@/server/auth/ensure-customer-org";
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
  const { data, error } = await supabase
    .from("admin_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    logPortalLayer("staff_role_lookup", {
      pass: false,
      errorCode: error.code ?? null,
      errorMessage: error.message?.slice(0, 120) ?? null,
    });
    return false;
  }
  return Boolean(data?.role);
}

export type CustomerMembershipRow = {
  membershipId: string;
  customerRole: CustomerOrgRole;
  organization: CustomerOrganization;
};

export type CustomerMembershipLookup =
  | { ok: true; memberships: CustomerMembershipRow[] }
  | { ok: false; reason: "unavailable"; errorCode?: string; errorMessage?: string };

/**
 * Actieve organisatielidmaatschappen — onderscheidt lege resultaten van
 * schema/DB-fouten (fail-closed voor post-login).
 */
export async function lookupCustomerMemberships(
  userId: string,
): Promise<CustomerMembershipLookup> {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return {
      ok: false,
      reason: "unavailable",
      errorMessage: "service_role_unavailable",
    };
  }

  const { data, error } = await supabase
    .from("organization_members")
    .select(
      "id, customer_role, organization:organizations(id, legal_name, trade_name, status, type)",
    )
    .eq("user_id", userId)
    .eq("status", "ACTIVE");

  if (error) {
    logPortalLayer("membership_lookup", {
      pass: false,
      errorCode: error.code ?? null,
      errorMessage: error.message?.slice(0, 120) ?? null,
    });
    return {
      ok: false,
      reason: "unavailable",
      errorCode: error.code,
      errorMessage: error.message?.slice(0, 120),
    };
  }
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
      if (!org || !isCustomerOrganizationStatus(org.status)) {
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

  logPortalLayer("membership_lookup", {
    pass: true,
    count: memberships.length,
    filteredOut: data.length - memberships.length,
  });

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

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  is_active: boolean | null;
};

async function loadProfile(userId: string): Promise<
  | { ok: true; profile: ProfileRow | null }
  | { ok: false; errorCode?: string; errorMessage?: string }
> {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { ok: false, errorMessage: "service_role_unavailable" };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, is_active")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    logPortalLayer("profile_lookup", {
      pass: false,
      errorCode: error.code ?? null,
      errorMessage: error.message?.slice(0, 120) ?? null,
    });
    return {
      ok: false,
      errorCode: error.code,
      errorMessage: error.message?.slice(0, 120),
    };
  }

  logPortalLayer("profile_lookup", {
    pass: true,
    found: Boolean(data),
    isActive: data?.is_active ?? null,
  });

  return { ok: true, profile: (data as ProfileRow | null) ?? null };
}

/**
 * Idempotent bootstrap when authenticated user has no ACTIVE customer membership.
 * Never creates duplicates (customer_number + upsert membership).
 */
async function tryBootstrapCustomer(
  user: AuthenticatedUser,
): Promise<{ status: string; organizationId?: string | null }> {
  const result = await ensureCustomerOrg(user.id, {
    source: "confirmed_login",
    email: user.email,
  });
  logPortalLayer("customer_bootstrap", {
    status: result.status,
    reason: "reason" in result ? result.reason : null,
    hasOrg:
      "organizationId" in result ? Boolean(result.organizationId) : false,
  });
  return {
    status: result.status,
    organizationId:
      "organizationId" in result ? (result.organizationId ?? null) : null,
  };
}

async function requireCustomerImpl(
  organizationId?: string,
): Promise<CustomerContext> {
  const nav = await detectPortalNavKind();
  logPortalLayer("require_customer_start", { nav });

  const user = await requireAuthenticatedUser();
  logPortalLayer("authenticated_user", { pass: true, nav });

  const supabase = createServiceRoleClient();
  if (!supabase) {
    // Config/DB — NOT unauthenticated.
    throw new Error("service_role_unavailable");
  }

  let profileResult = await loadProfile(user.id);
  if (!profileResult.ok) {
    throw new Error(
      `profile_lookup_failed:${profileResult.errorCode ?? "unknown"}`,
    );
  }

  // Missing profile → bootstrap (not ACCOUNT_DISABLED / not login).
  if (!profileResult.profile) {
    await tryBootstrapCustomer(user);
    profileResult = await loadProfile(user.id);
    if (!profileResult.ok) {
      throw new Error(
        `profile_lookup_failed:${profileResult.errorCode ?? "unknown"}`,
      );
    }
    if (!profileResult.profile) {
      throw new Error("profile_missing_after_bootstrap");
    }
  }

  const profile = profileResult.profile;
  if (profile.is_active === false) {
    await writeAuditLog({
      userId: user.id,
      action: "auth.portal_access_denied",
      metadata: { reason: "account_disabled" },
    });
    throw new AuthError("ACCOUNT_DISABLED");
  }
  logPortalLayer("profile", { pass: true, isActive: true });

  let membershipLookup = await lookupCustomerMemberships(user.id);
  if (!membershipLookup.ok) {
    await writeAuditLog({
      userId: user.id,
      action: "auth.portal_access_denied",
      metadata: { reason: "membership_lookup_unavailable" },
    });
    throw new Error(
      `membership_lookup_unavailable:${membershipLookup.errorCode ?? "unknown"}`,
    );
  }

  // No ACTIVE membership → idempotent bootstrap, then re-lookup.
  if (membershipLookup.memberships.length === 0) {
    const boot = await tryBootstrapCustomer(user);
    if (boot.status === "skipped") {
      await writeAuditLog({
        userId: user.id,
        action: "auth.portal_access_denied",
        metadata: { reason: "no_membership_managed_or_invited" },
      });
      throw new AuthError("FORBIDDEN");
    }
    if (boot.status === "unavailable") {
      throw new Error("customer_bootstrap_unavailable");
    }
    membershipLookup = await lookupCustomerMemberships(user.id);
    if (!membershipLookup.ok) {
      throw new Error(
        `membership_lookup_unavailable:${membershipLookup.errorCode ?? "unknown"}`,
      );
    }
  }

  const memberships = membershipLookup.memberships;
  if (memberships.length === 0) {
    await writeAuditLog({
      userId: user.id,
      action: "auth.portal_access_denied",
      metadata: { reason: "no_membership_after_bootstrap" },
    });
    throw new AuthError("FORBIDDEN");
  }
  logPortalLayer("organization", {
    pass: true,
    membershipCount: memberships.length,
  });
  logPortalLayer("membership", { pass: true, count: memberships.length });

  const selected =
    (organizationId
      ? memberships.find((m) => m.organization.id === organizationId)
      : memberships[0]) ?? null;

  if (!selected) {
    logPortalLayer("capability", { pass: false, reason: "org_not_selected" });
    throw new AuthError("FORBIDDEN");
  }
  logPortalLayer("capability", {
    pass: true,
    role: selected.customerRole,
  });
  logPortalLayer("require_customer_done", {
    pass: true,
    orgStatus: selected.organization.status,
  });

  return {
    user,
    organization: selected.organization,
    membershipId: selected.membershipId,
    customerRole: selected.customerRole,
    displayName: profile.full_name?.trim() || profile.email || user.email,
  };
}

/** Per-request cache — layout + page share one customer resolution. */
export const requireCustomer = cache(
  async (organizationId?: string): Promise<CustomerContext> => {
    return requireCustomerImpl(organizationId);
  },
);

export async function checkCustomerAccess(): Promise<{
  authorized: boolean;
  redirectTo?: string;
  context?: CustomerContext;
  isStaff?: boolean;
  reason?: AuthErrorCode | "UNKNOWN";
}> {
  const nav = await detectPortalNavKind();
  try {
    const user = await requireAuthenticatedUser();
    const isStaff = await loadStaffRole(user.id);
    logPortalLayer("portal_layout", {
      pass: true,
      nav,
      isStaff,
    });
    if (isStaff) {
      return { authorized: false, redirectTo: "/admin", isStaff: true };
    }
    const context = await requireCustomer();
    logPortalLayer("require_portal_customer", { pass: true, nav });
    return { authorized: true, context };
  } catch (err) {
    const code =
      err instanceof AuthError ? err.code : ("UNKNOWN" as const);
    const message =
      err instanceof Error ? err.message.slice(0, 120) : "unknown";
    logPortalLayer("portal_layout", {
      pass: false,
      nav,
      reason: code,
      message,
    });
    // Do not collapse FORBIDDEN / bootstrap gaps into "not logged in".
    if (code === "UNAUTHENTICATED") {
      return { authorized: false, redirectTo: "/inloggen", reason: code };
    }
    if (code === "ACCOUNT_DISABLED") {
      return {
        authorized: false,
        redirectTo: "/geen-toegang?reden=geblokkeerd",
        reason: code,
      };
    }
    if (code === "FORBIDDEN") {
      return {
        authorized: false,
        redirectTo: "/geen-toegang",
        reason: code,
      };
    }
    return {
      authorized: false,
      redirectTo: "/geen-toegang?reden=tijdelijk",
      reason: code,
    };
  }
}
