import "server-only";
import { createServiceRoleClient } from "@/lib/database/server";
import { requireAdmin } from "@/server/auth/require-admin";
import { requirePermission } from "@/server/auth/require-permission";
import type { Permission } from "@/lib/auth/permissions";
import { hasPermission } from "@/lib/auth/permissions";

export type AdminProjectListRow = {
  id: string;
  project_number: string;
  name: string;
  project_type: string;
  status: string;
  priority: string;
  progress_percent: number;
  visibility: string;
  customer_visible: boolean;
  planned_delivery_date: string | null;
  updated_at: string;
  archived_at: string | null;
  project_manager_id: string | null;
  organization: { id: string; legal_name: string; trade_name: string | null } | null;
};

export async function listAdminProjectsFiltered(filters: {
  q?: string;
  status?: string;
  projectType?: string;
  visibility?: string;
  page?: number;
  pageSize?: number;
}) {
  const ctx = await requireAdmin();
  const canAll = hasPermission(ctx.role, "projects.view_all");
  const canAssigned = hasPermission(ctx.role, "projects.view_assigned");
  if (!canAll && !canAssigned) {
    await requirePermission(ctx, "projects.view_all");
  }

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { projects: [] as AdminProjectListRow[], total: 0, page, pageSize };
  }

  let query = supabase
    .from("portal_projects")
    .select(
      "id, project_number, name, project_type, status, priority, progress_percent, visibility, customer_visible, planned_delivery_date, updated_at, archived_at, project_manager_id, organization:organizations(id, legal_name, trade_name)",
      { count: "exact" },
    )
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (!canAll && canAssigned) {
    query = query.eq("project_manager_id", ctx.user.id);
  }

  if (filters.status && filters.status !== "ALL") {
    if (filters.status === "ACTIVE") {
      query = query.is("archived_at", null).neq("status", "ARCHIVED");
    } else {
      query = query.eq("status", filters.status);
    }
  } else {
    query = query.is("archived_at", null);
  }

  if (filters.projectType && filters.projectType !== "ALL") {
    query = query.eq("project_type", filters.projectType);
  }
  if (filters.visibility && filters.visibility !== "ALL") {
    query = query.eq("visibility", filters.visibility);
  }
  if (filters.q?.trim()) {
    const q = filters.q.trim().replace(/[%_,]/g, "");
    query = query.or(
      `name.ilike.%${q}%,project_number.ilike.%${q}%`,
    );
  }

  const { data, count, error } = await query;
  if (error) {
    return { projects: [], total: 0, page, pageSize, error: error.message };
  }

  const projects = (data ?? []).map((row) => {
    const orgRaw = (row as { organization?: unknown }).organization;
    const organization = (Array.isArray(orgRaw) ? orgRaw[0] : orgRaw) as
      | AdminProjectListRow["organization"]
      | null;
    return { ...row, organization } as AdminProjectListRow;
  });

  return { projects, total: count ?? 0, page, pageSize };
}

export async function getAdminProjectBundle(id: string) {
  const ctx = await requireAdmin();
  const canAll = hasPermission(ctx.role, "projects.view_all");
  const canAssigned = hasPermission(ctx.role, "projects.view_assigned");
  if (!canAll && !canAssigned) {
    await requirePermission(ctx, "projects.view_all");
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return null;

  const { data: project } = await supabase
    .from("portal_projects")
    .select("*, organization:organizations(id, legal_name, trade_name, status)")
    .eq("id", id)
    .maybeSingle();

  if (!project) return null;

  if (
    !canAll &&
    canAssigned &&
    project.project_manager_id !== ctx.user.id
  ) {
    return null;
  }

  const [
    milestones,
    actions,
    deliverables,
    feedback,
    activity,
    members,
  ] = await Promise.all([
    supabase
      .from("portal_project_milestones")
      .select("*")
      .eq("project_id", id)
      .order("sort_order"),
    supabase
      .from("portal_project_actions")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("portal_project_deliverables")
      .select("*")
      .eq("project_id", id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("portal_project_feedback")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("portal_project_activity")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("portal_project_members")
      .select(
        "id, project_role, created_at, user:profiles(id, email, full_name)",
      )
      .eq("project_id", id),
  ]);

  const orgRaw = project.organization;
  const organization = (Array.isArray(orgRaw) ? orgRaw[0] : orgRaw) as {
    id: string;
    legal_name: string;
    trade_name: string | null;
    status: string;
  } | null;

  return {
    ctx,
    project: { ...project, organization },
    milestones: milestones.data ?? [],
    actions: actions.data ?? [],
    deliverables: deliverables.data ?? [],
    feedback: feedback.data ?? [],
    activity: activity.data ?? [],
    members: members.data ?? [],
  };
}

export async function assertProjectPermission(
  permission: Permission,
): Promise<Awaited<ReturnType<typeof requireAdmin>>> {
  const ctx = await requireAdmin();
  await requirePermission(ctx, permission);
  return ctx;
}
