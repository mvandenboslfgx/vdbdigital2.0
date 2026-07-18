import "server-only";
import { createServiceRoleClient } from "@/lib/database/server";
import { requireAdmin } from "@/server/auth/require-admin";
import { requirePermission } from "@/server/auth/require-permission";
import { hasPermission } from "@/lib/auth/permissions";

export async function listAdminQuotes(filters: {
  q?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const ctx = await requireAdmin();
  if (
    !hasPermission(ctx.role, "quotes.view_all") &&
    !hasPermission(ctx.role, "quotes.manage") &&
    !hasPermission(ctx.role, "quotes.view_assigned")
  ) {
    await requirePermission(ctx, "quotes.view_assigned");
  }

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { quotes: [], total: 0, page, pageSize };
  }

  let query = supabase
    .from("portal_quotes")
    .select(
      "id, quote_number, title, status, total_cents, currency, valid_until, sent_at, first_viewed_at, updated_at, organization:organizations(id, legal_name, trade_name), project:portal_projects(id, name)",
      { count: "exact" },
    )
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (filters.status && filters.status !== "ALL") {
    query = query.eq("status", filters.status);
  }
  if (filters.q?.trim()) {
    const q = filters.q.trim().replace(/[%_,]/g, "");
    query = query.or(`title.ilike.%${q}%,quote_number.ilike.%${q}%`);
  }

  const { data, count, error } = await query;
  if (error) {
    return { quotes: [], total: 0, page, pageSize, error: error.message };
  }

  const quotes = (data ?? []).map((row) => {
    const org = (row as { organization?: unknown }).organization;
    const project = (row as { project?: unknown }).project;
    return {
      ...row,
      organization: Array.isArray(org) ? org[0] : org,
      project: Array.isArray(project) ? project[0] : project,
    };
  });

  return { quotes, total: count ?? 0, page, pageSize };
}

export async function getAdminQuote(id: string) {
  const ctx = await requireAdmin();
  if (
    !hasPermission(ctx.role, "quotes.view_all") &&
    !hasPermission(ctx.role, "quotes.manage") &&
    !hasPermission(ctx.role, "quotes.view_assigned")
  ) {
    await requirePermission(ctx, "quotes.view_assigned");
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return null;

  const { data: quote } = await supabase
    .from("portal_quotes")
    .select(
      "*, organization:organizations(id, legal_name, trade_name), project:portal_projects(id, name)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!quote) return null;

  const [{ data: items }, { data: versions }, { data: acceptance }] =
    await Promise.all([
      supabase
        .from("portal_quote_items")
        .select("*")
        .eq("quote_id", id)
        .order("sort_order"),
      supabase
        .from("portal_quote_versions")
        .select("id, version_number, status, snapshot_checksum, created_at, document_id")
        .eq("quote_id", id)
        .order("version_number", { ascending: false }),
      supabase
        .from("portal_quote_acceptances")
        .select("*")
        .eq("quote_id", id)
        .maybeSingle(),
    ]);

  return {
    ctx,
    quote,
    items: items ?? [],
    versions: versions ?? [],
    acceptance,
  };
}
