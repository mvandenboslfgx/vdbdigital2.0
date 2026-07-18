import "server-only";
import { createServiceRoleClient } from "@/lib/database/server";
import { hasCustomerPermission } from "@/lib/auth/customer-permissions";
import { requireCustomer } from "@/server/auth/require-customer";

export type PortalProjectRow = {
  id: string;
  name: string;
  description: string | null;
  project_type: string;
  status: string;
  progress_percent: number;
  planned_delivery_date: string | null;
  updated_at: string;
  project_number?: string;
  open_customer_actions?: number;
  next_milestone_title?: string | null;
};

export type PortalQuoteRow = {
  id: string;
  quote_number: string;
  title: string;
  status: string;
  total_cents: number;
  currency: string;
  valid_until: string | null;
  updated_at: string;
};

export type PortalInvoiceRow = {
  id: string;
  invoice_number: string;
  status: string;
  total_cents: number;
  currency: string;
  due_date: string | null;
  issue_date: string | null;
};

export type PortalTicketRow = {
  id: string;
  ticket_number: string;
  subject: string;
  status: string;
  priority: string;
  updated_at: string;
};

export type PortalFileRow = {
  id: string;
  file_name: string;
  mime_type: string;
  created_at: string;
  project_id: string | null;
  title?: string;
  category?: string;
  visibility?: string;
  version_number?: number;
  size_bytes?: number;
  document_number?: string;
};

export type PortalNotificationRow = {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

export type PortalConversationRow = {
  id: string;
  subject: string;
  status: string;
  last_message_at: string | null;
};

function formatEuro(cents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export { formatEuro };

export async function getPortalDashboard() {
  const ctx = await requireCustomer();
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { ctx, projects: [], quotes: [], invoices: [], tickets: [], files: [], notifications: [], conversations: [] };
  }

  const orgId = ctx.organization.id;

  const [
    projects,
    quotes,
    invoices,
    tickets,
    files,
    notifications,
    conversations,
  ] = await Promise.all([
    supabase
      .from("portal_projects")
      .select(
        "id, name, description, project_type, status, progress_percent, planned_delivery_date, updated_at",
      )
      .eq("organization_id", orgId)
      .eq("customer_visible", true)
      .not("status", "in", '("DRAFT","ARCHIVED")')
      .order("updated_at", { ascending: false })
      .limit(8),
    supabase
      .from("portal_quotes")
      .select(
        "id, quote_number, title, status, total_cents, currency, valid_until, updated_at",
      )
      .eq("organization_id", orgId)
      .neq("status", "DRAFT")
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("portal_invoices")
      .select(
        "id, invoice_number, status, total_cents, currency, due_date, issue_date",
      )
      .eq("organization_id", orgId)
      .eq("customer_visible", true)
      .neq("status", "DRAFT")
      .order("issue_date", { ascending: false })
      .limit(5),
    supabase
      .from("portal_support_tickets")
      .select("id, ticket_number, subject, status, priority, updated_at")
      .eq("organization_id", orgId)
      .not("status", "in", '("CLOSED","RESOLVED")')
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("portal_files")
      .select("id, file_name, mime_type, created_at, project_id")
      .eq("organization_id", orgId)
      .eq("customer_visible", true)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("portal_notifications")
      .select("id, title, body, href, read_at, created_at")
      .eq("user_id", ctx.user.id)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("portal_conversations")
      .select("id, subject, status, last_message_at")
      .eq("organization_id", orgId)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(5),
  ]);

  return {
    ctx,
    projects: (projects.data ?? []) as PortalProjectRow[],
    quotes: (quotes.data ?? []) as PortalQuoteRow[],
    invoices: (invoices.data ?? []) as PortalInvoiceRow[],
    tickets: (tickets.data ?? []) as PortalTicketRow[],
    files: (files.data ?? []) as PortalFileRow[],
    notifications: (notifications.data ?? []) as PortalNotificationRow[],
    conversations: (conversations.data ?? []) as PortalConversationRow[],
  };
}

export async function listPortalProjects() {
  const ctx = await requireCustomer();
  if (!hasCustomerPermission(ctx.customerRole, "portal.projects.view")) {
    return { ctx, projects: [] as PortalProjectRow[], denied: true as const };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return { ctx, projects: [] as PortalProjectRow[] };

  const { data } = await supabase
    .from("portal_projects")
    .select(
      "id, project_number, name, description, project_type, status, progress_percent, planned_delivery_date, updated_at",
    )
    .eq("organization_id", ctx.organization.id)
    .eq("customer_visible", true)
    .is("archived_at", null)
    .order("updated_at", { ascending: false });

  const projects = (data ?? []) as PortalProjectRow[];
  if (projects.length === 0) return { ctx, projects };

  const ids = projects.map((p) => p.id);
  const [{ data: actions }, { data: milestones }] = await Promise.all([
    supabase
      .from("portal_project_actions")
      .select("id, project_id, status")
      .in("project_id", ids)
      .eq("customer_visible", true)
      .eq("assigned_to_type", "CUSTOMER")
      .neq("status", "COMPLETED")
      .neq("status", "CANCELED"),
    supabase
      .from("portal_project_milestones")
      .select("project_id, title, status, sort_order, completed_at")
      .in("project_id", ids)
      .eq("customer_visible", true)
      .order("sort_order"),
  ]);

  const openByProject = new Map<string, number>();
  for (const a of actions ?? []) {
    openByProject.set(a.project_id, (openByProject.get(a.project_id) ?? 0) + 1);
  }
  const nextMilestone = new Map<string, string>();
  for (const m of milestones ?? []) {
    if (nextMilestone.has(m.project_id)) continue;
    if (m.status === "COMPLETED" || m.completed_at) continue;
    nextMilestone.set(m.project_id, m.title);
  }

  return {
    ctx,
    projects: projects.map((p) => ({
      ...p,
      open_customer_actions: openByProject.get(p.id) ?? 0,
      next_milestone_title: nextMilestone.get(p.id) ?? null,
    })),
  };
}

export async function getPortalProject(id: string) {
  const ctx = await requireCustomer();
  if (!hasCustomerPermission(ctx.customerRole, "portal.projects.view")) {
    return {
      ctx,
      project: null,
      milestones: [],
      feedback: [],
      actions: [],
      deliverables: [],
      activity: [],
      denied: true as const,
    };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return {
      ctx,
      project: null,
      milestones: [],
      feedback: [],
      actions: [],
      deliverables: [],
      activity: [],
    };
  }

  const { data: project } = await supabase
    .from("portal_projects")
    .select("*")
    .eq("id", id)
    .eq("organization_id", ctx.organization.id)
    .eq("customer_visible", true)
    .is("archived_at", null)
    .maybeSingle();

  if (!project) {
    return {
      ctx,
      project: null,
      milestones: [],
      feedback: [],
      actions: [],
      deliverables: [],
      activity: [],
    };
  }

  const [
    { data: milestones },
    { data: feedback },
    { data: actions },
    { data: deliverables },
    { data: activity },
  ] = await Promise.all([
    supabase
      .from("portal_project_milestones")
      .select("*")
      .eq("project_id", id)
      .eq("customer_visible", true)
      .order("sort_order"),
    supabase
      .from("portal_project_feedback")
      .select("id, body, decision, created_at, visibility, status")
      .eq("project_id", id)
      .eq("visibility", "CUSTOMER_SHARED")
      .neq("status", "ARCHIVED")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("portal_project_actions")
      .select("*")
      .eq("project_id", id)
      .eq("customer_visible", true)
      .eq("assigned_to_type", "CUSTOMER")
      .eq("assigned_organization_id", ctx.organization.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("portal_project_deliverables")
      .select("*")
      .eq("project_id", id)
      .eq("customer_visible", true)
      .in("status", ["SHARED", "APPROVED", "REJECTED"])
      .order("updated_at", { ascending: false }),
    supabase
      .from("portal_project_activity")
      .select("id, activity_type, summary, created_at")
      .eq("project_id", id)
      .eq("visibility", "CUSTOMER_VISIBLE")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  return {
    ctx,
    project,
    milestones: milestones ?? [],
    feedback: feedback ?? [],
    actions: actions ?? [],
    deliverables: deliverables ?? [],
    activity: activity ?? [],
  };
}

export async function listPortalQuotes() {
  const ctx = await requireCustomer();
  if (!hasCustomerPermission(ctx.customerRole, "portal.quotes.view")) {
    return { ctx, quotes: [] as PortalQuoteRow[], denied: true as const };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return { ctx, quotes: [] as PortalQuoteRow[] };

  const { data } = await supabase
    .from("portal_quotes")
    .select(
      "id, quote_number, title, status, total_cents, currency, valid_until, updated_at, sent_at, project_id",
    )
    .eq("organization_id", ctx.organization.id)
    .in("status", [
      "SENT",
      "VIEWED",
      "ACCEPTED",
      "DECLINED",
      "EXPIRED",
      "WITHDRAWN",
      "SUPERSEDED",
    ])
    .is("archived_at", null)
    .order("updated_at", { ascending: false });

  return { ctx, quotes: (data ?? []) as PortalQuoteRow[] };
}

export async function getPortalQuote(id: string) {
  const ctx = await requireCustomer();
  if (!hasCustomerPermission(ctx.customerRole, "portal.quotes.view")) {
    return { ctx, quote: null, items: [], denied: true as const };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return { ctx, quote: null, items: [] };

  const { data: quote } = await supabase
    .from("portal_quotes")
    .select("*")
    .eq("id", id)
    .eq("organization_id", ctx.organization.id)
    .in("status", [
      "SENT",
      "VIEWED",
      "ACCEPTED",
      "DECLINED",
      "EXPIRED",
      "WITHDRAWN",
      "SUPERSEDED",
    ])
    .maybeSingle();

  if (!quote) return { ctx, quote: null, items: [] };

  // Atomically mark first view SENT → VIEWED
  if (quote.status === "SENT") {
    const now = new Date().toISOString();
    await supabase
      .from("portal_quotes")
      .update({
        status: "VIEWED",
        first_viewed_at: quote.first_viewed_at ?? now,
        version: (quote.version ?? 1) + 1,
        updated_at: now,
      })
      .eq("id", quote.id)
      .eq("status", "SENT")
      .eq("version", quote.version ?? 1);
    quote.status = "VIEWED";
    quote.first_viewed_at = quote.first_viewed_at ?? now;
  }

  const { data: items } = await supabase
    .from("portal_quote_items")
    .select("*")
    .eq("quote_id", id)
    .order("sort_order");

  return { ctx, quote, items: items ?? [] };
}

export async function listPortalInvoices() {
  const ctx = await requireCustomer();
  const supabase = createServiceRoleClient();
  if (!supabase) return { ctx, invoices: [] as PortalInvoiceRow[] };

  const { data } = await supabase
    .from("portal_invoices")
    .select(
      "id, invoice_number, status, total_cents, currency, due_date, issue_date",
    )
    .eq("organization_id", ctx.organization.id)
    .eq("customer_visible", true)
    .neq("status", "DRAFT")
    .order("issue_date", { ascending: false });

  return { ctx, invoices: (data ?? []) as PortalInvoiceRow[] };
}

export async function listPortalFiles(filters?: { projectId?: string }) {
  const ctx = await requireCustomer();
  if (!hasCustomerPermission(ctx.customerRole, "portal.documents.view")) {
    return { ctx, files: [] as PortalFileRow[], denied: true as const };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return { ctx, files: [] as PortalFileRow[] };

  let query = supabase
    .from("portal_files")
    .select(
      "id, document_number, title, file_name, mime_type, size_bytes, category, visibility, version_number, created_at, project_id, uploaded_by",
    )
    .eq("organization_id", ctx.organization.id)
    .eq("status", "AVAILABLE")
    .is("archived_at", null)
    .in("visibility", ["CUSTOMER_VISIBLE", "CUSTOMER_UPLOAD"])
    .in("scan_status", ["NOT_REQUIRED", "CLEAN"])
    .eq("is_current", true)
    .order("created_at", { ascending: false });

  if (filters?.projectId) {
    query = query.eq("project_id", filters.projectId);
  }

  // BILLING: restrict categories
  if (ctx.customerRole === "BILLING") {
    query = query.in("category", ["QUOTE", "INVOICE", "CONTRACT"]);
  }

  const { data } = await query;
  return { ctx, files: (data ?? []) as PortalFileRow[] };
}

export async function getPortalDocument(id: string) {
  const ctx = await requireCustomer();
  if (!hasCustomerPermission(ctx.customerRole, "portal.documents.view")) {
    return { ctx, document: null, versions: [], denied: true as const };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return { ctx, document: null, versions: [] };

  const { data: document } = await supabase
    .from("portal_files")
    .select("*")
    .eq("id", id)
    .eq("organization_id", ctx.organization.id)
    .eq("status", "AVAILABLE")
    .is("archived_at", null)
    .in("visibility", ["CUSTOMER_VISIBLE", "CUSTOMER_UPLOAD"])
    .in("scan_status", ["NOT_REQUIRED", "CLEAN"])
    .maybeSingle();

  if (!document) return { ctx, document: null, versions: [] };

  if (
    ctx.customerRole === "BILLING" &&
    document.category !== "QUOTE" &&
    document.category !== "INVOICE" &&
    document.category !== "CONTRACT"
  ) {
    return { ctx, document: null, versions: [] };
  }

  const rootId = document.parent_document_id ?? document.id;
  const { data: versions } = await supabase
    .from("portal_files")
    .select(
      "id, version_number, title, created_at, size_bytes, is_current, visibility, status",
    )
    .or(`id.eq.${rootId},parent_document_id.eq.${rootId}`)
    .eq("organization_id", ctx.organization.id)
    .eq("status", "AVAILABLE")
    .in("visibility", ["CUSTOMER_VISIBLE", "CUSTOMER_UPLOAD"])
    .order("version_number", { ascending: false });

  return { ctx, document, versions: versions ?? [] };
}

export async function listPortalConversations() {
  const ctx = await requireCustomer();
  const supabase = createServiceRoleClient();
  if (!supabase) return { ctx, conversations: [] as PortalConversationRow[] };

  const { data } = await supabase
    .from("portal_conversations")
    .select("id, subject, status, last_message_at")
    .eq("organization_id", ctx.organization.id)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  return { ctx, conversations: (data ?? []) as PortalConversationRow[] };
}

export async function listPortalTickets() {
  const ctx = await requireCustomer();
  const supabase = createServiceRoleClient();
  if (!supabase) return { ctx, tickets: [] as PortalTicketRow[] };

  const { data } = await supabase
    .from("portal_support_tickets")
    .select("id, ticket_number, subject, status, priority, updated_at")
    .eq("organization_id", ctx.organization.id)
    .order("updated_at", { ascending: false });

  return { ctx, tickets: (data ?? []) as PortalTicketRow[] };
}

export async function getPortalTicket(id: string) {
  const ctx = await requireCustomer();
  const supabase = createServiceRoleClient();
  if (!supabase) return { ctx, ticket: null, replies: [] };

  const { data: ticket } = await supabase
    .from("portal_support_tickets")
    .select("*")
    .eq("id", id)
    .eq("organization_id", ctx.organization.id)
    .maybeSingle();

  if (!ticket) return { ctx, ticket: null, replies: [] };

  const { data: replies } = await supabase
    .from("portal_support_replies")
    .select("id, body, created_at, author_user_id, is_internal")
    .eq("ticket_id", id)
    .eq("is_internal", false)
    .order("created_at");

  return { ctx, ticket, replies: replies ?? [] };
}

export async function listPortalNotifications() {
  const ctx = await requireCustomer();
  const supabase = createServiceRoleClient();
  if (!supabase) return { ctx, notifications: [] as PortalNotificationRow[] };

  const { data } = await supabase
    .from("portal_notifications")
    .select("id, title, body, href, read_at, created_at")
    .eq("user_id", ctx.user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return { ctx, notifications: (data ?? []) as PortalNotificationRow[] };
}

export async function getPortalProfile() {
  const ctx = await requireCustomer();
  const supabase = createServiceRoleClient();
  if (!supabase) return { ctx, profile: null };

  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, created_at")
    .eq("id", ctx.user.id)
    .maybeSingle();

  return { ctx, profile: data };
}
