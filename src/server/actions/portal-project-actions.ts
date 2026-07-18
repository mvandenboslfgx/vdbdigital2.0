"use server";

import { revalidatePath } from "next/cache";
import { hasCustomerPermission } from "@/lib/auth/customer-permissions";
import { createServiceRoleClient } from "@/lib/database/server";
import { writeAuditLog } from "@/lib/security/audit-log";
import { verifyOrigin } from "@/lib/security/origin";
import { checkRateLimit } from "@/lib/security/rate-limit";
import {
  approveDeliverableSchema,
  completeActionSchema,
  feedbackSchema,
  rejectDeliverableSchema,
  sanitizeFeedbackBody,
} from "@/lib/validation/projects";
import { requireCustomer } from "@/server/auth/require-customer";
import type { PortalActionState } from "@/server/actions/portal-actions";

function deny(): PortalActionState {
  return {
    error: "Je hebt geen rechten voor deze actie binnen je organisatie.",
  };
}

async function recordCustomerActivity(input: {
  projectId: string;
  actorUserId: string;
  activityType: string;
  summary: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createServiceRoleClient();
  if (!supabase) return;
  await supabase.from("portal_project_activity").insert({
    project_id: input.projectId,
    actor_user_id: input.actorUserId,
    activity_type: input.activityType,
    summary: input.summary,
    visibility: "CUSTOMER_VISIBLE",
    metadata_safe: input.metadata ?? {},
  });
}

export async function completeCustomerActionAction(
  _prev: PortalActionState,
  formData: FormData,
): Promise<PortalActionState> {
  if (!(await verifyOrigin())) return { error: "Verzoek geweigerd." };

  const parsed = completeActionSchema.safeParse({
    actionId: formData.get("actionId"),
    expectedVersion: formData.get("expectedVersion"),
    note: formData.get("note") || "",
  });
  if (!parsed.success) return { error: "Ongeldige aanvraag." };

  const ctx = await requireCustomer();
  if (!hasCustomerPermission(ctx.customerRole, "portal.projects.complete_action")) {
    return deny();
  }

  const limited = await checkRateLimit("portal-project-action", ctx.user.id);
  if (!limited.success) {
    return { error: "Te veel pogingen. Probeer later opnieuw." };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return { error: "Database niet beschikbaar." };

  const { data: action } = await supabase
    .from("portal_project_actions")
    .select(
      "id, project_id, status, version, assigned_to_type, customer_visible, assigned_organization_id",
    )
    .eq("id", parsed.data.actionId)
    .maybeSingle();

  if (
    !action ||
    !action.customer_visible ||
    action.assigned_to_type !== "CUSTOMER" ||
    action.assigned_organization_id !== ctx.organization.id
  ) {
    return { error: "Actie niet gevonden of niet beschikbaar." };
  }

  const { data: project } = await supabase
    .from("portal_projects")
    .select("id, organization_id, customer_visible, archived_at")
    .eq("id", action.project_id)
    .eq("organization_id", ctx.organization.id)
    .eq("customer_visible", true)
    .maybeSingle();

  if (!project || project.archived_at) {
    return { error: "Project niet beschikbaar." };
  }

  const { data: updated, error } = await supabase
    .from("portal_project_actions")
    .update({
      status: "COMPLETED",
      completed_at: new Date().toISOString(),
      version: action.version + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", action.id)
    .eq("version", parsed.data.expectedVersion)
    .select("id")
    .maybeSingle();

  if (error || !updated) {
    return { error: "Afronden mislukt. Vernieuw de pagina en probeer opnieuw." };
  }

  await recordCustomerActivity({
    projectId: action.project_id,
    actorUserId: ctx.user.id,
    activityType: "action.completed_by_customer",
    summary: "Klantactie afgerond",
    metadata: {
      actionId: action.id,
      hasNote: Boolean(parsed.data.note?.trim()),
    },
  });

  await writeAuditLog({
    userId: ctx.user.id,
    action: "portal.project_action_completed",
    metadata: {
      projectId: action.project_id,
      actionId: action.id,
      organizationId: ctx.organization.id,
    },
  });

  revalidatePath(`/portal/projecten/${action.project_id}`);
  revalidatePath(`/admin/projects/${action.project_id}`);
  return { success: true, message: "Actie afgerond." };
}

export async function approveDeliverableAction(
  _prev: PortalActionState,
  formData: FormData,
): Promise<PortalActionState> {
  if (!(await verifyOrigin())) return { error: "Verzoek geweigerd." };

  const parsed = approveDeliverableSchema.safeParse({
    deliverableId: formData.get("deliverableId"),
    expectedVersion: formData.get("expectedVersion"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: "Bevestig de goedkeuring expliciet." };
  }

  const ctx = await requireCustomer();
  if (
    !hasCustomerPermission(ctx.customerRole, "portal.projects.approve_deliverable")
  ) {
    return deny();
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return { error: "Database niet beschikbaar." };

  const { data: row } = await supabase
    .from("portal_project_deliverables")
    .select("id, project_id, status, version, customer_visible, requires_approval")
    .eq("id", parsed.data.deliverableId)
    .maybeSingle();

  if (!row || !row.customer_visible || row.status !== "SHARED") {
    return { error: "Oplevering niet beschikbaar voor goedkeuring." };
  }

  const { data: project } = await supabase
    .from("portal_projects")
    .select("id")
    .eq("id", row.project_id)
    .eq("organization_id", ctx.organization.id)
    .eq("customer_visible", true)
    .maybeSingle();
  if (!project) return { error: "Project niet gevonden." };

  const { data: updated, error } = await supabase
    .from("portal_project_deliverables")
    .update({
      status: "APPROVED",
      approved_at: new Date().toISOString(),
      approved_by: ctx.user.id,
      rejected_at: null,
      rejected_by: null,
      rejection_reason: null,
      version: row.version + 1,
    })
    .eq("id", row.id)
    .eq("version", parsed.data.expectedVersion)
    .select("id")
    .maybeSingle();

  if (error || !updated) {
    return { error: "Goedkeuren mislukt (versieconflict?)." };
  }

  await recordCustomerActivity({
    projectId: row.project_id,
    actorUserId: ctx.user.id,
    activityType: "deliverable.approved",
    summary: "Oplevering goedgekeurd",
    metadata: { deliverableId: row.id },
  });

  await writeAuditLog({
    userId: ctx.user.id,
    action: "portal.project_deliverable_approved",
    metadata: {
      projectId: row.project_id,
      deliverableId: row.id,
      organizationId: ctx.organization.id,
    },
  });

  revalidatePath(`/portal/projecten/${row.project_id}`);
  revalidatePath(`/admin/projects/${row.project_id}`);
  return { success: true, message: "Oplevering goedgekeurd." };
}

export async function rejectDeliverableAction(
  _prev: PortalActionState,
  formData: FormData,
): Promise<PortalActionState> {
  if (!(await verifyOrigin())) return { error: "Verzoek geweigerd." };

  const parsed = rejectDeliverableSchema.safeParse({
    deliverableId: formData.get("deliverableId"),
    expectedVersion: formData.get("expectedVersion"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige aanvraag." };
  }

  const ctx = await requireCustomer();
  if (
    !hasCustomerPermission(ctx.customerRole, "portal.projects.approve_deliverable")
  ) {
    return deny();
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return { error: "Database niet beschikbaar." };

  const { data: row } = await supabase
    .from("portal_project_deliverables")
    .select("id, project_id, status, version, customer_visible")
    .eq("id", parsed.data.deliverableId)
    .maybeSingle();

  if (!row || !row.customer_visible || row.status !== "SHARED") {
    return { error: "Oplevering niet beschikbaar." };
  }

  const { data: project } = await supabase
    .from("portal_projects")
    .select("id")
    .eq("id", row.project_id)
    .eq("organization_id", ctx.organization.id)
    .eq("customer_visible", true)
    .maybeSingle();
  if (!project) return { error: "Project niet gevonden." };

  const reason = sanitizeFeedbackBody(parsed.data.reason);
  const { data: updated, error } = await supabase
    .from("portal_project_deliverables")
    .update({
      status: "REJECTED",
      rejected_at: new Date().toISOString(),
      rejected_by: ctx.user.id,
      rejection_reason: reason,
      approved_at: null,
      approved_by: null,
      version: row.version + 1,
    })
    .eq("id", row.id)
    .eq("version", parsed.data.expectedVersion)
    .select("id")
    .maybeSingle();

  if (error || !updated) {
    return { error: "Afwijzen mislukt (versieconflict?)." };
  }

  await recordCustomerActivity({
    projectId: row.project_id,
    actorUserId: ctx.user.id,
    activityType: "deliverable.rejected",
    summary: "Oplevering afgewezen",
    metadata: { deliverableId: row.id },
  });

  await writeAuditLog({
    userId: ctx.user.id,
    action: "portal.project_deliverable_rejected",
    metadata: {
      projectId: row.project_id,
      deliverableId: row.id,
      organizationId: ctx.organization.id,
    },
  });

  revalidatePath(`/portal/projecten/${row.project_id}`);
  revalidatePath(`/admin/projects/${row.project_id}`);
  return { success: true, message: "Oplevering afgewezen." };
}

export async function submitProjectFeedbackAction(
  _prev: PortalActionState,
  formData: FormData,
): Promise<PortalActionState> {
  if (!(await verifyOrigin())) return { error: "Verzoek geweigerd." };

  const parsed = feedbackSchema.safeParse({
    projectId: formData.get("projectId"),
    deliverableId: formData.get("deliverableId") || "",
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige feedback." };
  }

  const ctx = await requireCustomer();
  if (!hasCustomerPermission(ctx.customerRole, "portal.projects.feedback")) {
    return deny();
  }

  const limited = await checkRateLimit("portal-project-feedback", ctx.user.id);
  if (!limited.success) {
    return { error: "Te veel pogingen. Probeer later opnieuw." };
  }

  const body = sanitizeFeedbackBody(parsed.data.body);
  if (body.length < 2) return { error: "Feedback is te kort." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { error: "Database niet beschikbaar." };

  const { data: project } = await supabase
    .from("portal_projects")
    .select("id, organization_id")
    .eq("id", parsed.data.projectId)
    .eq("organization_id", ctx.organization.id)
    .eq("customer_visible", true)
    .is("archived_at", null)
    .maybeSingle();
  if (!project) return { error: "Project niet gevonden." };

  let deliverableId: string | null = null;
  if (parsed.data.deliverableId) {
    const { data: d } = await supabase
      .from("portal_project_deliverables")
      .select("id")
      .eq("id", parsed.data.deliverableId)
      .eq("project_id", project.id)
      .eq("customer_visible", true)
      .maybeSingle();
    if (!d) return { error: "Oplevering niet gevonden." };
    deliverableId = d.id;
  }

  const { error } = await supabase.from("portal_project_feedback").insert({
    project_id: project.id,
    deliverable_id: deliverableId,
    author_user_id: ctx.user.id,
    organization_id: ctx.organization.id,
    body,
    visibility: "CUSTOMER_SHARED",
    status: "OPEN",
    decision: "COMMENT",
  });

  if (error) return { error: "Feedback opslaan mislukt." };

  await recordCustomerActivity({
    projectId: project.id,
    actorUserId: ctx.user.id,
    activityType: "feedback.created",
    summary: "Feedback geplaatst",
    metadata: { deliverableId },
  });

  await writeAuditLog({
    userId: ctx.user.id,
    action: "portal.project_feedback_created",
    metadata: {
      projectId: project.id,
      organizationId: ctx.organization.id,
      deliverableId,
    },
  });

  revalidatePath(`/portal/projecten/${project.id}`);
  revalidatePath(`/admin/projects/${project.id}`);
  return { success: true, message: "Feedback geplaatst." };
}
