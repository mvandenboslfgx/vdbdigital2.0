import "server-only";
import { createServiceRoleClient } from "@/lib/database/server";
import { requireAdmin } from "@/server/auth/require-admin";
import { requirePermission } from "@/server/auth/require-permission";
import {
  customerFacingInvoiceStatus,
  isInvoiceOperationallyOverdue,
} from "@/lib/commerce/invoice-status";
import {
  buildAssignedRecordOrFilter,
  listManagedProjectIds,
  resolveQuoteInvoiceScopeMode,
} from "@/server/auth/admin-resource-scope";

async function assertCanAccessAssignedInvoice(
  userId: string,
  invoice: { created_by?: string | null; project_id?: string | null },
  managedProjectIds: string[],
): Promise<boolean> {
  if (invoice.created_by === userId) return true;
  if (invoice.project_id && managedProjectIds.includes(invoice.project_id)) {
    return true;
  }
  return false;
}

export async function listAdminInvoices(filters: {
  q?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const ctx = await requireAdmin();
  const mode = resolveQuoteInvoiceScopeMode(ctx.role, "invoices");
  if (mode === "deny") {
    await requirePermission(ctx, "invoices.view_assigned");
  }

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { invoices: [], total: 0, page, pageSize };
  }

  let query = supabase
    .from("portal_invoices")
    .select(
      "id, invoice_number, invoice_type, title, status, total_cents, amount_paid_cents, amount_due_cents, currency, issue_date, due_date, paid_at, updated_at, created_by, project_id, organization:organizations(id, legal_name, trade_name), project:portal_projects(id, name), quote:portal_quotes(id, quote_number)",
      { count: "exact" },
    )
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (mode === "assigned") {
    const managedProjectIds = await listManagedProjectIds(supabase, ctx.user.id);
    query = query.or(
      buildAssignedRecordOrFilter(ctx.user.id, managedProjectIds),
    );
  }

  if (filters.status && filters.status !== "ALL") {
    query = query.eq("status", filters.status);
  }
  if (filters.q?.trim()) {
    const q = filters.q.trim().replace(/[%_,]/g, "");
    query = query.or(`title.ilike.%${q}%,invoice_number.ilike.%${q}%`);
  }

  const { data, count, error } = await query;
  if (error) {
    return { invoices: [], total: 0, page, pageSize, error: error.message };
  }

  const invoices = (data ?? []).map((row) => {
    const org = (row as { organization?: unknown }).organization;
    const project = (row as { project?: unknown }).project;
    const quote = (row as { quote?: unknown }).quote;
    const amountDue = Number(
      (row as { amount_due_cents?: number }).amount_due_cents ?? 0,
    );
    const status = customerFacingInvoiceStatus({
      status: row.status,
      dueDate: (row as { due_date?: string | null }).due_date,
      amountDueCents: amountDue,
    });
    return {
      ...row,
      status,
      organization: Array.isArray(org) ? org[0] : org,
      project: Array.isArray(project) ? project[0] : project,
      quote: Array.isArray(quote) ? quote[0] : quote,
      operationally_overdue: isInvoiceOperationallyOverdue({
        status: row.status,
        dueDate: (row as { due_date?: string | null }).due_date,
        amountDueCents: amountDue,
      }),
    };
  });

  return { invoices, total: count ?? 0, page, pageSize };
}

export async function getAdminInvoice(id: string) {
  const ctx = await requireAdmin();
  const mode = resolveQuoteInvoiceScopeMode(ctx.role, "invoices");
  if (mode === "deny") {
    await requirePermission(ctx, "invoices.view_assigned");
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return null;

  const { data: invoice } = await supabase
    .from("portal_invoices")
    .select(
      "*, organization:organizations(id, legal_name, trade_name), project:portal_projects(id, name), quote:portal_quotes(id, quote_number, status)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!invoice) return null;

  if (mode === "assigned") {
    const managedProjectIds = await listManagedProjectIds(supabase, ctx.user.id);
    const allowed = await assertCanAccessAssignedInvoice(
      ctx.user.id,
      invoice as { created_by?: string | null; project_id?: string | null },
      managedProjectIds,
    );
    if (!allowed) return null;
  }

  const [{ data: items }, { data: versions }, { data: payments }, { data: credits }] =
    await Promise.all([
      supabase
        .from("portal_invoice_items")
        .select("*")
        .eq("invoice_id", id)
        .order("sort_order"),
      supabase
        .from("portal_invoice_versions")
        .select("id, version_number, status, snapshot_checksum, created_at, document_id")
        .eq("invoice_id", id)
        .order("version_number", { ascending: false }),
      supabase
        .from("portal_invoice_payment_records")
        .select(
          "id, amount_cents, currency, payment_date, payment_method, external_reference, internal_note, created_at, reversed_at, reversal_reason",
        )
        .eq("invoice_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("portal_invoices")
        .select("id, invoice_number, status, total_cents, currency")
        .eq("credits_invoice_id", id)
        .order("created_at", { ascending: false }),
    ]);

  const org = (invoice as { organization?: unknown }).organization;
  const project = (invoice as { project?: unknown }).project;
  const quote = (invoice as { quote?: unknown }).quote;

  return {
    invoice: {
      ...invoice,
      organization: Array.isArray(org) ? org[0] : org,
      project: Array.isArray(project) ? project[0] : project,
      quote: Array.isArray(quote) ? quote[0] : quote,
    },
    items: items ?? [],
    versions: versions ?? [],
    payments: payments ?? [],
    creditNotes: credits ?? [],
  };
}

export async function listOrganizationsForInvoiceForm() {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("organizations")
    .select("id, legal_name, trade_name, status")
    .neq("status", "ARCHIVED")
    .order("legal_name");
  return (data ?? []).map((o) => ({
    id: o.id as string,
    label: String(o.trade_name || o.legal_name || o.id),
  }));
}

export async function listAcceptedQuotesForOrg(organizationId: string) {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("portal_quotes")
    .select("id, quote_number, title, total_cents, currency, accepted_version_number, project_id")
    .eq("organization_id", organizationId)
    .eq("status", "ACCEPTED")
    .order("accepted_at", { ascending: false })
    .limit(50);
  return data ?? [];
}
