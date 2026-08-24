import "server-only";
import { createServiceRoleClient } from "@/lib/database/server";
import { requireAdmin } from "@/server/auth/require-admin";
import { requirePermission } from "@/server/auth/require-permission";

export type AdminOrderRow = {
  id: string;
  order_number: string;
  status: string;
  customer_email: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_company: string | null;
  organization_id: string | null;
  total_cents: number;
  created_at: string;
};

export async function listAdminOrders(filters: {
  q?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const ctx = await requireAdmin();
  await requirePermission(ctx, "orders.read");

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { orders: [] as AdminOrderRow[], total: 0, page, pageSize };
  }

  let query = supabase
    .from("orders")
    .select(
      "id, order_number, status, customer_email, customer_first_name, customer_last_name, customer_company, organization_id, total_cents, created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.status && filters.status !== "ALL") {
    query = query.eq("status", filters.status);
  }
  if (filters.q?.trim()) {
    const q = filters.q.trim().replace(/[%_,]/g, "");
    query = query.or(
      `order_number.ilike.%${q}%,customer_email.ilike.%${q}%,customer_company.ilike.%${q}%`,
    );
  }

  const { data, count, error } = await query;
  if (error) {
    return { orders: [], total: 0, page, pageSize, error: error.message };
  }

  return {
    orders: (data ?? []) as AdminOrderRow[],
    total: count ?? 0,
    page,
    pageSize,
  };
}

export type AdminLeadRow = {
  id: string;
  type: string;
  name: string;
  email: string;
  subject: string | null;
  status: string;
  created_at: string;
};

export async function listAdminLeads(filters: {
  q?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const ctx = await requireAdmin();
  await requirePermission(ctx, "leads.read");

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { leads: [] as AdminLeadRow[], total: 0, page, pageSize };
  }

  let query = supabase
    .from("leads")
    .select("id, type, name, email, subject, status, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.status && filters.status !== "ALL") {
    query = query.eq("status", filters.status);
  }
  if (filters.q?.trim()) {
    const q = filters.q.trim().replace(/[%_,]/g, "");
    query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,subject.ilike.%${q}%`);
  }

  const { data, count, error } = await query;
  if (error) {
    return { leads: [], total: 0, page, pageSize, error: error.message };
  }

  return {
    leads: (data ?? []) as AdminLeadRow[],
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function listAdminPayments(limit = 50) {
  const ctx = await requireAdmin();
  await requirePermission(ctx, "payments.read");
  const supabase = createServiceRoleClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("payments")
    .select("id, order_id, status, amount_cents, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}

export async function listAdminPartners(limit = 50) {
  const ctx = await requireAdmin();
  await requirePermission(ctx, "partners.view");
  const supabase = createServiceRoleClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("partner_profiles")
    .select("id, user_id, status, display_name, legal_name, payout_eligible, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}

export async function listAdminPartnerApplications(limit = 50) {
  const ctx = await requireAdmin();
  await requirePermission(ctx, "partners.view");
  const supabase = createServiceRoleClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("partner_applications")
    .select("id, status, created_at, legal_name, contact_email")
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}

export async function listAdminCommissions(limit = 50) {
  const ctx = await requireAdmin();
  await requirePermission(ctx, "partners.view");
  const supabase = createServiceRoleClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("partner_commissions")
    .select("id, partner_id, status, amount_cents, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}

export async function listWebsiteProductionJobs(limit = 100) {
  const ctx = await requireAdmin();
  await requirePermission(ctx, "jobs.review");
  const supabase = createServiceRoleClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("website_production_jobs")
    .select("id, order_id, project_id, job_type, status, last_error, spec, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}
