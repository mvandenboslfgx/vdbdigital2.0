"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/database/server";
import { writeAuditLog } from "@/lib/security/audit-log";
import { verifyOrigin } from "@/lib/security/origin";
import { checkRateLimit } from "@/lib/security/rate-limit";
import {
  actionSchema,
  createProjectSchema,
  deliverableSchema,
  milestoneSchema,
  shareDeliverableSchema,
  slugifyProjectName,
  updateMilestoneSchema,
  updateProjectSchema,
} from "@/lib/validation/projects";
import { assertProjectPermission } from "@/server/repositories/admin-projects";

export type ProjectActionState = {
  error?: string;
  message?: string;
  success?: boolean;
};

async function recordActivity(input: {
  projectId: string;
  actorUserId: string;
  activityType: string;
  summary: string;
  visibility?: "INTERNAL" | "CUSTOMER_VISIBLE";
  metadata?: Record<string, unknown>;
}) {
  const supabase = createServiceRoleClient();
  if (!supabase) return;
  await supabase.from("portal_project_activity").insert({
    project_id: input.projectId,
    actor_user_id: input.actorUserId,
    activity_type: input.activityType,
    summary: input.summary,
    visibility: input.visibility ?? "INTERNAL",
    metadata_safe: input.metadata ?? {},
  });
}

async function notifyOrgMembers(input: {
  organizationId: string;
  type: string;
  title: string;
  body: string;
  href: string;
}) {
  const supabase = createServiceRoleClient();
  if (!supabase) return;
  const { data: members } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", input.organizationId)
    .eq("status", "ACTIVE");
  if (!members?.length) return;
  await supabase.from("portal_notifications").insert(
    members.map((m) => ({
      user_id: m.user_id,
      organization_id: input.organizationId,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href,
      email_status: "SKIPPED",
    })),
  );
}

function revalidateProject(projectId: string) {
  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath("/portal/projecten");
  revalidatePath(`/portal/projecten/${projectId}`);
}

export async function createProjectAction(formData: FormData) {
  const ctx = await assertProjectPermission("projects.create");
  if (!(await verifyOrigin())) {
    redirect("/admin/projects/new?fout=origin");
  }

  const limited = await checkRateLimit("admin-project-create", ctx.user.id);
  if (!limited.success) {
    redirect("/admin/projects/new?fout=rate");
  }

  const parsed = createProjectSchema.safeParse({
    organizationId: formData.get("organizationId"),
    name: formData.get("name"),
    description: formData.get("description") || "",
    projectType: formData.get("projectType"),
    priority: formData.get("priority") || "NORMAL",
    status: formData.get("status") || "DRAFT",
    visibility: formData.get("visibility") || "INTERNAL",
    startDate: formData.get("startDate") || "",
    plannedDeliveryDate: formData.get("plannedDeliveryDate") || "",
    projectManagerId: formData.get("projectManagerId") || "",
  });

  if (!parsed.success) {
    redirect("/admin/projects/new?fout=validatie");
  }

  const supabase = createServiceRoleClient();
  if (!supabase) redirect("/admin/projects/new?fout=db");

  const { data: org } = await supabase
    .from("organizations")
    .select("id, status")
    .eq("id", parsed.data.organizationId)
    .maybeSingle();

  if (!org || org.status === "ARCHIVED" || org.status === "SUSPENDED") {
    redirect("/admin/projects/new?fout=organisatie");
  }

  const { data: numberRow } = await supabase.rpc(
    "generate_portal_project_number",
  );
  const projectNumber =
    typeof numberRow === "string" && numberRow
      ? numberRow
      : `PRJ-TMP-${Date.now()}`;

  const visibility = parsed.data.visibility;
  const { data, error } = await supabase
    .from("portal_projects")
    .insert({
      organization_id: parsed.data.organizationId,
      project_number: projectNumber,
      name: parsed.data.name,
      slug: slugifyProjectName(parsed.data.name),
      description: parsed.data.description || null,
      project_type: parsed.data.projectType,
      status: parsed.data.status,
      priority: parsed.data.priority,
      visibility,
      customer_visible: visibility === "CUSTOMER_VISIBLE",
      start_date: parsed.data.startDate || null,
      planned_delivery_date: parsed.data.plannedDeliveryDate || null,
      project_manager_id: parsed.data.projectManagerId || ctx.user.id,
      created_by: ctx.user.id,
    })
    .select("id, project_number")
    .single();

  if (error || !data) {
    redirect("/admin/projects/new?fout=opslaan");
  }

  await supabase.from("portal_project_members").upsert(
    {
      project_id: data.id,
      user_id: parsed.data.projectManagerId || ctx.user.id,
      project_role: "PROJECT_MANAGER",
      created_by: ctx.user.id,
    },
    { onConflict: "project_id,user_id" },
  );

  await recordActivity({
    projectId: data.id,
    actorUserId: ctx.user.id,
    activityType: "project.created",
    summary: "Project aangemaakt",
    visibility:
      visibility === "CUSTOMER_VISIBLE" ? "CUSTOMER_VISIBLE" : "INTERNAL",
    metadata: { projectNumber: data.project_number },
  });

  await writeAuditLog({
    userId: ctx.user.id,
    action: "admin.project_created",
    metadata: {
      projectId: data.id,
      organizationId: parsed.data.organizationId,
      projectNumber: data.project_number,
    },
  });

  revalidateProject(data.id);
  redirect(`/admin/projects/${data.id}/overview`);
}

export async function updateProjectAction(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const ctx = await assertProjectPermission("projects.edit");
  if (!(await verifyOrigin())) return { error: "Verzoek geweigerd." };

  const parsed = updateProjectSchema.safeParse({
    projectId: formData.get("projectId"),
    expectedVersion: formData.get("expectedVersion"),
    name: formData.get("name"),
    description: formData.get("description") || "",
    projectType: formData.get("projectType"),
    status: formData.get("status"),
    priority: formData.get("priority"),
    visibility: formData.get("visibility"),
    progressPercent: formData.get("progressPercent"),
    startDate: formData.get("startDate") || "",
    plannedDeliveryDate: formData.get("plannedDeliveryDate") || "",
    actualDeliveryDate: formData.get("actualDeliveryDate") || "",
    projectManagerId: formData.get("projectManagerId") || "",
    completeOverride: formData.get("completeOverride") === "1",
  });

  if (!parsed.success) {
    return { error: "Controleer de invulvelden." };
  }

  if (
    parsed.data.status === "COMPLETED" &&
    parsed.data.progressPercent < 100 &&
    !parsed.data.completeOverride
  ) {
    return {
      error:
        "Afgerond vereist 100% voortgang, of een expliciete override met auditlog.",
    };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return { error: "Database niet beschikbaar." };

  const { data: existing } = await supabase
    .from("portal_projects")
    .select("id, status, visibility, organization_id, version, archived_at")
    .eq("id", parsed.data.projectId)
    .maybeSingle();

  if (!existing) return { error: "Project niet gevonden." };

  const nextArchivedAt =
    parsed.data.status === "ARCHIVED" ? new Date().toISOString() : null;

  const { data: updated, error } = await supabase
    .from("portal_projects")
    .update({
      name: parsed.data.name,
      slug: slugifyProjectName(parsed.data.name),
      description: parsed.data.description || null,
      project_type: parsed.data.projectType,
      status: parsed.data.status,
      priority: parsed.data.priority,
      visibility: parsed.data.visibility,
      customer_visible: parsed.data.visibility === "CUSTOMER_VISIBLE",
      progress_percent: parsed.data.progressPercent,
      start_date: parsed.data.startDate || null,
      planned_delivery_date: parsed.data.plannedDeliveryDate || null,
      actual_delivery_date: parsed.data.actualDeliveryDate || null,
      project_manager_id: parsed.data.projectManagerId || null,
      archived_at: nextArchivedAt,
      version: existing.version + 1,
    })
    .eq("id", parsed.data.projectId)
    .eq("version", parsed.data.expectedVersion)
    .select("id")
    .maybeSingle();

  if (error || !updated) {
    return {
      error:
        "Opslaan mislukt. Het project is mogelijk ondertussen gewijzigd — vernieuw de pagina.",
    };
  }

  if (existing.status !== parsed.data.status) {
    await recordActivity({
      projectId: parsed.data.projectId,
      actorUserId: ctx.user.id,
      activityType: "project.status_changed",
      summary: `Status gewijzigd naar ${parsed.data.status}`,
      visibility:
        parsed.data.visibility === "CUSTOMER_VISIBLE"
          ? "CUSTOMER_VISIBLE"
          : "INTERNAL",
      metadata: { from: existing.status, to: parsed.data.status },
    });
  }

  if (
    existing.visibility !== parsed.data.visibility &&
    parsed.data.visibility === "CUSTOMER_VISIBLE"
  ) {
    await notifyOrgMembers({
      organizationId: existing.organization_id,
      type: "project.shared",
      title: "Nieuw of bijgewerkt project",
      body: "Er is een project zichtbaar gemaakt in je portaal.",
      href: `/portal/projecten/${parsed.data.projectId}`,
    });
  }

  await writeAuditLog({
    userId: ctx.user.id,
    action: "admin.project_updated",
    metadata: {
      projectId: parsed.data.projectId,
      status: parsed.data.status,
      visibility: parsed.data.visibility,
      completeOverride: Boolean(parsed.data.completeOverride),
    },
  });

  revalidateProject(parsed.data.projectId);
  return { success: true, message: "Project opgeslagen." };
}

export async function archiveProjectAction(formData: FormData) {
  const ctx = await assertProjectPermission("projects.archive");
  if (!(await verifyOrigin())) redirect("/admin/projects");

  const projectId = String(formData.get("projectId") || "");
  const expectedVersion = Number(formData.get("expectedVersion") || 0);
  if (!projectId || !expectedVersion) redirect("/admin/projects");

  const supabase = createServiceRoleClient();
  if (!supabase) redirect("/admin/projects");

  await supabase
    .from("portal_projects")
    .update({
      status: "ARCHIVED",
      archived_at: new Date().toISOString(),
      version: expectedVersion + 1,
    })
    .eq("id", projectId)
    .eq("version", expectedVersion);

  await recordActivity({
    projectId,
    actorUserId: ctx.user.id,
    activityType: "project.archived",
    summary: "Project gearchiveerd",
  });
  await writeAuditLog({
    userId: ctx.user.id,
    action: "admin.project_archived",
    metadata: { projectId },
  });

  revalidateProject(projectId);
  redirect(`/admin/projects/${projectId}/settings`);
}

export async function createMilestoneAction(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const ctx = await assertProjectPermission("projects.manage_milestones");
  if (!(await verifyOrigin())) return { error: "Verzoek geweigerd." };

  const parsed = milestoneSchema.safeParse({
    projectId: formData.get("projectId"),
    title: formData.get("title"),
    description: formData.get("description") || "",
    dueDate: formData.get("dueDate") || "",
    customerVisible: formData.get("customerVisible") === "1",
    requiresCustomerAction: formData.get("requiresCustomerAction") === "1",
    status: formData.get("status") || "NOT_STARTED",
    sortOrder: formData.get("sortOrder") || 0,
  });
  if (!parsed.success) return { error: "Controleer de mijlpaalvelden." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { error: "Database niet beschikbaar." };

  const { error } = await supabase.from("portal_project_milestones").insert({
    project_id: parsed.data.projectId,
    title: parsed.data.title,
    description: parsed.data.description || null,
    due_date: parsed.data.dueDate || null,
    customer_visible: parsed.data.customerVisible,
    requires_customer_action:
      parsed.data.customerVisible && parsed.data.requiresCustomerAction,
    status: parsed.data.status,
    sort_order: parsed.data.sortOrder,
    completed_at:
      parsed.data.status === "COMPLETED" ? new Date().toISOString() : null,
  });

  if (error) return { error: "Mijlpaal opslaan mislukt." };

  await recordActivity({
    projectId: parsed.data.projectId,
    actorUserId: ctx.user.id,
    activityType: "milestone.created",
    summary: "Mijlpaal toegevoegd",
    visibility: parsed.data.customerVisible
      ? "CUSTOMER_VISIBLE"
      : "INTERNAL",
  });
  await writeAuditLog({
    userId: ctx.user.id,
    action: "admin.project_milestone_created",
    metadata: { projectId: parsed.data.projectId },
  });

  revalidateProject(parsed.data.projectId);
  return { success: true, message: "Mijlpaal toegevoegd." };
}

export async function updateMilestoneAction(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const ctx = await assertProjectPermission("projects.manage_milestones");
  if (!(await verifyOrigin())) return { error: "Verzoek geweigerd." };

  const parsed = updateMilestoneSchema.safeParse({
    milestoneId: formData.get("milestoneId"),
    projectId: formData.get("projectId"),
    expectedVersion: formData.get("expectedVersion"),
    title: formData.get("title"),
    description: formData.get("description") || "",
    dueDate: formData.get("dueDate") || "",
    customerVisible: formData.get("customerVisible") === "1",
    requiresCustomerAction: formData.get("requiresCustomerAction") === "1",
    status: formData.get("status") || "NOT_STARTED",
    sortOrder: formData.get("sortOrder") || 0,
  });
  if (!parsed.success) return { error: "Controleer de mijlpaalvelden." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { error: "Database niet beschikbaar." };

  const { data, error } = await supabase
    .from("portal_project_milestones")
    .update({
      title: parsed.data.title,
      description: parsed.data.description || null,
      due_date: parsed.data.dueDate || null,
      customer_visible: parsed.data.customerVisible,
      requires_customer_action:
        parsed.data.customerVisible && parsed.data.requiresCustomerAction,
      status: parsed.data.status,
      sort_order: parsed.data.sortOrder,
      completed_at:
        parsed.data.status === "COMPLETED" ? new Date().toISOString() : null,
      version: parsed.data.expectedVersion + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.milestoneId)
    .eq("project_id", parsed.data.projectId)
    .eq("version", parsed.data.expectedVersion)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { error: "Mijlpaal bijwerken mislukt (versieconflict?)." };
  }

  await recordActivity({
    projectId: parsed.data.projectId,
    actorUserId: ctx.user.id,
    activityType: "milestone.updated",
    summary: "Mijlpaal bijgewerkt",
    visibility: parsed.data.customerVisible
      ? "CUSTOMER_VISIBLE"
      : "INTERNAL",
  });

  revalidateProject(parsed.data.projectId);
  return { success: true, message: "Mijlpaal bijgewerkt." };
}

export async function createActionItemAction(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const ctx = await assertProjectPermission("projects.manage_actions");
  if (!(await verifyOrigin())) return { error: "Verzoek geweigerd." };

  const parsed = actionSchema.safeParse({
    projectId: formData.get("projectId"),
    title: formData.get("title"),
    description: formData.get("description") || "",
    assignedToType: formData.get("assignedToType") || "UNASSIGNED",
    assignedUserId: formData.get("assignedUserId") || "",
    priority: formData.get("priority") || "NORMAL",
    dueDate: formData.get("dueDate") || "",
    customerVisible: formData.get("customerVisible") === "1",
  });
  if (!parsed.success) return { error: "Controleer de actievelden." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { error: "Database niet beschikbaar." };

  const { data: project } = await supabase
    .from("portal_projects")
    .select("id, organization_id, customer_visible")
    .eq("id", parsed.data.projectId)
    .maybeSingle();
  if (!project) return { error: "Project niet gevonden." };

  const isCustomer = parsed.data.assignedToType === "CUSTOMER";
  if (isCustomer && !parsed.data.customerVisible) {
    return { error: "Klantacties moeten klantzichtbaar zijn." };
  }

  const { data: action, error } = await supabase
    .from("portal_project_actions")
    .insert({
      project_id: parsed.data.projectId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      assigned_to_type: parsed.data.assignedToType,
      assigned_user_id: parsed.data.assignedUserId || null,
      assigned_organization_id: isCustomer ? project.organization_id : null,
      priority: parsed.data.priority,
      due_date: parsed.data.dueDate || null,
      customer_visible: isCustomer ? true : parsed.data.customerVisible,
      created_by: ctx.user.id,
    })
    .select("id")
    .single();

  if (error || !action) return { error: "Actie opslaan mislukt." };

  await recordActivity({
    projectId: parsed.data.projectId,
    actorUserId: ctx.user.id,
    activityType: "action.assigned",
    summary: isCustomer ? "Klantactie toegewezen" : "Interne actie aangemaakt",
    visibility: isCustomer ? "CUSTOMER_VISIBLE" : "INTERNAL",
  });

  if (isCustomer && project.customer_visible) {
    await notifyOrgMembers({
      organizationId: project.organization_id,
      type: "project.action_assigned",
      title: "Nieuwe actie in je project",
      body: "Er staat een actie voor je klaar.",
      href: `/portal/projecten/${parsed.data.projectId}/overview`,
    });
  }

  await writeAuditLog({
    userId: ctx.user.id,
    action: "admin.project_action_created",
    metadata: { projectId: parsed.data.projectId, actionId: action.id },
  });

  revalidateProject(parsed.data.projectId);
  return { success: true, message: "Actie aangemaakt." };
}

export async function createDeliverableAction(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const ctx = await assertProjectPermission("projects.manage_deliverables");
  if (!(await verifyOrigin())) return { error: "Verzoek geweigerd." };

  const parsed = deliverableSchema.safeParse({
    projectId: formData.get("projectId"),
    title: formData.get("title"),
    description: formData.get("description") || "",
    requiresApproval: formData.get("requiresApproval") === "1",
  });
  if (!parsed.success) return { error: "Controleer de opleveringvelden." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { error: "Database niet beschikbaar." };

  const { error } = await supabase.from("portal_project_deliverables").insert({
    project_id: parsed.data.projectId,
    title: parsed.data.title,
    description: parsed.data.description || null,
    status: "DRAFT",
    customer_visible: false,
    requires_approval: parsed.data.requiresApproval,
  });

  if (error) return { error: "Oplevering opslaan mislukt." };

  await recordActivity({
    projectId: parsed.data.projectId,
    actorUserId: ctx.user.id,
    activityType: "deliverable.created",
    summary: "Oplevering aangemaakt (concept)",
  });
  await writeAuditLog({
    userId: ctx.user.id,
    action: "admin.project_deliverable_created",
    metadata: { projectId: parsed.data.projectId },
  });

  revalidateProject(parsed.data.projectId);
  return { success: true, message: "Oplevering als concept opgeslagen." };
}

export async function shareDeliverableAction(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const ctx = await assertProjectPermission("projects.manage_deliverables");
  if (!(await verifyOrigin())) return { error: "Verzoek geweigerd." };

  const parsed = shareDeliverableSchema.safeParse({
    deliverableId: formData.get("deliverableId"),
    expectedVersion: formData.get("expectedVersion"),
  });
  if (!parsed.success) return { error: "Ongeldige aanvraag." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { error: "Database niet beschikbaar." };

  const { data: row } = await supabase
    .from("portal_project_deliverables")
    .select("id, project_id, version, status")
    .eq("id", parsed.data.deliverableId)
    .maybeSingle();
  if (!row) return { error: "Oplevering niet gevonden." };

  const { data: updated, error } = await supabase
    .from("portal_project_deliverables")
    .update({
      status: "SHARED",
      customer_visible: true,
      version: row.version + 1,
    })
    .eq("id", row.id)
    .eq("version", parsed.data.expectedVersion)
    .select("id")
    .maybeSingle();

  if (error || !updated) {
    return { error: "Delen mislukt (versieconflict?)." };
  }

  const { data: project } = await supabase
    .from("portal_projects")
    .select("organization_id, customer_visible")
    .eq("id", row.project_id)
    .maybeSingle();

  await recordActivity({
    projectId: row.project_id,
    actorUserId: ctx.user.id,
    activityType: "deliverable.shared",
    summary: "Oplevering gedeeld met klant",
    visibility: "CUSTOMER_VISIBLE",
  });

  if (project?.customer_visible) {
    await notifyOrgMembers({
      organizationId: project.organization_id,
      type: "project.deliverable_shared",
      title: "Nieuwe oplevering beschikbaar",
      body: "Er is een oplevering met je gedeeld ter beoordeling.",
      href: `/portal/projecten/${row.project_id}/deliverables`,
    });
  }

  await writeAuditLog({
    userId: ctx.user.id,
    action: "admin.project_deliverable_shared",
    metadata: { projectId: row.project_id, deliverableId: row.id },
  });

  revalidateProject(row.project_id);
  return { success: true, message: "Oplevering gedeeld met de klant." };
}

export async function duplicateProjectAsDraftAction(formData: FormData) {
  const ctx = await assertProjectPermission("projects.create");
  if (!(await verifyOrigin())) redirect("/admin/projects");

  const projectId = String(formData.get("projectId") || "");
  const supabase = createServiceRoleClient();
  if (!supabase || !projectId) redirect("/admin/projects");

  const { data: source } = await supabase
    .from("portal_projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();
  if (!source) redirect("/admin/projects");

  const { data: numberRow } = await supabase.rpc(
    "generate_portal_project_number",
  );
  const projectNumber =
    typeof numberRow === "string" && numberRow
      ? numberRow
      : `PRJ-TMP-${Date.now()}`;

  const { data: copy } = await supabase
    .from("portal_projects")
    .insert({
      organization_id: source.organization_id,
      project_number: projectNumber,
      name: `${source.name} (kopie)`,
      slug: slugifyProjectName(`${source.name}-kopie`),
      description: source.description,
      project_type: source.project_type,
      status: "DRAFT",
      priority: source.priority,
      visibility: "INTERNAL",
      customer_visible: false,
      progress_percent: 0,
      project_manager_id: ctx.user.id,
      created_by: ctx.user.id,
    })
    .select("id")
    .single();

  if (!copy) redirect("/admin/projects");

  await writeAuditLog({
    userId: ctx.user.id,
    action: "admin.project_duplicated",
    metadata: { sourceId: projectId, projectId: copy.id },
  });

  revalidatePath("/admin/projects");
  redirect(`/admin/projects/${copy.id}/settings`);
}
