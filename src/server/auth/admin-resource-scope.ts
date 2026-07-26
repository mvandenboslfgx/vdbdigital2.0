import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminRole } from "@/types";
import { hasPermission, type Permission } from "@/lib/auth/permissions";

export type AdminActor = {
  user: { id: string };
  role: AdminRole;
};

export type ResourceScopeMode = "all" | "assigned" | "organization" | "deny";

/**
 * Quotes/invoices: view_all | manage → all;
 * view_assigned only → created_by OR projects managed by actor.
 */
export function resolveQuoteInvoiceScopeMode(
  role: AdminRole,
  domain: "quotes" | "invoices",
): ResourceScopeMode {
  const viewAll = `${domain}.view_all` as Permission;
  const manage = `${domain}.manage` as Permission;
  const viewAssigned = `${domain}.view_assigned` as Permission;
  if (hasPermission(role, viewAll) || hasPermission(role, manage)) return "all";
  if (hasPermission(role, viewAssigned)) return "assigned";
  return "deny";
}

/** Documents: view_all → all; view_organization → managed orgs only. */
export function resolveDocumentScopeMode(role: AdminRole): ResourceScopeMode {
  if (hasPermission(role, "documents.view_all")) return "all";
  if (hasPermission(role, "documents.view_organization")) return "organization";
  return "deny";
}

export async function listManagedProjectIds(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("portal_projects")
    .select("id")
    .eq("project_manager_id", userId)
    .is("archived_at", null);
  if (error || !data) return [];
  return data.map((r) => r.id as string);
}

export async function listManagedOrganizationIds(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("portal_projects")
    .select("organization_id")
    .eq("project_manager_id", userId)
    .is("archived_at", null);
  if (error || !data) return [];
  return [...new Set(data.map((r) => r.organization_id as string).filter(Boolean))];
}

/**
 * PostgREST filter for assigned quotes/invoices.
 * Uses existing columns only: created_by + project.project_manager_id.
 */
export function buildAssignedRecordOrFilter(
  userId: string,
  managedProjectIds: string[],
): string {
  const parts = [`created_by.eq.${userId}`];
  if (managedProjectIds.length > 0) {
    parts.push(`project_id.in.(${managedProjectIds.join(",")})`);
  }
  return parts.join(",");
}

/**
 * Caller-supplied organizationId may only narrow an already authorized set.
 */
export function intersectCallerOrganizationFilter(
  allowedOrgIds: string[] | "all",
  callerOrganizationId: string | undefined,
): string[] | "all" | "none" {
  if (!callerOrganizationId) return allowedOrgIds;
  if (allowedOrgIds === "all") return [callerOrganizationId];
  if (allowedOrgIds.includes(callerOrganizationId)) return [callerOrganizationId];
  return "none";
}
