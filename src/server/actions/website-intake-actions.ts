"use server";

import { revalidatePath } from "next/cache";
import { requireCustomer } from "@/server/auth/require-customer";
import { createServiceRoleClient } from "@/lib/database/server";
import { emitPlatformEvent } from "@/server/services/platform-events";

export async function submitWebsiteIntakeAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) return { ok: false as const, error: "missing_project" };

  const ctx = await requireCustomer();
  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false as const, error: "database_unavailable" };

  const { data: intake } = await supabase
    .from("website_intakes")
    .select("id, organization_id, status")
    .eq("project_id", projectId)
    .maybeSingle();

  if (!intake || intake.organization_id !== ctx.organization.id) {
    return { ok: false as const, error: "not_found" };
  }

  const payload = {
    companyName: String(formData.get("companyName") ?? "").trim(),
    existingWebsite: String(formData.get("existingWebsite") ?? "").trim(),
    sector: String(formData.get("sector") ?? "").trim(),
    contact: String(formData.get("contact") ?? "").trim(),
    pages: String(formData.get("pages") ?? "").trim(),
    languages: String(formData.get("languages") ?? "").trim(),
    domain: String(formData.get("domain") ?? "").trim(),
    brandingNotes: String(formData.get("brandingNotes") ?? "").trim(),
    features: String(formData.get("features") ?? "").trim(),
    deadline: String(formData.get("deadline") ?? "").trim(),
  };

  if (!payload.companyName || !payload.contact) {
    return { ok: false as const, error: "validation" };
  }

  const { error } = await supabase
    .from("website_intakes")
    .update({
      status: "SUBMITTED",
      payload,
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", intake.id);

  if (error) return { ok: false as const, error: "save_failed" };

  const { data: job } = await supabase
    .from("website_production_jobs")
    .select("spec")
    .eq("project_id", projectId)
    .eq("job_type", "WEBSITE_GENERATE")
    .maybeSingle();
  const previousSpec = (job?.spec ?? {}) as Record<string, unknown>;
  await supabase
    .from("website_production_jobs")
    .update({
      spec: {
        ...previousSpec,
        lifecycle: "READY_FOR_BUILD",
        intakeSubmitted: true,
        productionDeployAllowed: false,
        intake: payload,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("project_id", projectId)
    .eq("job_type", "WEBSITE_GENERATE");

  await emitPlatformEvent({
    eventType: "project.intake_submitted",
    entityType: "website_intakes",
    entityId: intake.id as string,
    idempotencyKey: `project.intake_submitted:${projectId}`,
    payload: { projectId, organizationId: ctx.organization.id },
  });

  revalidatePath("/portal/intake");
  revalidatePath(`/portal/projecten/${projectId}`);
  return { ok: true as const };
}

export async function submitWebsiteReviewAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!projectId) return { ok: false as const, error: "missing_project" };

  const ctx = await requireCustomer();
  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false as const, error: "database_unavailable" };

  const { data: project } = await supabase
    .from("portal_projects")
    .select("id, organization_id")
    .eq("id", projectId)
    .maybeSingle();

  if (!project || project.organization_id !== ctx.organization.id) {
    return { ok: false as const, error: "not_found" };
  }

  if (decision !== "APPROVE" && decision !== "CHANGES") {
    return { ok: false as const, error: "validation" };
  }

  await supabase.from("portal_project_feedback").insert({
    project_id: projectId,
    organization_id: ctx.organization.id,
    author_user_id: ctx.user.id,
    body: body || (decision === "APPROVE" ? "Goedgekeurd" : "Wijziging gevraagd"),
    decision: decision === "APPROVE" ? "APPROVE" : "REJECT",
    visibility: "CUSTOMER_SHARED",
  });

  const lifecycle = decision === "APPROVE" ? "APPROVED" : "REVIEW_REQUIRED";
  await supabase
    .from("website_production_jobs")
    .update({
      status: decision === "APPROVE" ? "pending_review" : "queued",
      spec: {
        lifecycle,
        productionDeployAllowed: false,
        customerDecision: decision,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("project_id", projectId)
    .eq("job_type", "WEBSITE_GENERATE");

  await emitPlatformEvent({
    eventType: decision === "APPROVE" ? "website.approved" : "website.preview_ready",
    entityType: "portal_projects",
    entityId: projectId,
    idempotencyKey: `website.review:${projectId}:${decision}:${Date.now()}`,
    payload: { decision },
  });

  revalidatePath(`/portal/projecten/${projectId}`);
  return { ok: true as const };
}
