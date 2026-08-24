import "server-only";
import { createServiceRoleClient } from "@/lib/database/server";
import { writeAuditLog } from "@/lib/security/audit-log";
import { slugifyProjectName } from "@/lib/validation/projects";
import {
  inferWebsitePackage,
  websiteMilestonesFor,
  websitePackageLabel,
  websiteProjectType,
  websiteTasksFor,
  type WebsitePackage,
} from "@/lib/commerce/website-packages";
import { emitPlatformEvent } from "@/server/services/platform-events";

export type CreateProjectFromOrderResult = {
  ok: boolean;
  duplicate: boolean;
  projectId: string | null;
  organizationId: string | null;
  package: WebsitePackage | null;
  error?: string;
};

type OrderRow = {
  id: string;
  status: string;
  customer_email: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_company: string | null;
  organization_id: string | null;
};

function isPaidEnough(status: string): boolean {
  const s = status.toUpperCase();
  return s === "PAID" || s === "DELIVERED" || s === "FULFILLED";
}

async function resolveOrCreateOrganization(
  supabase: NonNullable<ReturnType<typeof createServiceRoleClient>>,
  order: OrderRow,
): Promise<{ id: string } | { error: string }> {
  if (order.organization_id) {
    return { id: order.organization_id };
  }

  const email = order.customer_email?.trim().toLowerCase();
  if (email) {
    const { data: existing } = await supabase
      .from("organizations")
      .select("id")
      .eq("contact_email", email)
      .neq("status", "ARCHIVED")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing?.id) {
      await supabase.from("orders").update({ organization_id: existing.id }).eq("id", order.id);
      return { id: existing.id as string };
    }
  }

  const legalName =
    order.customer_company?.trim() ||
    `${order.customer_first_name} ${order.customer_last_name}`.trim() ||
    email ||
    `Klant ${order.id.slice(0, 8)}`;

  const { data: org, error } = await supabase
    .from("organizations")
    .insert({
      legal_name: legalName,
      trade_name: order.customer_company?.trim() || null,
      type: order.customer_company?.trim() ? "BUSINESS" : "CONSUMER",
      contact_email: email || null,
      status: "ACTIVE",
    })
    .select("id")
    .single();

  if (error || !org) {
    return { error: error?.message ?? "organization_create_failed" };
  }

  await supabase.from("orders").update({ organization_id: org.id }).eq("id", order.id);

  if (email) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (profile?.id) {
      await supabase.from("organization_members").upsert(
        {
          organization_id: org.id,
          user_id: profile.id,
          customer_role: "PRIMARY",
          status: "ACTIVE",
          is_primary_contact: true,
        },
        { onConflict: "organization_id,user_id" },
      );
    }
  }

  return { id: org.id as string };
}

/**
 * Idempotent: one website project per paid order.
 * Never deploys to production.
 */
export async function createProjectFromOrder(input: {
  orderId: string;
  paymentId?: string;
  productSlug?: string | null;
}): Promise<CreateProjectFromOrderResult> {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return {
      ok: false,
      duplicate: false,
      projectId: null,
      organizationId: null,
      package: null,
      error: "database_unavailable",
    };
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, status, customer_email, customer_first_name, customer_last_name, customer_company, organization_id",
    )
    .eq("id", input.orderId)
    .maybeSingle();

  if (orderError || !order) {
    return {
      ok: false,
      duplicate: false,
      projectId: null,
      organizationId: null,
      package: null,
      error: orderError?.message ?? "order_not_found",
    };
  }

  const typedOrder = order as OrderRow;
  if (!isPaidEnough(typedOrder.status)) {
    return {
      ok: false,
      duplicate: false,
      projectId: null,
      organizationId: typedOrder.organization_id,
      package: null,
      error: "payment_not_confirmed",
    };
  }

  const pkg = inferWebsitePackage(input.productSlug);
  if (!pkg || pkg === "CUSTOM") {
    return {
      ok: false,
      duplicate: false,
      projectId: null,
      organizationId: typedOrder.organization_id,
      package: pkg,
      error: pkg === "CUSTOM" ? "custom_requires_quote" : "not_a_website_package",
    };
  }

  const { data: existing } = await supabase
    .from("portal_projects")
    .select("id, organization_id")
    .eq("source_order_id", input.orderId)
    .maybeSingle();

  if (existing?.id) {
    return {
      ok: true,
      duplicate: true,
      projectId: existing.id as string,
      organizationId: existing.organization_id as string,
      package: pkg,
    };
  }

  const org = await resolveOrCreateOrganization(supabase, typedOrder);
  if ("error" in org) {
    return {
      ok: false,
      duplicate: false,
      projectId: null,
      organizationId: null,
      package: pkg,
      error: org.error,
    };
  }

  const { data: numberRow } = await supabase.rpc("generate_portal_project_number");
  const projectNumber =
    typeof numberRow === "string" && numberRow
      ? numberRow
      : `PRJ-ORD-${input.orderId.slice(0, 8)}`;

  const name = `${websitePackageLabel(pkg)} — ${typedOrder.customer_company || typedOrder.customer_email}`;

  const { data: project, error: projectError } = await supabase
    .from("portal_projects")
    .insert({
      organization_id: org.id,
      project_number: projectNumber,
      name,
      slug: slugifyProjectName(name),
      description: `Automatisch gestart na betaling van order ${input.orderId}. Pakket: ${pkg}.`,
      project_type: websiteProjectType(pkg),
      status: "PLANNED",
      priority: "NORMAL",
      visibility: "CUSTOMER_VISIBLE",
      customer_visible: true,
      source_order_id: input.orderId,
    })
    .select("id")
    .single();

  if (projectError?.code === "23505") {
    const { data: raced } = await supabase
      .from("portal_projects")
      .select("id, organization_id")
      .eq("source_order_id", input.orderId)
      .maybeSingle();
    if (raced?.id) {
      return {
        ok: true,
        duplicate: true,
        projectId: raced.id as string,
        organizationId: raced.organization_id as string,
        package: pkg,
      };
    }
  }

  if (projectError || !project) {
    return {
      ok: false,
      duplicate: false,
      projectId: null,
      organizationId: org.id,
      package: pkg,
      error: projectError?.message ?? "project_insert_failed",
    };
  }

  const milestones = websiteMilestonesFor(pkg).map((m) => ({
    project_id: project.id,
    title: m.title,
    customer_visible: m.customerVisible,
    requires_customer_action: m.requiresCustomerAction,
    sort_order: m.sortOrder,
    status: "NOT_STARTED",
  }));
  if (milestones.length) {
    await supabase.from("portal_project_milestones").insert(milestones);
  }

  const tasks = websiteTasksFor(pkg).map((t) => ({
    project_id: project.id,
    title: t.title,
    description: t.description,
    assigned_to_type: t.assignee,
    status: "OPEN",
    customer_visible: t.customerVisible,
    priority: "NORMAL",
  }));
  if (tasks.length) {
    await supabase.from("portal_project_actions").insert(tasks);
  }

  await supabase.from("website_production_jobs").upsert(
    {
      order_id: input.orderId,
      project_id: project.id,
      job_type: "WEBSITE_GENERATE",
      status: "queued",
      spec: {
        package: pkg,
        orderId: input.orderId,
        paymentId: input.paymentId ?? null,
        siteType: websiteProjectType(pkg),
        pages: pkg === "ONEPAGE" ? ["home"] : ["home", "about", "contact"],
        lifecycle: "READY_FOR_BUILD",
        productionDeployAllowed: false,
      },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "order_id,job_type" },
  );

  await supabase.from("website_intakes").upsert(
    {
      project_id: project.id,
      order_id: input.orderId,
      organization_id: org.id,
      status: "NOT_STARTED",
      payload: {
        package: pkg,
        company: typedOrder.customer_company,
        contactEmail: typedOrder.customer_email,
      },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "project_id" },
  );

  await supabase.from("portal_project_activity").insert({
    project_id: project.id,
    activity_type: "PROJECT_CREATED_FROM_ORDER",
    visibility: "CUSTOMER_VISIBLE",
    summary: `Project automatisch gestart na betaling (${websitePackageLabel(pkg)}).`,
    metadata_safe: { orderId: input.orderId, package: pkg },
  });

  await emitPlatformEvent({
    eventType: "project.created",
    entityType: "portal_projects",
    entityId: project.id as string,
    idempotencyKey: `project.created:${input.orderId}`,
    payload: { orderId: input.orderId, organizationId: org.id, package: pkg },
  });
  await emitPlatformEvent({
    eventType: "project.intake_ready",
    entityType: "website_intakes",
    entityId: project.id as string,
    idempotencyKey: `project.intake_ready:${input.orderId}`,
    payload: { orderId: input.orderId, projectId: project.id },
  });
  await emitPlatformEvent({
    eventType: "website.build_ready",
    entityType: "website_production_jobs",
    entityId: input.orderId,
    idempotencyKey: `website.build_ready:${input.orderId}:WEBSITE_GENERATE`,
    payload: { orderId: input.orderId, projectId: project.id, lifecycle: "READY_FOR_BUILD" },
  });

  await writeAuditLog({
    action: "website_production.project_created",
    resourceType: "portal_projects",
    resourceId: project.id as string,
    metadata: {
      orderId: input.orderId,
      organizationId: org.id,
      package: pkg,
      duplicate: false,
    },
  });

  return {
    ok: true,
    duplicate: false,
    projectId: project.id as string,
    organizationId: org.id,
    package: pkg,
  };
}
