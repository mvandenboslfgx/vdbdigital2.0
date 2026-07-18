"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/database/server";
import { writeAuditLog } from "@/lib/security/audit-log";
import { verifyOrigin } from "@/lib/security/origin";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { hasPermission } from "@/lib/auth/permissions";
import { hasCustomerPermission } from "@/lib/auth/customer-permissions";
import {
  documentUploadMetaSchema,
  documentVisibilityUpdateSchema,
} from "@/lib/validation/documents";
import {
  createShortLivedSignedUrl,
  prepareUploadBuffer,
  removeStorageObject,
  uploadToPrivateBucket,
} from "@/lib/storage/portal-documents";
import { requireAdmin } from "@/server/auth/require-admin";
import { requirePermission } from "@/server/auth/require-permission";
import { requireCustomer } from "@/server/auth/require-customer";

export type DocumentActionState = {
  error?: string;
  message?: string;
  success?: boolean;
  downloadUrl?: string;
  expiresIn?: number;
};

function mapUploadError(code: string): string {
  switch (code) {
    case "EMPTY_FILE":
      return "Het bestand is leeg.";
    case "MIME_NOT_ALLOWED":
    case "MIME_MISMATCH":
      return "Dit bestandstype is niet toegestaan.";
    case "FILE_TOO_LARGE":
      return "Het bestand is te groot.";
    case "INVALID_FILENAME":
    case "DOUBLE_EXTENSION":
    case "BLOCKED_EXTENSION":
      return "De bestandsnaam is niet toegestaan.";
    default:
      return "Upload is niet gelukt. Probeer het opnieuw.";
  }
}

async function recordProjectActivity(input: {
  projectId: string | null | undefined;
  actorUserId: string;
  summary: string;
  visibility: "INTERNAL" | "CUSTOMER_VISIBLE";
  metadata?: Record<string, unknown>;
}) {
  if (!input.projectId) return;
  const supabase = createServiceRoleClient();
  if (!supabase) return;
  await supabase.from("portal_project_activity").insert({
    project_id: input.projectId,
    actor_user_id: input.actorUserId,
    activity_type: "document.event",
    summary: input.summary,
    visibility: input.visibility,
    metadata_safe: input.metadata ?? {},
  });
}

async function notifyOrg(input: {
  organizationId: string;
  title: string;
  body: string;
  href: string;
  type: string;
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

function revalidateDocs(organizationId?: string, projectId?: string | null) {
  revalidatePath("/admin/documents");
  revalidatePath("/admin/files");
  revalidatePath("/portal/documenten");
  if (projectId) {
    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath(`/portal/projecten/${projectId}`);
  }
  void organizationId;
}

export async function uploadDocumentAction(
  _prev: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  if (!(await verifyOrigin())) return { error: "Verzoek geweigerd." };

  const ctx = await requireAdmin();
  await requirePermission(ctx, "documents.upload");

  const limited = await checkRateLimit("documents-upload", ctx.user.id);
  if (!limited.success) {
    return { error: "Te veel uploads. Probeer later opnieuw." };
  }

  const parsed = documentUploadMetaSchema.safeParse({
    organizationId: formData.get("organizationId"),
    projectId: formData.get("projectId") || "",
    deliverableId: formData.get("deliverableId") || "",
    title: formData.get("title"),
    description: formData.get("description") || "",
    category: formData.get("category") || "GENERAL",
    visibility: formData.get("visibility") || "INTERNAL",
    changeSummary: formData.get("changeSummary") || "",
    parentDocumentId: formData.get("parentDocumentId") || "",
    idempotencyKey: formData.get("idempotencyKey") || "",
  });
  if (!parsed.success) {
    return { error: "Controleer de documentgegevens." };
  }

  if (
    parsed.data.visibility === "RESTRICTED" &&
    !hasPermission(ctx.role, "documents.manage_visibility")
  ) {
    return { error: "Je mag RESTRICTED-zichtbaarheid niet instellen." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { error: "Selecteer een bestand." };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return { error: "Database niet beschikbaar." };

  const { data: org } = await supabase
    .from("organizations")
    .select("id, status")
    .eq("id", parsed.data.organizationId)
    .maybeSingle();
  if (!org || org.status === "ARCHIVED") {
    return { error: "Organisatie niet beschikbaar." };
  }

  const projectId = parsed.data.projectId || null;
  if (projectId) {
    const { data: project } = await supabase
      .from("portal_projects")
      .select("id, organization_id")
      .eq("id", projectId)
      .eq("organization_id", org.id)
      .maybeSingle();
    if (!project) return { error: "Project hoort niet bij deze organisatie." };
  }

  const deliverableId = parsed.data.deliverableId || null;
  if (deliverableId) {
    if (!projectId) {
      return { error: "Deliverable vereist een project." };
    }
    const { data: d } = await supabase
      .from("portal_project_deliverables")
      .select("id, project_id")
      .eq("id", deliverableId)
      .eq("project_id", projectId)
      .maybeSingle();
    if (!d) return { error: "Deliverable niet gevonden." };
  }

  const parentId = parsed.data.parentDocumentId || null;
  let versionNumber = 1;
  let rootId: string | null = null;
  if (parentId) {
    await requirePermission(ctx, "documents.manage_versions");
    const { data: parent } = await supabase
      .from("portal_files")
      .select("id, organization_id, parent_document_id, version_number")
      .eq("id", parentId)
      .eq("organization_id", org.id)
      .maybeSingle();
    if (!parent) return { error: "Vorige versie niet gevonden." };
    rootId = parent.parent_document_id ?? parent.id;
    const { data: versions } = await supabase
      .from("portal_files")
      .select("version_number")
      .or(`id.eq.${rootId},parent_document_id.eq.${rootId}`)
      .order("version_number", { ascending: false })
      .limit(1);
    versionNumber = (versions?.[0]?.version_number ?? parent.version_number) + 1;
  }

  if (parsed.data.idempotencyKey) {
    const { data: existing } = await supabase
      .from("portal_files")
      .select("id, status")
      .eq("organization_id", org.id)
      .eq("checksum_sha256", parsed.data.idempotencyKey)
      .eq("status", "AVAILABLE")
      .maybeSingle();
    // idempotency via client key stored temporarily in change_summary prefix if needed — skip
    void existing;
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let prepared;
  try {
    prepared = prepareUploadBuffer({
      fileName: file.name,
      claimedMime: file.type || "application/octet-stream",
      buffer,
      category: parsed.data.category,
      organizationId: org.id,
      projectId,
    });
  } catch (e) {
    const code = e instanceof Error ? e.message : "UPLOAD_FAILED";
    await writeAuditLog({
      userId: ctx.user.id,
      action: "admin.document_upload_failed",
      metadata: { organizationId: org.id, reason: code },
    });
    return { error: mapUploadError(code.split(":")[0] ?? code) };
  }

  // ZIP: staff only already; warn category
  if (
    prepared.mimeType === "application/zip" &&
    !hasPermission(ctx.role, "documents.upload")
  ) {
    return { error: "ZIP-uploads zijn niet toegestaan." };
  }

  const { data: numberRow } = await supabase.rpc(
    "generate_portal_document_number",
  );
  const documentNumber =
    typeof numberRow === "string" && numberRow
      ? numberRow
      : `DOC-TMP-${Date.now()}`;

  const { data: row, error: insertError } = await supabase
    .from("portal_files")
    .insert({
      id: prepared.documentId,
      organization_id: org.id,
      project_id: projectId,
      deliverable_id: deliverableId,
      document_number: documentNumber,
      title: parsed.data.title,
      description: parsed.data.description || null,
      category: parsed.data.category,
      bucket: prepared.bucket,
      storage_path: prepared.storagePath,
      file_name: prepared.safeFilename,
      safe_filename: prepared.safeFilename,
      file_extension: prepared.fileExtension,
      mime_type: prepared.mimeType,
      size_bytes: prepared.sizeBytes,
      checksum_sha256: prepared.checksumSha256,
      visibility: parsed.data.visibility,
      customer_visible:
        parsed.data.visibility === "CUSTOMER_VISIBLE" ||
        parsed.data.visibility === "CUSTOMER_UPLOAD",
      status: "UPLOADING",
      version_number: versionNumber,
      parent_document_id: rootId,
      is_current: true,
      change_summary: parsed.data.changeSummary || null,
      uploaded_by: ctx.user.id,
      scan_status: "NOT_REQUIRED",
      version: 1,
    })
    .select("id")
    .single();

  if (insertError || !row) {
    return { error: "Documentrecord aanmaken mislukt." };
  }

  try {
    await uploadToPrivateBucket(prepared);
  } catch {
    await supabase
      .from("portal_files")
      .update({ status: "REJECTED" })
      .eq("id", row.id);
    await writeAuditLog({
      userId: ctx.user.id,
      action: "admin.document_upload_failed",
      metadata: { documentId: row.id, reason: "storage" },
    });
    return { error: "Opslaan in storage is mislukt." };
  }

  if (rootId) {
    await supabase
      .from("portal_files")
      .update({ is_current: false })
      .or(`id.eq.${rootId},parent_document_id.eq.${rootId}`)
      .neq("id", row.id);
  }

  const { error: availError } = await supabase
    .from("portal_files")
    .update({ status: "AVAILABLE" })
    .eq("id", row.id)
    .eq("status", "UPLOADING");

  if (availError) {
    await removeStorageObject(prepared.bucket, prepared.storagePath);
    await supabase
      .from("portal_files")
      .update({ status: "REJECTED" })
      .eq("id", row.id);
    return { error: "Upload bevestigen mislukt." };
  }

  await writeAuditLog({
    userId: ctx.user.id,
    action: "admin.document_uploaded",
    metadata: {
      documentId: row.id,
      organizationId: org.id,
      projectId,
      versionNumber,
      mimeType: prepared.mimeType,
      sizeBytes: prepared.sizeBytes,
    },
  });

  await recordProjectActivity({
    projectId,
    actorUserId: ctx.user.id,
    summary:
      versionNumber > 1
        ? "Nieuwe documentversie toegevoegd"
        : "Document toegevoegd",
    visibility:
      parsed.data.visibility === "CUSTOMER_VISIBLE" ||
      parsed.data.visibility === "CUSTOMER_UPLOAD"
        ? "CUSTOMER_VISIBLE"
        : "INTERNAL",
    metadata: { documentId: row.id, versionNumber },
  });

  if (
    parsed.data.visibility === "CUSTOMER_VISIBLE" ||
    parsed.data.visibility === "CUSTOMER_UPLOAD"
  ) {
    await notifyOrg({
      organizationId: org.id,
      type: "document.shared",
      title: "Nieuw document beschikbaar",
      body: "Er is een document met je gedeeld.",
      href: `/portal/documenten/${row.id}`,
    });
  }

  revalidateDocs(org.id, projectId);
  return { success: true, message: "Document geüpload." };
}

export async function updateDocumentVisibilityAction(
  _prev: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  if (!(await verifyOrigin())) return { error: "Verzoek geweigerd." };
  const ctx = await requireAdmin();
  await requirePermission(ctx, "documents.manage_visibility");

  const parsed = documentVisibilityUpdateSchema.safeParse({
    documentId: formData.get("documentId"),
    expectedVersion: formData.get("expectedVersion"),
    visibility: formData.get("visibility"),
  });
  if (!parsed.success) return { error: "Ongeldige aanvraag." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { error: "Database niet beschikbaar." };

  const { data: updated, error } = await supabase
    .from("portal_files")
    .update({
      visibility: parsed.data.visibility,
      customer_visible:
        parsed.data.visibility === "CUSTOMER_VISIBLE" ||
        parsed.data.visibility === "CUSTOMER_UPLOAD",
      version: parsed.data.expectedVersion + 1,
    })
    .eq("id", parsed.data.documentId)
    .eq("version", parsed.data.expectedVersion)
    .select("id, organization_id, project_id, visibility")
    .maybeSingle();

  if (error || !updated) {
    return { error: "Zichtbaarheid bijwerken mislukt (versieconflict?)." };
  }

  await writeAuditLog({
    userId: ctx.user.id,
    action: "admin.document_visibility_changed",
    metadata: {
      documentId: updated.id,
      visibility: updated.visibility,
    },
  });

  if (
    updated.visibility === "CUSTOMER_VISIBLE" ||
    updated.visibility === "CUSTOMER_UPLOAD"
  ) {
    await notifyOrg({
      organizationId: updated.organization_id,
      type: "document.shared",
      title: "Document zichtbaar gemaakt",
      body: "Er is een document zichtbaar gemaakt in je portaal.",
      href: `/portal/documenten/${updated.id}`,
    });
    await recordProjectActivity({
      projectId: updated.project_id,
      actorUserId: ctx.user.id,
      summary: "Document klantzichtbaar gemaakt",
      visibility: "CUSTOMER_VISIBLE",
      metadata: { documentId: updated.id },
    });
  }

  revalidateDocs(updated.organization_id, updated.project_id);
  return { success: true, message: "Zichtbaarheid bijgewerkt." };
}

export async function archiveDocumentAction(formData: FormData) {
  const ctx = await requireAdmin();
  await requirePermission(ctx, "documents.archive");
  if (!(await verifyOrigin())) redirect("/admin/documents");

  const documentId = String(formData.get("documentId") || "");
  const expectedVersion = Number(formData.get("expectedVersion") || 0);
  const supabase = createServiceRoleClient();
  if (!supabase || !documentId || !expectedVersion) {
    redirect("/admin/documents");
  }

  const { data } = await supabase
    .from("portal_files")
    .update({
      status: "ARCHIVED",
      archived_at: new Date().toISOString(),
      version: expectedVersion + 1,
    })
    .eq("id", documentId)
    .eq("version", expectedVersion)
    .select("id, organization_id, project_id")
    .maybeSingle();

  if (data) {
    await writeAuditLog({
      userId: ctx.user.id,
      action: "admin.document_archived",
      metadata: { documentId },
    });
    revalidateDocs(data.organization_id, data.project_id);
  }

  redirect(`/admin/documents/${documentId}`);
}

export async function getStaffDocumentDownloadAction(
  documentId: string,
): Promise<DocumentActionState> {
  const ctx = await requireAdmin();
  await requirePermission(ctx, "documents.download_internal");

  const limited = await checkRateLimit("documents-download", ctx.user.id);
  if (!limited.success) {
    return { error: "Te veel downloads. Probeer later opnieuw." };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return { error: "Database niet beschikbaar." };

  const { data: doc } = await supabase
    .from("portal_files")
    .select("*")
    .eq("id", documentId)
    .maybeSingle();

  if (!doc || doc.status === "DELETED" || doc.status === "UPLOADING") {
    return { error: "Document niet beschikbaar." };
  }
  if (doc.status === "QUARANTINED" || doc.status === "REJECTED") {
    return { error: "Document is geblokkeerd voor download." };
  }

  try {
    const signed = await createShortLivedSignedUrl({
      bucket: doc.bucket,
      path: doc.storage_path,
      downloadName: doc.safe_filename || doc.file_name,
    });

    await supabase.from("portal_document_download_events").insert({
      document_id: doc.id,
      organization_id: doc.organization_id,
      actor_user_id: ctx.user.id,
      actor_audience: "STAFF",
    });

    await writeAuditLog({
      userId: ctx.user.id,
      action: "admin.document_downloaded",
      metadata: { documentId: doc.id },
    });

    return {
      success: true,
      downloadUrl: signed.url,
      expiresIn: signed.expiresIn,
    };
  } catch {
    return { error: "Downloadlink genereren mislukt." };
  }
}

export async function getPortalDocumentDownloadAction(
  documentId: string,
): Promise<DocumentActionState> {
  if (!(await verifyOrigin())) return { error: "Verzoek geweigerd." };

  const ctx = await requireCustomer();
  if (!hasCustomerPermission(ctx.customerRole, "portal.documents.download")) {
    return { error: "Je hebt geen downloadrechten." };
  }

  const limited = await checkRateLimit("portal-documents-download", ctx.user.id);
  if (!limited.success) {
    return { error: "Te veel downloads. Probeer later opnieuw." };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return { error: "Database niet beschikbaar." };

  const { data: doc } = await supabase
    .from("portal_files")
    .select("*")
    .eq("id", documentId)
    .eq("organization_id", ctx.organization.id)
    .maybeSingle();

  if (
    !doc ||
    doc.status !== "AVAILABLE" ||
    doc.archived_at ||
    !(
      doc.visibility === "CUSTOMER_VISIBLE" ||
      doc.visibility === "CUSTOMER_UPLOAD"
    ) ||
    (doc.scan_status !== "NOT_REQUIRED" && doc.scan_status !== "CLEAN")
  ) {
    return { error: "Document niet beschikbaar." };
  }

  // BILLING: only quote/invoice categories
  if (
    ctx.customerRole === "BILLING" &&
    doc.category !== "QUOTE" &&
    doc.category !== "INVOICE" &&
    doc.category !== "CONTRACT"
  ) {
    return { error: "Dit documenttype is niet beschikbaar voor je rol." };
  }

  try {
    const signed = await createShortLivedSignedUrl({
      bucket: doc.bucket,
      path: doc.storage_path,
      downloadName: doc.safe_filename || doc.file_name,
    });

    await supabase.from("portal_document_download_events").insert({
      document_id: doc.id,
      organization_id: doc.organization_id,
      actor_user_id: ctx.user.id,
      actor_audience: "CUSTOMER",
    });

    await writeAuditLog({
      userId: ctx.user.id,
      action: "portal.document_downloaded",
      metadata: {
        documentId: doc.id,
        organizationId: ctx.organization.id,
      },
    });

    return {
      success: true,
      downloadUrl: signed.url,
      expiresIn: signed.expiresIn,
    };
  } catch {
    return { error: "Downloadlink genereren mislukt." };
  }
}

export async function uploadPortalDocumentAction(
  _prev: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  if (!(await verifyOrigin())) return { error: "Verzoek geweigerd." };

  const ctx = await requireCustomer();
  if (!hasCustomerPermission(ctx.customerRole, "portal.documents.upload")) {
    return { error: "Je hebt geen uploadrechten." };
  }

  const limited = await checkRateLimit("portal-documents-upload", ctx.user.id);
  if (!limited.success) {
    return { error: "Te veel uploads. Probeer later opnieuw." };
  }

  const projectId = String(formData.get("projectId") || "");
  const title = String(formData.get("title") || "").trim();
  const file = formData.get("file");
  if (!(file instanceof File) || title.length < 2) {
    return { error: "Controleer titel en bestand." };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return { error: "Database niet beschikbaar." };

  let project: { id: string; organization_id: string; customer_visible: boolean; archived_at: string | null } | null =
    null;
  if (projectId) {
    const { data } = await supabase
      .from("portal_projects")
      .select("id, organization_id, customer_visible, archived_at")
      .eq("id", projectId)
      .eq("organization_id", ctx.organization.id)
      .eq("customer_visible", true)
      .maybeSingle();
    project = data;
    if (!project || project.archived_at) {
      return { error: "Project niet beschikbaar voor upload." };
    }
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let prepared;
  try {
    prepared = prepareUploadBuffer({
      fileName: file.name,
      claimedMime: file.type || "application/octet-stream",
      buffer,
      category: projectId ? "PROJECT_FILE" : "GENERAL",
      organizationId: ctx.organization.id,
      projectId: project?.id ?? null,
      bucket: projectId ? "project-files" : "customer-documents",
    });
  } catch (e) {
    const code = e instanceof Error ? e.message : "UPLOAD_FAILED";
    return { error: mapUploadError(code.split(":")[0] ?? code) };
  }

  if (prepared.mimeType === "application/zip") {
    return { error: "ZIP-uploads zijn voor klanten niet toegestaan." };
  }

  const { data: numberRow } = await supabase.rpc(
    "generate_portal_document_number",
  );
  const documentNumber =
    typeof numberRow === "string" && numberRow
      ? numberRow
      : `DOC-TMP-${Date.now()}`;

  const { data: row, error: insertError } = await supabase
    .from("portal_files")
    .insert({
      id: prepared.documentId,
      organization_id: ctx.organization.id,
      project_id: project?.id ?? null,
      document_number: documentNumber,
      title,
      category: projectId ? "PROJECT_FILE" : "GENERAL",
      bucket: prepared.bucket,
      storage_path: prepared.storagePath,
      file_name: prepared.safeFilename,
      safe_filename: prepared.safeFilename,
      file_extension: prepared.fileExtension,
      mime_type: prepared.mimeType,
      size_bytes: prepared.sizeBytes,
      checksum_sha256: prepared.checksumSha256,
      visibility: "CUSTOMER_UPLOAD",
      customer_visible: true,
      status: "UPLOADING",
      version_number: 1,
      is_current: true,
      uploaded_by: ctx.user.id,
      scan_status: "NOT_REQUIRED",
      version: 1,
    })
    .select("id")
    .single();

  if (insertError || !row) {
    return { error: "Upload starten mislukt." };
  }

  try {
    await uploadToPrivateBucket(prepared);
  } catch {
    await supabase
      .from("portal_files")
      .update({ status: "REJECTED" })
      .eq("id", row.id);
    return { error: "Opslaan mislukt." };
  }

  await supabase
    .from("portal_files")
    .update({ status: "AVAILABLE" })
    .eq("id", row.id)
    .eq("status", "UPLOADING");

  await writeAuditLog({
    userId: ctx.user.id,
    action: "portal.document_uploaded",
    metadata: {
      documentId: row.id,
      organizationId: ctx.organization.id,
      projectId: project?.id ?? null,
    },
  });

  await recordProjectActivity({
    projectId: project?.id,
    actorUserId: ctx.user.id,
    summary: "Klant heeft een bestand aangeleverd",
    visibility: "CUSTOMER_VISIBLE",
    metadata: { documentId: row.id },
  });

  revalidateDocs(ctx.organization.id, project?.id);
  return { success: true, message: "Bestand aangeleverd." };
}
