import "server-only";
import { createServiceRoleClient } from "@/lib/database/server";
import { requireAdmin } from "@/server/auth/require-admin";
import { requirePermission } from "@/server/auth/require-permission";
import {
  intersectCallerOrganizationFilter,
  listManagedOrganizationIds,
  resolveDocumentScopeMode,
} from "@/server/auth/admin-resource-scope";

export type AdminDocumentRow = {
  id: string;
  document_number: string;
  title: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  category: string;
  visibility: string;
  status: string;
  scan_status: string;
  version_number: number;
  is_current: boolean;
  created_at: string;
  updated_at: string;
  organization: { id: string; legal_name: string; trade_name: string | null } | null;
  project: { id: string; name: string } | null;
};

export async function listAdminDocuments(filters: {
  q?: string;
  status?: string;
  visibility?: string;
  category?: string;
  organizationId?: string;
  projectId?: string;
  page?: number;
  pageSize?: number;
}) {
  const ctx = await requireAdmin();
  const mode = resolveDocumentScopeMode(ctx.role);
  if (mode === "deny") {
    await requirePermission(ctx, "documents.view_all");
  }

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { documents: [] as AdminDocumentRow[], total: 0, page, pageSize };
  }

  let allowedOrgs: string[] | "all" | "none" = "all";
  if (mode === "organization") {
    const managed = await listManagedOrganizationIds(supabase, ctx.user.id);
    allowedOrgs = intersectCallerOrganizationFilter(
      managed,
      filters.organizationId,
    );
    if (allowedOrgs === "none" || (Array.isArray(allowedOrgs) && allowedOrgs.length === 0)) {
      return { documents: [], total: 0, page, pageSize };
    }
  } else if (filters.organizationId) {
    allowedOrgs = [filters.organizationId];
  }

  let query = supabase
    .from("portal_files")
    .select(
      "id, document_number, title, file_name, mime_type, size_bytes, category, visibility, status, scan_status, version_number, is_current, created_at, updated_at, organization:organizations(id, legal_name, trade_name), project:portal_projects(id, name)",
      { count: "exact" },
    )
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (allowedOrgs !== "all") {
    query = query.in("organization_id", allowedOrgs);
  }

  if (filters.status && filters.status !== "ALL") {
    query = query.eq("status", filters.status);
  } else {
    query = query.neq("status", "DELETED");
  }
  if (filters.visibility && filters.visibility !== "ALL") {
    query = query.eq("visibility", filters.visibility);
  }
  if (filters.category && filters.category !== "ALL") {
    query = query.eq("category", filters.category);
  }
  if (filters.projectId) {
    query = query.eq("project_id", filters.projectId);
  }
  if (filters.q?.trim()) {
    const q = filters.q.trim().replace(/[%_,]/g, "");
    query = query.or(
      `title.ilike.%${q}%,file_name.ilike.%${q}%,document_number.ilike.%${q}%`,
    );
  }

  const { data, count, error } = await query;
  if (error) {
    return { documents: [], total: 0, page, pageSize, error: error.message };
  }

  const documents = (data ?? []).map((row) => {
    const orgRaw = (row as { organization?: unknown }).organization;
    const projectRaw = (row as { project?: unknown }).project;
    return {
      ...row,
      organization: (Array.isArray(orgRaw) ? orgRaw[0] : orgRaw) as AdminDocumentRow["organization"],
      project: (Array.isArray(projectRaw) ? projectRaw[0] : projectRaw) as AdminDocumentRow["project"],
    } as AdminDocumentRow;
  });

  return { documents, total: count ?? 0, page, pageSize };
}

export async function getAdminDocument(id: string) {
  const ctx = await requireAdmin();
  const mode = resolveDocumentScopeMode(ctx.role);
  if (mode === "deny") {
    await requirePermission(ctx, "documents.view_all");
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return null;

  const { data: doc } = await supabase
    .from("portal_files")
    .select(
      "*, organization:organizations(id, legal_name, trade_name), project:portal_projects(id, name), deliverable:portal_project_deliverables(id, title, status)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!doc) return null;

  if (mode === "organization") {
    const managed = await listManagedOrganizationIds(supabase, ctx.user.id);
    const orgId = (doc as { organization_id?: string }).organization_id;
    if (!orgId || !managed.includes(orgId)) {
      return null;
    }
  }

  const rootId = doc.parent_document_id ?? doc.id;
  const { data: versions } = await supabase
    .from("portal_files")
    .select(
      "id, version_number, title, status, visibility, created_at, uploaded_by, is_current, change_summary, size_bytes, mime_type",
    )
    .or(`id.eq.${rootId},parent_document_id.eq.${rootId}`)
    .order("version_number", { ascending: false });

  const { data: downloads } = await supabase
    .from("portal_document_download_events")
    .select("id, actor_audience, created_at, actor_user_id")
    .eq("document_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  return {
    ctx,
    document: doc,
    versions: versions ?? [],
    downloads: downloads ?? [],
  };
}
