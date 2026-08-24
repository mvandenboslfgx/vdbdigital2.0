import "server-only";
import { createServiceRoleClient } from "@/lib/database/server";
import { requireAdmin } from "@/server/auth/require-admin";
import { requirePermission } from "@/server/auth/require-permission";
import { writeAuditLog } from "@/lib/security/audit-log";
import {
  createInviteToken,
  hashInviteToken,
} from "@/lib/auth/invite-token";
import { resolveAppUrl } from "@/lib/url/app-url";
import { sendInvitationEmail } from "@/lib/email/resend";
import { resolveInvitationRecipient } from "@/lib/email/invitation-recipient";

export type AdminOrganizationRow = {
  id: string;
  legal_name: string;
  trade_name: string | null;
  customer_number: string | null;
  type: string;
  status: string;
  contact_email: string | null;
  updated_at: string;
  project_count?: number;
};

export async function listAdminOrganizations(filters: {
  q?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const ctx = await requireAdmin();
  await requirePermission(ctx, "customers.view");

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { organizations: [] as AdminOrganizationRow[], total: 0, page, pageSize };
  }

  let query = supabase
    .from("organizations")
    .select(
      "id, legal_name, trade_name, customer_number, type, status, contact_email, updated_at",
      { count: "exact" },
    )
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (filters.status && filters.status !== "ALL") {
    query = query.eq("status", filters.status);
  }
  if (filters.q?.trim()) {
    const q = filters.q.trim().replace(/[%_,]/g, "");
    query = query.or(
      `legal_name.ilike.%${q}%,trade_name.ilike.%${q}%,customer_number.ilike.%${q}%,contact_email.ilike.%${q}%`,
    );
  }

  const { data, count, error } = await query;
  if (error) {
    return { organizations: [], total: 0, page, pageSize, error: error.message };
  }

  return {
    organizations: (data ?? []) as AdminOrganizationRow[],
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function getAdminOrganization(id: string) {
  const ctx = await requireAdmin();
  await requirePermission(ctx, "customers.view");

  const supabase = createServiceRoleClient();
  if (!supabase) return null;

  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!org) return null;

  const [members, projects, quotes, invoices, tickets, notes, invites] =
    await Promise.all([
      supabase
        .from("organization_members")
        .select(
          "id, customer_role, is_primary_contact, status, joined_at, user:profiles(id, email, full_name)",
        )
        .eq("organization_id", id),
      supabase
        .from("portal_projects")
        .select("id, name, status, progress_percent, updated_at")
        .eq("organization_id", id)
        .order("updated_at", { ascending: false }),
      supabase
        .from("portal_quotes")
        .select("id, quote_number, title, status, total_cents, updated_at")
        .eq("organization_id", id)
        .order("updated_at", { ascending: false }),
      supabase
        .from("portal_invoices")
        .select("id, invoice_number, status, total_cents, issue_date")
        .eq("organization_id", id)
        .order("issue_date", { ascending: false }),
      supabase
        .from("portal_support_tickets")
        .select("id, ticket_number, subject, status, updated_at")
        .eq("organization_id", id)
        .order("updated_at", { ascending: false }),
      supabase
        .from("organization_internal_notes")
        .select("id, body, created_at, author_id")
        .eq("organization_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("organization_invitations")
        .select(
          "id, email, status, expires_at, created_at, sent_at, last_error, retry_count, customer_role",
        )
        .eq("organization_id", id)
        .order("created_at", { ascending: false }),
    ]);

  return {
    organization: org,
    members: members.data ?? [],
    projects: projects.data ?? [],
    quotes: quotes.data ?? [],
    invoices: invoices.data ?? [],
    tickets: tickets.data ?? [],
    notes: notes.data ?? [],
    invites: invites.data ?? [],
  };
}

async function dispatchOrganizationInvitation(input: {
  supabase: NonNullable<ReturnType<typeof createServiceRoleClient>>;
  invitationId: string;
  organizationId: string;
  organizationName: string;
  recipient: string;
  token: string;
  actorUserId: string;
  retryCount?: number;
}) {
  const acceptUrl = `${resolveAppUrl()}/uitnodiging/accepteren?token=${input.token}`;
  const dispatch = await sendInvitationEmail({
    to: input.recipient,
    organizationName: input.organizationName,
    acceptUrl,
  });

  const nextStatus = dispatch.sent ? "SENT" : "FAILED";
  await input.supabase
    .from("organization_invitations")
    .update({
      status: nextStatus,
      sent_at: dispatch.sent ? new Date().toISOString() : null,
      provider_message_id: dispatch.providerMessageId ?? null,
      last_error: dispatch.sent ? null : (dispatch.reason ?? "send_failed"),
      retry_count: input.retryCount ?? 0,
    })
    .eq("id", input.invitationId);

  await writeAuditLog({
    userId: input.actorUserId,
    action: dispatch.sent
      ? "admin.invitation_dispatched"
      : "admin.invitation_dispatch_failed",
    metadata: {
      organizationId: input.organizationId,
      invitationId: input.invitationId,
      recipient: input.recipient,
      providerMessageId: dispatch.providerMessageId ?? null,
      reason: dispatch.sent ? null : (dispatch.reason ?? "send_failed"),
    },
  });

  return dispatch;
}

export async function createOrganizationWithInvite(input: {
  legalName: string;
  tradeName?: string;
  type: "BUSINESS" | "CONSUMER";
  contactEmail: string;
  inviteEmail?: string;
}) {
  const ctx = await requireAdmin();
  await requirePermission(ctx, "customers.create");
  await requirePermission(ctx, "customers.invite");

  const recipientResult = resolveInvitationRecipient({
    contactEmail: input.contactEmail,
    inviteEmail: input.inviteEmail,
  });
  if (!recipientResult.ok) {
    throw new Error(recipientResult.error);
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    throw new Error("Database niet beschikbaar");
  }

  const since = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { data: duplicate } = await supabase
    .from("organizations")
    .select("id")
    .eq("legal_name", input.legalName)
    .eq("contact_email", input.contactEmail)
    .eq("account_manager_id", ctx.user.id)
    .gte("created_at", since)
    .maybeSingle();

  if (duplicate?.id) {
    return {
      organizationId: duplicate.id,
      customerNumber: null as string | null,
      mailSent: false,
      duplicate: true,
    };
  }

  const customerNumber = `K-${Date.now().toString(36).toUpperCase()}`;
  const { data: org, error } = await supabase
    .from("organizations")
    .insert({
      legal_name: input.legalName,
      trade_name: input.tradeName ?? null,
      type: input.type,
      contact_email: input.contactEmail,
      customer_number: customerNumber,
      status: "INVITED",
      account_manager_id: ctx.user.id,
    })
    .select("id")
    .single();

  if (error || !org) {
    throw new Error(error?.message ?? "Organisatie aanmaken mislukt");
  }

  const token = createInviteToken();
  const tokenHash = hashInviteToken(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: invitation, error: inviteError } = await supabase
    .from("organization_invitations")
    .insert({
      organization_id: org.id,
      email: recipientResult.recipient,
      customer_role: "PRIMARY",
      token_hash: tokenHash,
      status: "PENDING",
      invited_by: ctx.user.id,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (inviteError || !invitation) {
    throw new Error(inviteError?.message ?? "Uitnodiging aanmaken mislukt");
  }

  await writeAuditLog({
    userId: ctx.user.id,
    action: "admin.customer_created",
    metadata: { organizationId: org.id, recipient: recipientResult.recipient },
  });

  const dispatch = await dispatchOrganizationInvitation({
    supabase,
    invitationId: invitation.id,
    organizationId: org.id,
    organizationName: input.tradeName || input.legalName,
    recipient: recipientResult.recipient,
    token,
    actorUserId: ctx.user.id,
  });

  return {
    organizationId: org.id,
    customerNumber,
    mailSent: dispatch.sent,
    mailError: dispatch.reason,
    duplicate: false,
  };
}

const RESENDABLE = new Set(["PENDING", "SENT", "FAILED"]);

export async function resendOrganizationInvitation(invitationId: string) {
  const ctx = await requireAdmin();
  await requirePermission(ctx, "customers.invite");

  const supabase = createServiceRoleClient();
  if (!supabase) {
    throw new Error("Database niet beschikbaar");
  }

  const { data: invitation } = await supabase
    .from("organization_invitations")
    .select("id, organization_id, email, status, retry_count, expires_at")
    .eq("id", invitationId)
    .maybeSingle();

  if (!invitation) {
    throw new Error("Uitnodiging niet gevonden");
  }
  if (!RESENDABLE.has(invitation.status)) {
    throw new Error("Deze uitnodiging kan niet opnieuw worden verstuurd.");
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("id, legal_name, trade_name")
    .eq("id", invitation.organization_id)
    .maybeSingle();

  if (!org) {
    throw new Error("Organisatie niet gevonden");
  }

  const recipientResult = resolveInvitationRecipient({
    contactEmail: invitation.email,
    inviteEmail: invitation.email,
  });
  if (!recipientResult.ok) {
    throw new Error(recipientResult.error);
  }

  const token = createInviteToken();
  const tokenHash = hashInviteToken(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const retryCount = (invitation.retry_count ?? 0) + 1;

  await supabase
    .from("organization_invitations")
    .update({
      token_hash: tokenHash,
      expires_at: expiresAt,
      status: "PENDING",
      last_error: null,
      retry_count: retryCount,
    })
    .eq("id", invitation.id);

  return dispatchOrganizationInvitation({
    supabase,
    invitationId: invitation.id,
    organizationId: org.id,
    organizationName: org.trade_name || org.legal_name,
    recipient: recipientResult.recipient,
    token,
    actorUserId: ctx.user.id,
    retryCount,
  });
}

export async function revokeOrganizationInvitation(invitationId: string) {
  const ctx = await requireAdmin();
  await requirePermission(ctx, "customers.invite");

  const supabase = createServiceRoleClient();
  if (!supabase) {
    throw new Error("Database niet beschikbaar");
  }

  const { data: invitation } = await supabase
    .from("organization_invitations")
    .select("id, organization_id, status")
    .eq("id", invitationId)
    .maybeSingle();

  if (!invitation) {
    throw new Error("Uitnodiging niet gevonden");
  }
  if (invitation.status === "ACCEPTED") {
    throw new Error("Een geaccepteerde uitnodiging kan niet worden ingetrokken.");
  }

  const { error } = await supabase
    .from("organization_invitations")
    .update({
      status: "REVOKED",
      revoked_at: new Date().toISOString(),
    })
    .eq("id", invitationId);

  if (error) {
    throw new Error(error.message);
  }

  await writeAuditLog({
    userId: ctx.user.id,
    action: "admin.invitation_revoked",
    metadata: {
      organizationId: invitation.organization_id,
      invitationId,
    },
  });
}

export async function getAdminPortalDashboardCounts() {
  const ctx = await requireAdmin();
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return {
      customers: 0,
      projects: 0,
      openQuotes: 0,
      openTickets: 0,
      openLeads: 0,
    };
  }

  const [customers, projects, openQuotes, openTickets, openLeads] =
    await Promise.all([
      supabase
        .from("organizations")
        .select("id", { count: "exact", head: true })
        .neq("status", "ARCHIVED"),
      supabase
        .from("portal_projects")
        .select("id", { count: "exact", head: true })
        .in("status", ["PLANNED", "IN_PROGRESS", "WAITING_FOR_CUSTOMER", "REVIEW"]),
      supabase
        .from("portal_quotes")
        .select("id", { count: "exact", head: true })
        .in("status", ["SENT", "VIEWED"]),
      supabase
        .from("portal_support_tickets")
        .select("id", { count: "exact", head: true })
        .in("status", ["OPEN", "IN_PROGRESS", "WAITING_FOR_VDB"]),
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("status", "NEW"),
    ]);

  void ctx;
  return {
    customers: customers.count ?? 0,
    projects: projects.count ?? 0,
    openQuotes: openQuotes.count ?? 0,
    openTickets: openTickets.count ?? 0,
    openLeads: openLeads.count ?? 0,
  };
}

export async function listAdminProjects() {
  const ctx = await requireAdmin();
  await requirePermission(ctx, "projects.view_all");

  const supabase = createServiceRoleClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("portal_projects")
    .select(
      "id, name, status, progress_percent, project_type, updated_at, organization:organizations(id, legal_name)",
    )
    .order("updated_at", { ascending: false })
    .limit(100);

  return data ?? [];
}
