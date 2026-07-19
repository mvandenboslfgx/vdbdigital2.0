"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServiceRoleClient, createServerSupabaseClient } from "@/lib/database/server";
import { writeAuditLog } from "@/lib/security/audit-log";
import { verifyOrigin } from "@/lib/security/origin";
import { invoiceHeaderTotals, lineTotals } from "@/lib/commerce/invoice-money";
import {
  assertInvoiceCanBeIssued,
  assertInvoiceExpectedVersion,
} from "@/lib/commerce/invoice-status";
import { requireAdmin } from "@/server/auth/require-admin";
import { requirePermission } from "@/server/auth/require-permission";

export type InvoiceActionState = {
  error?: string;
  message?: string;
  success?: boolean;
};

const itemSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  itemType: z.enum(["SERVICE", "PRODUCT", "ADDON", "DISCOUNT", "CUSTOM", "CREDIT"]),
  quantity: z.coerce.number().refine((n) => Number.isFinite(n) && n !== 0),
  unitLabel: z.string().trim().min(1).max(40).default("stuk"),
  unitPriceCents: z.coerce.number().int(),
  discountCents: z.coerce.number().int().min(0).default(0),
  taxRateBasisPoints: z.coerce.number().int().min(0).max(10000).default(2100),
  sortOrder: z.coerce.number().int().min(0).default(0),
  sourceQuoteItemId: z.string().uuid().optional().or(z.literal("")),
});

const invoiceMetaSchema = z.object({
  organizationId: z.string().uuid(),
  projectId: z.string().uuid().optional().or(z.literal("")),
  quoteId: z.string().uuid().optional().or(z.literal("")),
  invoiceType: z.enum(["INVOICE", "CREDIT_NOTE", "PROFORMA"]).default("INVOICE"),
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  issueDate: z.string().optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
  discountCents: z.coerce.number().int().min(0).default(0),
  currency: z.literal("EUR").default("EUR"),
  paymentInstruction: z.string().trim().max(2000).optional().or(z.literal("")),
  externalAccountingReference: z.string().trim().max(120).optional().or(z.literal("")),
});

function revalidateInvoices(invoiceId?: string) {
  revalidatePath("/admin/invoices");
  revalidatePath("/portal/facturen");
  if (invoiceId) {
    revalidatePath(`/admin/invoices/${invoiceId}`);
    revalidatePath(`/portal/facturen/${invoiceId}`);
  }
}

function parseItemsFromForm(formData: FormData) {
  const raw = String(formData.get("itemsJson") || "[]");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return null;
  const items = [];
  for (const row of parsed) {
    const r = itemSchema.safeParse(row);
    if (!r.success) return null;
    items.push(r.data);
  }
  return items;
}

export async function createInvoiceAction(
  _prev: InvoiceActionState,
  formData: FormData,
): Promise<InvoiceActionState> {
  if (!(await verifyOrigin())) return { error: "Verzoek geweigerd." };
  const ctx = await requireAdmin();
  await requirePermission(ctx, "invoices.create");

  const meta = invoiceMetaSchema.safeParse({
    organizationId: formData.get("organizationId"),
    projectId: formData.get("projectId") || "",
    quoteId: formData.get("quoteId") || "",
    invoiceType: formData.get("invoiceType") || "INVOICE",
    title: formData.get("title"),
    description: formData.get("description") || "",
    issueDate: formData.get("issueDate") || "",
    dueDate: formData.get("dueDate") || "",
    discountCents: formData.get("discountCents") || 0,
    paymentInstruction: formData.get("paymentInstruction") || "",
    externalAccountingReference: formData.get("externalAccountingReference") || "",
  });
  if (!meta.success) return { error: "Controleer de factuurgegevens." };

  const items = parseItemsFromForm(formData);
  if (!items) return { error: "Voeg minimaal één geldige regel toe." };

  const totals = invoiceHeaderTotals(
    items.map((i) => ({
      quantity: Math.abs(i.quantity),
      unitPriceCents: i.unitPriceCents,
      discountCents: i.discountCents,
      taxRateBasisPoints: i.taxRateBasisPoints,
    })),
    meta.data.discountCents,
  );

  if (totals.totalCents < 0 && meta.data.invoiceType !== "CREDIT_NOTE") {
    return { error: "Negatief totaal alleen toegestaan voor creditnota's." };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return { error: "Database niet beschikbaar." };

  const { data: org } = await supabase
    .from("organizations")
    .select("id, status")
    .eq("id", meta.data.organizationId)
    .maybeSingle();
  if (!org || org.status === "ARCHIVED" || org.status === "SUSPENDED") {
    return { error: "Organisatie niet beschikbaar." };
  }

  const projectId = meta.data.projectId || null;
  if (projectId) {
    const { data: p } = await supabase
      .from("portal_projects")
      .select("id")
      .eq("id", projectId)
      .eq("organization_id", org.id)
      .maybeSingle();
    if (!p) return { error: "Project hoort niet bij deze organisatie." };
  }

  const quoteId = meta.data.quoteId || null;
  if (quoteId) {
    const { data: q } = await supabase
      .from("portal_quotes")
      .select("id, status, organization_id")
      .eq("id", quoteId)
      .eq("organization_id", org.id)
      .maybeSingle();
    if (!q) return { error: "Offerte hoort niet bij deze organisatie." };
  }

  const { data: numberRow } = await supabase.rpc("generate_portal_invoice_number", {
    p_type: meta.data.invoiceType,
  });
  const invoiceNumber =
    typeof numberRow === "string" && numberRow
      ? numberRow
      : `FAC-TMP-${Date.now()}`;

  const { data: invoice, error } = await supabase
    .from("portal_invoices")
    .insert({
      organization_id: org.id,
      project_id: projectId,
      quote_id: quoteId,
      invoice_number: invoiceNumber,
      invoice_type: meta.data.invoiceType,
      title: meta.data.title,
      description: meta.data.description || null,
      status: "DRAFT",
      currency: meta.data.currency,
      subtotal_cents: totals.subtotalCents,
      discount_cents: totals.discountCents,
      vat_cents: totals.taxCents,
      total_cents: totals.totalCents,
      amount_paid_cents: 0,
      amount_due_cents: totals.totalCents,
      issue_date: meta.data.issueDate || null,
      due_date: meta.data.dueDate || null,
      payment_instruction: meta.data.paymentInstruction || null,
      external_accounting_reference: meta.data.externalAccountingReference || null,
      customer_visible: false,
      created_by: ctx.user.id,
      version: 1,
    })
    .select("id")
    .single();

  if (error || !invoice) {
    return { error: "Factuur opslaan mislukt." };
  }

  const itemRows = items.map((i, idx) => {
    const t = lineTotals({
      quantity: Math.abs(i.quantity),
      unitPriceCents: i.unitPriceCents,
      discountCents: i.discountCents,
      taxRateBasisPoints: i.taxRateBasisPoints,
    });
    return {
      invoice_id: invoice.id,
      sort_order: i.sortOrder || idx,
      item_type: i.itemType,
      title: i.title,
      description: i.description || null,
      quantity: i.quantity,
      unit_label: i.unitLabel,
      unit_price_cents: i.unitPriceCents,
      discount_cents: i.discountCents,
      tax_rate_basis_points: i.taxRateBasisPoints,
      subtotal_cents: t.subtotalCents,
      tax_cents: t.taxCents,
      total_cents: t.totalCents,
      source_quote_item_id: i.sourceQuoteItemId || null,
    };
  });

  const { error: itemsError } = await supabase
    .from("portal_invoice_items")
    .insert(itemRows);
  if (itemsError) {
    await supabase.from("portal_invoices").delete().eq("id", invoice.id);
    return { error: "Factuurregels opslaan mislukt." };
  }

  await writeAuditLog({
    userId: ctx.user.id,
    action: "admin.invoice_created",
    metadata: { invoiceId: invoice.id, quoteId },
  });

  revalidateInvoices(invoice.id);
  redirect(`/admin/invoices/${invoice.id}`);
}

export async function updateInvoiceAction(
  _prev: InvoiceActionState,
  formData: FormData,
): Promise<InvoiceActionState> {
  if (!(await verifyOrigin())) return { error: "Verzoek geweigerd." };
  const ctx = await requireAdmin();
  await requirePermission(ctx, "invoices.edit");

  const invoiceId = String(formData.get("invoiceId") || "");
  const expectedVersion = Number(formData.get("expectedVersion") || 0);
  if (!invoiceId) {
    return { error: "Ongeldige factuur." };
  }

  const meta = z
    .object({
      projectId: z.string().uuid().optional().or(z.literal("")),
      quoteId: z.string().uuid().optional().or(z.literal("")),
      invoiceType: z.enum(["INVOICE", "CREDIT_NOTE", "PROFORMA"]).default("INVOICE"),
      title: z.string().trim().min(2).max(200),
      description: z.string().trim().max(5000).optional().or(z.literal("")),
      issueDate: z.string().optional().or(z.literal("")),
      dueDate: z.string().optional().or(z.literal("")),
      discountCents: z.coerce.number().int().min(0).default(0),
      currency: z.literal("EUR").default("EUR"),
      paymentInstruction: z.string().trim().max(2000).optional().or(z.literal("")),
      externalAccountingReference: z
        .string()
        .trim()
        .max(120)
        .optional()
        .or(z.literal("")),
    })
    .safeParse({
      projectId: formData.get("projectId") || "",
      quoteId: formData.get("quoteId") || "",
      invoiceType: formData.get("invoiceType") || "INVOICE",
      title: formData.get("title"),
      description: formData.get("description") || "",
      issueDate: formData.get("issueDate") || "",
      dueDate: formData.get("dueDate") || "",
      discountCents: formData.get("discountCents") || 0,
      paymentInstruction: formData.get("paymentInstruction") || "",
      externalAccountingReference: formData.get("externalAccountingReference") || "",
    });
  if (!meta.success) return { error: "Controleer de factuurgegevens." };

  const items = parseItemsFromForm(formData);
  if (!items) return { error: "Voeg minimaal één geldige regel toe." };

  const totals = invoiceHeaderTotals(
    items.map((i) => ({
      quantity: Math.abs(i.quantity),
      unitPriceCents: i.unitPriceCents,
      discountCents: i.discountCents,
      taxRateBasisPoints: i.taxRateBasisPoints,
    })),
    meta.data.discountCents,
  );

  const supabase = createServiceRoleClient();
  if (!supabase) return { error: "Database niet beschikbaar." };

  const { data: existing } = await supabase
    .from("portal_invoices")
    .select("id, status, version, organization_id, amount_paid_cents")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!existing || !["DRAFT", "IN_REVIEW", "READY"].includes(existing.status)) {
    return { error: "Deze factuur kan niet meer worden bewerkt." };
  }
  if (!assertInvoiceExpectedVersion(existing.version, expectedVersion)) {
    return { error: "De factuur is ondertussen gewijzigd. Vernieuw de pagina." };
  }

  const amountDue = Math.max(totals.totalCents - (existing.amount_paid_cents ?? 0), 0);

  const { data: updated, error } = await supabase
    .from("portal_invoices")
    .update({
      title: meta.data.title,
      description: meta.data.description || null,
      project_id: meta.data.projectId || null,
      invoice_type: meta.data.invoiceType,
      subtotal_cents: totals.subtotalCents,
      discount_cents: totals.discountCents,
      vat_cents: totals.taxCents,
      total_cents: totals.totalCents,
      amount_due_cents: amountDue,
      issue_date: meta.data.issueDate || null,
      due_date: meta.data.dueDate || null,
      payment_instruction: meta.data.paymentInstruction || null,
      external_accounting_reference: meta.data.externalAccountingReference || null,
      version: expectedVersion + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoiceId)
    .eq("version", expectedVersion)
    .select("id")
    .maybeSingle();

  if (error || !updated) {
    return { error: "Opslaan mislukt (versieconflict)." };
  }

  await supabase.from("portal_invoice_items").delete().eq("invoice_id", invoiceId);
  await supabase.from("portal_invoice_items").insert(
    items.map((i, idx) => {
      const t = lineTotals({
        quantity: Math.abs(i.quantity),
        unitPriceCents: i.unitPriceCents,
        discountCents: i.discountCents,
        taxRateBasisPoints: i.taxRateBasisPoints,
      });
      return {
        invoice_id: invoiceId,
        sort_order: i.sortOrder || idx,
        item_type: i.itemType,
        title: i.title,
        description: i.description || null,
        quantity: i.quantity,
        unit_label: i.unitLabel,
        unit_price_cents: i.unitPriceCents,
        discount_cents: i.discountCents,
        tax_rate_basis_points: i.taxRateBasisPoints,
        subtotal_cents: t.subtotalCents,
        tax_cents: t.taxCents,
        total_cents: t.totalCents,
        source_quote_item_id: i.sourceQuoteItemId || null,
      };
    }),
  );

  await writeAuditLog({
    userId: ctx.user.id,
    action: "admin.invoice_updated",
    metadata: { invoiceId },
  });

  revalidateInvoices(invoiceId);
  return { success: true, message: "Factuur opgeslagen." };
}

export async function markInvoiceReadyAction(formData: FormData) {
  const ctx = await requireAdmin();
  await requirePermission(ctx, "invoices.review");
  if (!(await verifyOrigin())) redirect("/admin/invoices");

  const invoiceId = String(formData.get("invoiceId") || "");
  const expectedVersion = Number(formData.get("expectedVersion") || 0);
  const supabase = createServiceRoleClient();
  if (!supabase || !invoiceId) redirect("/admin/invoices");

  const { data: inv } = await supabase
    .from("portal_invoices")
    .select("id, status, total_cents, version")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!inv || !["DRAFT", "IN_REVIEW"].includes(inv.status)) {
    redirect(`/admin/invoices/${invoiceId}?fout=status`);
  }
  if (inv.total_cents < 0) redirect(`/admin/invoices/${invoiceId}?fout=totaal`);

  const { count } = await supabase
    .from("portal_invoice_items")
    .select("id", { count: "exact", head: true })
    .eq("invoice_id", invoiceId);
  if (!count) redirect(`/admin/invoices/${invoiceId}?fout=regels`);

  await supabase
    .from("portal_invoices")
    .update({
      status: "READY",
      version: expectedVersion + 1,
      status_updated_by: ctx.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoiceId)
    .eq("version", expectedVersion);

  await writeAuditLog({
    userId: ctx.user.id,
    action: "admin.invoice_ready",
    metadata: { invoiceId },
  });
  revalidateInvoices(invoiceId);
  redirect(`/admin/invoices/${invoiceId}`);
}

export async function issueInvoiceAction(formData: FormData) {
  const ctx = await requireAdmin();
  await requirePermission(ctx, "invoices.issue");
  if (!(await verifyOrigin())) redirect("/admin/invoices");

  const invoiceId = String(formData.get("invoiceId") || "");
  const expectedVersion = Number(formData.get("expectedVersion") || 0);
  const supabase = createServiceRoleClient();
  if (!supabase || !invoiceId) redirect("/admin/invoices");

  const { data: inv } = await supabase
    .from("portal_invoices")
    .select("id, status, version, organization_id, project_id, invoice_number")
    .eq("id", invoiceId)
    .maybeSingle();

  if (!inv) redirect(`/admin/invoices/${invoiceId}?fout=status`);
  const gate = assertInvoiceCanBeIssued(inv.status);
  if (!gate.ok) redirect(`/admin/invoices/${invoiceId}?fout=status`);
  if (!assertInvoiceExpectedVersion(inv.version, expectedVersion)) {
    redirect(`/admin/invoices/${invoiceId}?fout=versie`);
  }

  // Prefer user-JWT RPC; fallback service-role after same checks
  const userClient = await createServerSupabaseClient();
  let ok = false;
  let detail = "";
  if (userClient) {
    const { data } = await userClient.rpc("issue_portal_invoice", {
      p_invoice_id: invoiceId,
      p_expected_version: expectedVersion,
    });
    const row = Array.isArray(data) ? data[0] : data;
    ok = Boolean(row?.ok);
    detail = String(row?.detail ?? "");
  }

  if (!ok && detail !== "ALREADY_ISSUED") {
    // Service-role atomic fallback mirroring RPC (local staff sessions)
    const versionNumber = 1;
    const { data: full } = await supabase
      .from("portal_invoices")
      .select("*, items:portal_invoice_items(*)")
      .eq("id", invoiceId)
      .maybeSingle();
    if (!full || full.status !== "READY") {
      redirect(`/admin/invoices/${invoiceId}?fout=status`);
    }
    const snapshot = {
      invoice_number: full.invoice_number,
      invoice_type: full.invoice_type,
      title: full.title,
      organization_id: full.organization_id,
      currency: full.currency,
      subtotal_cents: full.subtotal_cents,
      discount_cents: full.discount_cents,
      vat_cents: full.vat_cents,
      total_cents: full.total_cents,
      issue_date: full.issue_date,
      due_date: full.due_date,
      payment_instruction: full.payment_instruction,
      items: full.items ?? [],
    };
    const checksum = createHash("sha256")
      .update(JSON.stringify(snapshot))
      .digest("hex");
    const { data: versionRow, error: vErr } = await supabase
      .from("portal_invoice_versions")
      .insert({
        invoice_id: invoiceId,
        version_number: versionNumber,
        status: "OPEN",
        snapshot,
        snapshot_checksum: checksum,
        created_by: ctx.user.id,
      })
      .select("id")
      .single();
    if (vErr || !versionRow) {
      redirect(`/admin/invoices/${invoiceId}?fout=snapshot`);
    }
    const { data: updated, error } = await supabase
      .from("portal_invoices")
      .update({
        status: "OPEN",
        customer_visible: true,
        issued_at: new Date().toISOString(),
        issued_by: ctx.user.id,
        issue_date: full.issue_date || new Date().toISOString().slice(0, 10),
        amount_due_cents: Math.max(
          (full.total_cents ?? 0) - (full.amount_paid_cents ?? 0),
          0,
        ),
        current_version_number: versionNumber,
        version: expectedVersion + 1,
        status_updated_by: ctx.user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoiceId)
      .eq("version", expectedVersion)
      .select("id, organization_id, project_id")
      .maybeSingle();
    if (error || !updated) {
      await supabase.from("portal_invoice_versions").delete().eq("id", versionRow.id);
      redirect(`/admin/invoices/${invoiceId}?fout=uitgeven`);
    }
    ok = true;
    detail = "ISSUED";
    inv.organization_id = updated.organization_id;
    inv.project_id = updated.project_id;
  }

  if (!ok && detail !== "ALREADY_ISSUED") {
    redirect(`/admin/invoices/${invoiceId}?fout=uitgeven`);
  }

  const { data: members } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", inv.organization_id)
    .eq("status", "ACTIVE");
  if (members?.length && detail !== "ALREADY_ISSUED") {
    await supabase.from("portal_notifications").insert(
      members.map((m) => ({
        user_id: m.user_id,
        organization_id: inv.organization_id,
        type: "invoice.issued",
        title: "Nieuwe factuur",
        body: "Er is een factuur voor je klaargezet.",
        href: `/portal/facturen/${invoiceId}`,
        email_status: "SKIPPED",
      })),
    );
  }

  if (inv.project_id && detail !== "ALREADY_ISSUED") {
    await supabase.from("portal_project_activity").insert({
      project_id: inv.project_id,
      actor_user_id: ctx.user.id,
      activity_type: "invoice.issued",
      summary: "Factuur uitgegeven",
      visibility: "CUSTOMER_VISIBLE",
      metadata_safe: { invoiceId },
    });
  }

  await writeAuditLog({
    userId: ctx.user.id,
    action: "admin.invoice_issued",
    metadata: { invoiceId, detail },
  });

  revalidateInvoices(invoiceId);
  redirect(`/admin/invoices/${invoiceId}`);
}

export async function recordInvoicePaymentAction(formData: FormData) {
  const ctx = await requireAdmin();
  await requirePermission(ctx, "invoices.record_payment");
  if (!(await verifyOrigin())) redirect("/admin/invoices");

  const invoiceId = String(formData.get("invoiceId") || "");
  const expectedVersion = Number(formData.get("expectedVersion") || 0);
  const amountEuros = String(formData.get("amountEuros") || "0");
  const paymentDate = String(formData.get("paymentDate") || "");
  const method = String(formData.get("paymentMethod") || "BANK_TRANSFER");
  const externalRef = String(formData.get("externalReference") || "").trim();
  const note = String(formData.get("internalNote") || "").trim();
  const idempotencyKey = String(formData.get("idempotencyKey") || "").trim() || null;

  const amountCents = Math.round(Number(amountEuros.replace(",", ".")) * 100);
  if (!invoiceId || !Number.isFinite(amountCents) || amountCents <= 0) {
    redirect(`/admin/invoices/${invoiceId}?fout=bedrag`);
  }

  const userClient = await createServerSupabaseClient();
  const supabase = createServiceRoleClient();
  if (!supabase) redirect("/admin/invoices");

  let ok = false;
  let detail = "";
  if (userClient) {
    const { data } = await userClient.rpc("record_portal_invoice_payment", {
      p_invoice_id: invoiceId,
      p_expected_version: expectedVersion,
      p_amount_cents: amountCents,
      p_currency: "EUR",
      p_payment_date: paymentDate || new Date().toISOString().slice(0, 10),
      p_payment_method: method,
      p_external_reference: externalRef || null,
      p_internal_note: note || null,
      p_idempotency_key: idempotencyKey,
    });
    const row = Array.isArray(data) ? data[0] : data;
    ok = Boolean(row?.ok);
    detail = String(row?.detail ?? "");
  }

  if (!ok && detail !== "ALREADY_RECORDED") {
    redirect(`/admin/invoices/${invoiceId}?fout=betaling`);
  }

  const { data: inv } = await supabase
    .from("portal_invoices")
    .select("id, organization_id, project_id, status, amount_due_cents")
    .eq("id", invoiceId)
    .maybeSingle();

  if (inv?.project_id && detail !== "ALREADY_RECORDED") {
    await supabase.from("portal_project_activity").insert({
      project_id: inv.project_id,
      actor_user_id: ctx.user.id,
      activity_type:
        inv.status === "PAID" ? "invoice.paid" : "invoice.payment_recorded",
      summary:
        inv.status === "PAID" ? "Factuur volledig betaald" : "Betaling geregistreerd",
      visibility: "CUSTOMER_VISIBLE",
      metadata_safe: { invoiceId, amountCents },
    });
  }

  await writeAuditLog({
    userId: ctx.user.id,
    action: "admin.invoice_payment_recorded",
    metadata: { invoiceId, amountCents, detail },
  });

  revalidateInvoices(invoiceId);
  redirect(`/admin/invoices/${invoiceId}`);
}

export async function reverseInvoicePaymentAction(formData: FormData) {
  const ctx = await requireAdmin();
  await requirePermission(ctx, "invoices.reverse_payment");
  if (!(await verifyOrigin())) redirect("/admin/invoices");

  const invoiceId = String(formData.get("invoiceId") || "");
  const paymentRecordId = String(formData.get("paymentRecordId") || "");
  const expectedVersion = Number(formData.get("expectedVersion") || 0);
  const reversalReason = String(formData.get("reversalReason") || "").trim();
  const correlationId =
    String(formData.get("correlationId") || "").trim() ||
    createHash("sha256")
      .update(`${invoiceId}:${paymentRecordId}:${ctx.user.id}:${Date.now()}`)
      .digest("hex")
      .slice(0, 32);
  const idempotencyKey =
    String(formData.get("reversalIdempotencyKey") || "").trim() ||
    `rev:${paymentRecordId}:${correlationId}`;

  if (!invoiceId || !paymentRecordId) {
    redirect("/admin/invoices?fout=reversal");
  }
  if (reversalReason.length < 3) {
    redirect(`/admin/invoices/${invoiceId}?fout=reden`);
  }

  const userClient = await createServerSupabaseClient();
  const supabase = createServiceRoleClient();
  if (!userClient || !supabase) {
    redirect(`/admin/invoices/${invoiceId}?fout=reversal`);
  }

  const { data } = await userClient.rpc("reverse_portal_invoice_payment", {
    p_invoice_id: invoiceId,
    p_payment_record_id: paymentRecordId,
    p_expected_version: expectedVersion,
    p_reversal_reason: reversalReason,
    p_reversal_idempotency_key: idempotencyKey,
    p_correlation_id: correlationId,
  });

  const row = Array.isArray(data) ? data[0] : data;
  const ok = Boolean(row?.ok);
  const detail = String(row?.detail ?? "");

  if (!ok && detail !== "ALREADY_REVERSED") {
    redirect(`/admin/invoices/${invoiceId}?fout=reversal&detail=${encodeURIComponent(detail)}`);
  }

  const { data: inv } = await supabase
    .from("portal_invoices")
    .select("id, project_id, status, amount_paid_cents, amount_due_cents")
    .eq("id", invoiceId)
    .maybeSingle();

  if (inv?.project_id && detail === "REVERSED") {
    await supabase.from("portal_project_activity").insert({
      project_id: inv.project_id,
      actor_user_id: ctx.user.id,
      activity_type: "invoice.payment_reversed",
      summary: "Administratieve betalingsregistratie teruggedraaid",
      visibility: "INTERNAL",
      metadata_safe: {
        invoiceId,
        paymentRecordId,
        amountPaidCents: inv.amount_paid_cents,
        amountDueCents: inv.amount_due_cents,
        status: inv.status,
      },
    });
  }

  await writeAuditLog({
    userId: ctx.user.id,
    action: "admin.invoice_payment_reversed",
    resourceType: "portal_invoice_payment_records",
    resourceId: paymentRecordId,
    metadata: {
      invoiceId,
      paymentRecordId,
      detail,
      invoiceStatus: row?.invoice_status ?? inv?.status ?? null,
      amountPaidCents: row?.amount_paid_cents ?? inv?.amount_paid_cents ?? null,
      amountDueCents: row?.amount_due_cents ?? inv?.amount_due_cents ?? null,
      correlationId,
      providerRefund: false,
      mollieCall: false,
    },
  });

  revalidateInvoices(invoiceId);
  redirect(`/admin/invoices/${invoiceId}`);
}

export async function createInvoiceFromAcceptedQuoteAction(formData: FormData) {
  const ctx = await requireAdmin();
  await requirePermission(ctx, "invoices.create");
  if (!(await verifyOrigin())) redirect("/admin/invoices");

  const quoteId = String(formData.get("quoteId") || "");
  const supabase = createServiceRoleClient();
  if (!supabase || !quoteId) redirect("/admin/invoices/new");

  const { data: quote } = await supabase
    .from("portal_quotes")
    .select("*, items:portal_quote_items(*)")
    .eq("id", quoteId)
    .maybeSingle();

  if (!quote || quote.status !== "ACCEPTED") {
    redirect(`/admin/quotes/${quoteId}?fout=niet-geaccepteerd`);
  }

  // Warn on existing draft from same quote
  const { data: existingDraft } = await supabase
    .from("portal_invoices")
    .select("id")
    .eq("quote_id", quoteId)
    .eq("status", "DRAFT")
    .maybeSingle();
  if (existingDraft) {
    redirect(`/admin/invoices/${existingDraft.id}?info=bestaand-concept`);
  }

  const items = ((quote.items as Array<Record<string, unknown>>) ?? []).filter(
    (i) => !i.is_optional || i.is_selected,
  );
  if (items.length === 0) {
    redirect(`/admin/quotes/${quoteId}?fout=geen-regels`);
  }

  const { data: numberRow } = await supabase.rpc("generate_portal_invoice_number", {
    p_type: "INVOICE",
  });
  const invoiceNumber =
    typeof numberRow === "string" && numberRow
      ? numberRow
      : `FAC-TMP-${Date.now()}`;

  const { data: version } = await supabase
    .from("portal_quote_versions")
    .select("id")
    .eq("quote_id", quoteId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: invoice, error } = await supabase
    .from("portal_invoices")
    .insert({
      organization_id: quote.organization_id,
      project_id: quote.project_id,
      quote_id: quote.id,
      accepted_quote_version_id: version?.id ?? null,
      invoice_number: invoiceNumber,
      invoice_type: "INVOICE",
      title: quote.title || `Factuur bij ${quote.quote_number}`,
      description: quote.description,
      status: "DRAFT",
      currency: quote.currency || "EUR",
      subtotal_cents: quote.subtotal_cents,
      discount_cents: quote.discount_cents ?? 0,
      vat_cents: quote.vat_cents,
      total_cents: quote.total_cents,
      amount_paid_cents: 0,
      amount_due_cents: quote.total_cents,
      customer_visible: false,
      created_by: ctx.user.id,
      version: 1,
    })
    .select("id")
    .single();

  if (error || !invoice) {
    redirect(`/admin/quotes/${quoteId}?fout=factuur`);
  }

  await supabase.from("portal_invoice_items").insert(
    items.map((i, idx) => ({
      invoice_id: invoice.id,
      sort_order: Number(i.sort_order ?? idx),
      item_type: i.item_type ?? "CUSTOM",
      title: i.title,
      description: i.description ?? null,
      quantity: i.quantity ?? 1,
      unit_label: i.unit_label ?? "stuk",
      unit_price_cents: i.unit_price_cents ?? 0,
      discount_cents: i.discount_cents ?? 0,
      tax_rate_basis_points: i.tax_rate_basis_points ?? 2100,
      subtotal_cents: i.subtotal_cents ?? 0,
      tax_cents: i.tax_cents ?? 0,
      total_cents: i.total_cents ?? 0,
      source_quote_item_id: i.id,
    })),
  );

  await writeAuditLog({
    userId: ctx.user.id,
    action: "admin.invoice_from_quote",
    metadata: {
      invoiceId: invoice.id,
      quoteId,
      quoteVersionId: version?.id ?? null,
    },
  });

  revalidateInvoices(invoice.id);
  redirect(`/admin/invoices/${invoice.id}/edit`);
}

export async function createCreditNoteAction(formData: FormData) {
  const ctx = await requireAdmin();
  await requirePermission(ctx, "invoices.create_credit_note");
  if (!(await verifyOrigin())) redirect("/admin/invoices");

  const sourceInvoiceId = String(formData.get("invoiceId") || "");
  const supabase = createServiceRoleClient();
  if (!supabase || !sourceInvoiceId) redirect("/admin/invoices");

  const { data: source } = await supabase
    .from("portal_invoices")
    .select("*, items:portal_invoice_items(*)")
    .eq("id", sourceInvoiceId)
    .maybeSingle();

  if (
    !source ||
    !["ISSUED", "OPEN", "PARTIALLY_PAID", "PAID", "OVERDUE"].includes(source.status)
  ) {
    redirect(`/admin/invoices/${sourceInvoiceId}?fout=credit`);
  }

  const { data: numberRow } = await supabase.rpc("generate_portal_invoice_number", {
    p_type: "CREDIT_NOTE",
  });
  const invoiceNumber =
    typeof numberRow === "string" && numberRow
      ? numberRow
      : `CN-TMP-${Date.now()}`;

  const { data: credit, error } = await supabase
    .from("portal_invoices")
    .insert({
      organization_id: source.organization_id,
      project_id: source.project_id,
      quote_id: source.quote_id,
      credits_invoice_id: source.id,
      invoice_number: invoiceNumber,
      invoice_type: "CREDIT_NOTE",
      title: `Creditnota bij ${source.invoice_number}`,
      description: source.description,
      status: "DRAFT",
      currency: source.currency,
      subtotal_cents: source.subtotal_cents,
      discount_cents: source.discount_cents ?? 0,
      vat_cents: source.vat_cents,
      total_cents: source.total_cents,
      amount_paid_cents: 0,
      amount_due_cents: source.total_cents,
      customer_visible: false,
      created_by: ctx.user.id,
      version: 1,
    })
    .select("id")
    .single();

  if (error || !credit) {
    redirect(`/admin/invoices/${sourceInvoiceId}?fout=credit`);
  }

  const items = (source.items as Array<Record<string, unknown>>) ?? [];
  if (items.length) {
    await supabase.from("portal_invoice_items").insert(
      items.map((i, idx) => ({
        invoice_id: credit.id,
        sort_order: Number(i.sort_order ?? idx),
        item_type: "CREDIT",
        title: i.title,
        description: i.description ?? null,
        quantity: i.quantity ?? 1,
        unit_label: i.unit_label ?? "stuk",
        unit_price_cents: i.unit_price_cents ?? 0,
        discount_cents: i.discount_cents ?? 0,
        tax_rate_basis_points: i.tax_rate_basis_points ?? 2100,
        subtotal_cents: i.subtotal_cents ?? 0,
        tax_cents: i.tax_cents ?? 0,
        total_cents: i.total_cents ?? 0,
      })),
    );
  }

  await writeAuditLog({
    userId: ctx.user.id,
    action: "admin.credit_note_created",
    metadata: { creditNoteId: credit.id, sourceInvoiceId },
  });

  revalidateInvoices(credit.id);
  redirect(`/admin/invoices/${credit.id}/edit`);
}
