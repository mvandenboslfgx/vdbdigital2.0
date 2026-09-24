import "server-only";
import { createServiceRoleClient } from "@/lib/database/server";
import { hasCustomerPermission } from "@/lib/auth/customer-permissions";
import { requireCustomer } from "@/server/auth/require-customer";
import { getMarketingPreference } from "@/server/services/marketing-preferences";

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
  invoice_type?: string;
  title?: string | null;
  status: string;
  total_cents: number;
  amount_due_cents?: number;
  amount_paid_cents?: number;
  currency: string;
  due_date: string | null;
  issue_date: string | null;
  paid_at?: string | null;
  project_id?: string | null;
  quote_id?: string | null;
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

export type PortalOrderRow = {
  id: string;
  order_number: string;
  status: string;
  total_cents: number;
  created_at: string;
  subscription_status: string | null;
  billing_interval: string | null;
};

export type PortalSubscriptionRow = {
  id: string;
  order_id: string;
  product_name: string;
  status: string;
  interval: string;
  amount_cents: number;
  currency: string;
  starts_on: string | null;
  last_payment_at: string | null;
};

export type PortalConversationRow = {
  id: string;
  subject: string;
  status: string;
  last_message_at: string | null;
};

export type PortalMessageRow = {
  id: string;
  body: string;
  created_at: string;
  author_user_id: string;
  author_name: string;
  mine: boolean;
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
  if (
    !hasCustomerPermission(ctx.customerRole, "portal.invoices.view") &&
    !hasCustomerPermission(ctx.customerRole, "portal.billing.view")
  ) {
    return { ctx, invoices: [] as PortalInvoiceRow[], denied: true as const };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return { ctx, invoices: [] as PortalInvoiceRow[] };

  const { data } = await supabase
    .from("portal_invoices")
    .select(
      "id, invoice_number, invoice_type, title, status, total_cents, amount_due_cents, amount_paid_cents, currency, due_date, issue_date, paid_at, project_id, quote_id",
    )
    .eq("organization_id", ctx.organization.id)
    .eq("customer_visible", true)
    .in("status", [
      "ISSUED",
      "OPEN",
      "PARTIALLY_PAID",
      "PAID",
      "OVERDUE",
      "CANCELED",
      "CREDITED",
    ])
    .order("issue_date", { ascending: false });

  return { ctx, invoices: (data ?? []) as PortalInvoiceRow[] };
}

export async function getPortalInvoice(id: string) {
  const ctx = await requireCustomer();
  if (
    !hasCustomerPermission(ctx.customerRole, "portal.invoices.view") &&
    !hasCustomerPermission(ctx.customerRole, "portal.billing.view")
  ) {
    return { ctx, invoice: null, items: [], creditNotes: [], denied: true as const };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { ctx, invoice: null, items: [], creditNotes: [] };
  }

  const { data: invoice } = await supabase
    .from("portal_invoices")
    .select(
      "id, invoice_number, invoice_type, title, description, status, total_cents, subtotal_cents, vat_cents, discount_cents, amount_due_cents, amount_paid_cents, currency, due_date, issue_date, paid_at, payment_instruction, project_id, quote_id, document_id",
    )
    .eq("id", id)
    .eq("organization_id", ctx.organization.id)
    .eq("customer_visible", true)
    .in("status", [
      "ISSUED",
      "OPEN",
      "PARTIALLY_PAID",
      "PAID",
      "OVERDUE",
      "CANCELED",
      "CREDITED",
    ])
    .maybeSingle();

  if (!invoice) {
    return { ctx, invoice: null, items: [], creditNotes: [] };
  }

  const [{ data: items }, { data: creditNotes }] = await Promise.all([
    supabase
      .from("portal_invoice_items")
      .select(
        "id, title, description, quantity, unit_label, unit_price_cents, tax_cents, total_cents, sort_order",
      )
      .eq("invoice_id", id)
      .order("sort_order"),
    supabase
      .from("portal_invoices")
      .select("id, invoice_number, status, total_cents, currency")
      .eq("credits_invoice_id", id)
      .eq("customer_visible", true)
      .in("status", [
        "ISSUED",
        "OPEN",
        "PARTIALLY_PAID",
        "PAID",
        "OVERDUE",
        "CANCELED",
        "CREDITED",
      ]),
  ]);

  return {
    ctx,
    invoice,
    items: items ?? [],
    creditNotes: creditNotes ?? [],
  };
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


export async function listPortalOrders() {
  const ctx = await requireCustomer();
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return {
      ctx,
      orders: [] as PortalOrderRow[],
      subscriptions: [] as PortalSubscriptionRow[],
    };
  }

  const email = ctx.user.email.trim().toLowerCase();

  const [{ data: orders }, { data: subscriptions }] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id, order_number, status, total_cents, created_at, subscription_status, billing_interval",
      )
      .ilike("customer_email", email)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("billing_subscriptions")
      .select(
        "id, order_id, product_name, status, interval, amount_cents, currency, starts_on, last_payment_at",
      )
      .ilike("customer_email", email)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return {
    ctx,
    orders: (orders ?? []) as PortalOrderRow[],
    subscriptions: (subscriptions ?? []) as PortalSubscriptionRow[],
  };
}

export async function getPortalOrder(id: string) {
  const ctx = await requireCustomer();
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { ctx, order: null, items: [], payments: [], subscription: null };
  }

  const email = ctx.user.email.trim().toLowerCase();
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .ilike("customer_email", email)
    .maybeSingle();

  if (!order) {
    return { ctx, order: null, items: [], payments: [], subscription: null };
  }

  const [{ data: items }, { data: payments }, { data: subscription }] =
    await Promise.all([
      supabase
        .from("order_items")
        .select(
          "id, product_name, product_slug, quantity, unit_price_cents, total_cents, billing_type",
        )
        .eq("order_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("payments")
        .select("id, status, amount_cents, provider_status, created_at, updated_at")
        .eq("order_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("billing_subscriptions")
        .select(
          "id, product_name, status, interval, amount_cents, currency, starts_on, last_payment_at",
        )
        .eq("order_id", id)
        .ilike("customer_email", email)
        .maybeSingle(),
    ]);

  return {
    ctx,
    order,
    items: items ?? [],
    payments: payments ?? [],
    subscription,
  };
}

export async function listPortalConversations() {
  const ctx = await requireCustomer();
  if (!hasCustomerPermission(ctx.customerRole, "portal.messages.view")) {
    return { ctx, conversations: [] as PortalConversationRow[], denied: true as const };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return { ctx, conversations: [] as PortalConversationRow[] };

  const { data } = await supabase
    .from("portal_conversations")
    .select("id, subject, status, last_message_at")
    .eq("organization_id", ctx.organization.id)
    .neq("conversation_type", "INTERNAL")
    .is("deleted_at", null)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  return { ctx, conversations: (data ?? []) as PortalConversationRow[] };
}

export async function getPortalConversation(id: string) {
  const ctx = await requireCustomer();
  if (!hasCustomerPermission(ctx.customerRole, "portal.messages.view")) {
    return { ctx, conversation: null, messages: [] as PortalMessageRow[], denied: true as const };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { ctx, conversation: null, messages: [] as PortalMessageRow[] };
  }

  const { data: conversation } = await supabase
    .from("portal_conversations")
    .select("id, subject, status, last_message_at, created_at, conversation_type")
    .eq("id", id)
    .eq("organization_id", ctx.organization.id)
    .neq("conversation_type", "INTERNAL")
    .is("deleted_at", null)
    .maybeSingle();

  if (!conversation) {
    return { ctx, conversation: null, messages: [] as PortalMessageRow[] };
  }

  const { data: messageRows } = await supabase
    .from("portal_messages")
    .select("id, body, created_at, author_user_id")
    .eq("conversation_id", id)
    .eq("is_internal", false)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  const authorIds = Array.from(
    new Set((messageRows ?? []).map((row) => row.author_user_id).filter(Boolean)),
  );
  const names = new Map<string, string>();

  if (authorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", authorIds);
    for (const profile of profiles ?? []) {
      names.set(
        profile.id,
        profile.full_name?.trim() || profile.email || "VDB Digital",
      );
    }
  }

  await supabase
    .from("portal_conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", id)
    .eq("user_id", ctx.user.id)
    .is("removed_at", null);

  const messages: PortalMessageRow[] = (messageRows ?? []).map((row) => ({
    ...row,
    author_name: names.get(row.author_user_id) ?? "VDB Digital",
    mine: row.author_user_id === ctx.user.id,
  }));

  return { ctx, conversation, messages };
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

  const [{ data: organization }, marketingOptIn] = await Promise.all([
    supabase
      .from("organizations")
      .select(
        "id, legal_name, trade_name, contact_email, contact_phone, vat_number, kvk_number, invoice_address, type",
      )
      .eq("id", ctx.organization.id)
      .maybeSingle(),
    getMarketingPreference({
      email: data?.email ?? ctx.user.email,
      userId: ctx.user.id,
    }),
  ]);

  return { ctx, profile: data, organization, marketingOptIn };
}
