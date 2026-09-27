import "server-only";
import { createServiceRoleClient } from "@/lib/database/server";
import { writeAuditLog } from "@/lib/security/audit-log";
import { recordMarketingConsent } from "@/server/services/marketing-consent";

/**
 * Zelfbediening-provisioning voor klantaccounts.
 *
 * Customer SSOT blijft `organizations` + ACTIVE `organization_members`.
 * Deze helper maakt uitsluitend die twee rijen (plus een profiles-rij) aan en
 * raakt `admin_roles` nooit aan: staff-toegang komt alleen uit bestaande
 * admin_roles-rijen die door een OWNER zijn gezet.
 */

export type CustomerOrgSource =
  | "self_registration"
  | "auth_callback"
  | "confirmed_login";

export type EnsureCustomerOrgResult =
  | { status: "created"; organizationId: string }
  | { status: "existing"; organizationId: string | null }
  | { status: "skipped"; reason: "staff" | "blocked" | "managed" | "invited" }
  | { status: "unavailable"; reason: "not_configured" | "unknown_user" | "error" };

export type EnsureCustomerOrgInput = {
  source: CustomerOrgSource;
  email?: string | null;
  fullName?: string | null;
  company?: string | null;
  marketingOptIn?: boolean;
};

type ServiceClient = NonNullable<ReturnType<typeof createServiceRoleClient>>;

type ResolvedIdentity = {
  email: string;
  fullName: string | null;
  company: string | null;
  marketingOptIn: boolean;
};

const MAX_NAME_LENGTH = 200;

function trimmed(value: string | null | undefined): string | null {
  const next = typeof value === "string" ? value.trim() : "";
  return next.length > 0 ? next : null;
}

/** Een opgegeven bedrijfsnaam maakt de organisatie zakelijk, anders consument. */
export function resolveOrganizationType(
  company: string | null | undefined,
): "BUSINESS" | "CONSUMER" {
  return trimmed(company) ? "BUSINESS" : "CONSUMER";
}

export function resolveOrganizationName(input: {
  company?: string | null;
  fullName?: string | null;
  email?: string | null;
}): string {
  const candidate =
    trimmed(input.company) ?? trimmed(input.fullName) ?? trimmed(input.email);
  return (candidate ?? "Nieuwe klant").slice(0, MAX_NAME_LENGTH);
}

/**
 * Deterministisch klantnummer per gebruiker. De UNIQUE-constraint op
 * `organizations.customer_number` is hiermee de idempotentiesleutel wanneer
 * twee callbacks tegelijk binnenkomen.
 */
export function selfServiceCustomerNumber(userId: string): string {
  return `Z-${userId.replace(/-/g, "").slice(0, 12).toUpperCase()}`;
}

/**
 * Provisioning mag alleen voor gebruikers die nog nooit een lidmaatschap
 * hebben gehad. Een INVITED of REMOVED rij betekent dat staff de toegang
 * beheert; dan nooit stilzwijgend een nieuwe organisatie maken.
 */
export function classifyMembershipRows(
  rows: Array<{ organization_id: string | null; status: string | null }>,
):
  | { decision: "provision" }
  | { decision: "active"; organizationId: string | null }
  | { decision: "managed" } {
  if (rows.length === 0) return { decision: "provision" };
  const active = rows.find((row) => (row.status ?? "").toUpperCase() === "ACTIVE");
  if (active) {
    return { decision: "active", organizationId: active.organization_id ?? null };
  }
  return { decision: "managed" };
}

function readMetadataString(
  metadata: Record<string, unknown> | null | undefined,
  key: string,
): string | null {
  const value = metadata?.[key];
  return typeof value === "string" ? trimmed(value) : null;
}

async function resolveIdentity(
  supabase: ServiceClient,
  userId: string,
  input: EnsureCustomerOrgInput,
): Promise<ResolvedIdentity | null> {
  const email = trimmed(input.email)?.toLowerCase() ?? null;
  if (email) {
    return {
      email,
      fullName: trimmed(input.fullName),
      company: trimmed(input.company),
      marketingOptIn: input.marketingOptIn === true,
    };
  }

  const { data, error } = await supabase.auth.admin.getUserById(userId);
  const authUser = data?.user;
  if (error || !authUser?.email) return null;

  const metadata = (authUser.user_metadata ?? {}) as Record<string, unknown>;
  return {
    email: authUser.email.toLowerCase(),
    fullName:
      trimmed(input.fullName) ??
      readMetadataString(metadata, "full_name") ??
      readMetadataString(metadata, "name"),
    company: trimmed(input.company) ?? readMetadataString(metadata, "company"),
    marketingOptIn:
      input.marketingOptIn === true || metadata.marketing_opt_in === true,
  };
}

export async function ensureCustomerOrg(
  userId: string,
  input: EnsureCustomerOrgInput,
): Promise<EnsureCustomerOrgResult> {
  const supabase = createServiceRoleClient();
  if (!supabase) return { status: "unavailable", reason: "not_configured" };

  // admin_roles wordt hier uitsluitend gelezen. Staff krijgt nooit een
  // zelfbedieningsorganisatie en zelfregistratie schrijft nooit een rol.
  const { data: staffRow, error: staffError } = await supabase
    .from("admin_roles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (staffError) return { status: "unavailable", reason: "error" };
  if (staffRow) return { status: "skipped", reason: "staff" };

  const { data: membershipRows, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id, status")
    .eq("user_id", userId);

  if (membershipError) return { status: "unavailable", reason: "error" };

  const membership = classifyMembershipRows(
    (membershipRows ?? []) as Array<{
      organization_id: string | null;
      status: string | null;
    }>,
  );
  if (membership.decision === "active") {
    return { status: "existing", organizationId: membership.organizationId };
  }
  if (membership.decision === "managed") {
    return { status: "skipped", reason: "managed" };
  }

  const identity = await resolveIdentity(supabase, userId, input);
  if (!identity) return { status: "unavailable", reason: "unknown_user" };

  // Een openstaande uitnodiging wint: die bepaalt de organisatie en rol.
  const { data: pendingInvite } = await supabase
    .from("organization_invitations")
    .select("id")
    .eq("email", identity.email)
    .in("status", ["PENDING", "SENT"])
    .limit(1)
    .maybeSingle();

  if (pendingInvite) return { status: "skipped", reason: "invited" };

  const { data: existingProfile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, is_active")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) return { status: "unavailable", reason: "error" };

  // Een gedeactiveerd account wordt hier nooit heropend.
  if (existingProfile?.is_active === false) {
    return { status: "skipped", reason: "blocked" };
  }

  if (!existingProfile) {
    const { error: insertProfileError } = await supabase.from("profiles").insert({
      id: userId,
      email: identity.email,
      full_name: identity.fullName,
      is_active: true,
    });
    if (insertProfileError && insertProfileError.code !== "23505") {
      return { status: "unavailable", reason: "error" };
    }
  } else if (!existingProfile.full_name && identity.fullName) {
    await supabase
      .from("profiles")
      .update({ full_name: identity.fullName })
      .eq("id", userId);
  }

  const customerNumber = selfServiceCustomerNumber(userId);
  const { data: createdOrg, error: orgError } = await supabase
    .from("organizations")
    .insert({
      legal_name: resolveOrganizationName(identity),
      trade_name: identity.company,
      type: resolveOrganizationType(identity.company),
      contact_email: identity.email,
      customer_number: customerNumber,
      status: "ACTIVE",
    })
    .select("id")
    .single();

  let organizationId = createdOrg?.id as string | undefined;
  let reused = false;

  if (orgError || !organizationId) {
    const { data: existingOrg } = await supabase
      .from("organizations")
      .select("id")
      .eq("customer_number", customerNumber)
      .maybeSingle();

    if (!existingOrg?.id) return { status: "unavailable", reason: "error" };
    organizationId = existingOrg.id as string;
    reused = true;
  }

  const { error: memberError } = await supabase.from("organization_members").upsert(
    {
      organization_id: organizationId,
      user_id: userId,
      customer_role: "PRIMARY",
      is_primary_contact: true,
      status: "ACTIVE",
      joined_at: new Date().toISOString(),
    },
    { onConflict: "organization_id,user_id" },
  );

  if (memberError) return { status: "unavailable", reason: "error" };

  // Nieuwsbrieftoestemming landt pas na een bevestigd e-mailadres en is
  // altijd een expliciete opt-in — nooit afgeleid uit het aanmaken van een account.
  if (identity.marketingOptIn) {
    await recordMarketingConsent({
      email: identity.email,
      granted: true,
      source: "self_registration",
      userId,
      organizationId,
      evidence: { flow: input.source },
    });
  }

  await writeAuditLog({
    userId,
    action: "auth.customer_org_provisioned",
    resourceType: "organizations",
    resourceId: organizationId,
    metadata: {
      source: input.source,
      reusedOrganization: reused,
      customerRole: "PRIMARY",
      grantedStaffRole: false,
    },
  });

  return { status: "created", organizationId };
}
