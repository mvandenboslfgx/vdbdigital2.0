"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/database/server";
import { writeAuditLog } from "@/lib/security/audit-log";
import { verifyOrigin } from "@/lib/security/origin";
import { quoteHeaderTotals, lineTotals } from "@/lib/commerce/quote-money";
import {
  assertQuoteCanBeSent,
  assertQuoteExpectedVersion,
} from "@/lib/commerce/quote-status";
import { requireAdmin } from "@/server/auth/require-admin";
import { requirePermission } from "@/server/auth/require-permission";

export type QuoteActionState = {
  error?: string;
  message?: string;
  success?: boolean;
};

const itemSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  itemType: z.enum(["SERVICE", "PRODUCT", "ADDON", "DISCOUNT", "CUSTOM"]),
  quantity: z.coerce.number().positive(),
  unitLabel: z.string().trim().min(1).max(40).default("stuk"),
  unitPriceCents: z.coerce.number().int(),
  discountCents: z.coerce.number().int().min(0).default(0),
  taxRateBasisPoints: z.coerce.number().int().min(0).max(10000).default(2100),
  isOptional: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

const quoteMetaSchema = z.object({
  organizationId: z.string().uuid(),
  projectId: z.string().uuid().optional().or(z.literal("")),
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  validUntil: z.string().optional().or(z.literal("")),
  termsVersion: z.string().trim().max(80).optional().or(z.literal("")),
  discountCents: z.coerce.number().int().min(0).default(0),
  currency: z.literal("EUR").default("EUR"),
});

function revalidateQuotes(quoteId?: string) {
  revalidatePath("/admin/quotes");
  revalidatePath("/portal/offertes");
  if (quoteId) {
    revalidatePath(`/admin/quotes/${quoteId}`);
    revalidatePath(`/portal/offertes/${quoteId}`);
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

export async function createQuoteAction(
  _prev: QuoteActionState,
  formData: FormData,
): Promise<QuoteActionState> {
  if (!(await verifyOrigin())) return { error: "Verzoek geweigerd." };
  const ctx = await requireAdmin();
  await requirePermission(ctx, "quotes.create");

  const meta = quoteMetaSchema.safeParse({
    organizationId: formData.get("organizationId"),
    projectId: formData.get("projectId") || "",
    title: formData.get("title"),
    description: formData.get("description") || "",
    validUntil: formData.get("validUntil") || "",
    termsVersion: formData.get("termsVersion") || "",
    discountCents: formData.get("discountCents") || 0,
  });
  if (!meta.success) return { error: "Controleer de offertegegevens." };

  const items = parseItemsFromForm(formData);
  if (!items) return { error: "Voeg minimaal één geldige regel toe." };

  const totals = quoteHeaderTotals(
    items.map((i) => ({
      quantity: i.quantity,
      unitPriceCents: i.unitPriceCents,
      discountCents: i.discountCents,
      taxRateBasisPoints: i.taxRateBasisPoints,
      isOptional: i.isOptional,
      isSelected: !i.isOptional,
    })),
    meta.data.discountCents,
  );
  if (totals.totalCents < 0) return { error: "Negatief totaal is niet toegestaan." };

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

  const { data: numberRow } = await supabase.rpc("generate_portal_quote_number");
  const quoteNumber =
    typeof numberRow === "string" && numberRow
      ? numberRow
      : `OFF-TMP-${Date.now()}`;

  const { data: quote, error } = await supabase
    .from("portal_quotes")
    .insert({
      organization_id: org.id,
      project_id: projectId,
      quote_number: quoteNumber,
      title: meta.data.title,
      description: meta.data.description || null,
      status: "DRAFT",
      currency: "EUR",
      subtotal_cents: totals.subtotalCents,
      discount_cents: totals.discountCents,
      vat_cents: totals.taxCents,
      total_cents: totals.totalCents,
      valid_until: meta.data.validUntil || null,
      terms_version: meta.data.termsVersion || null,
      created_by: ctx.user.id,
      version: 1,
    })
    .select("id")
    .single();

  if (error || !quote) return { error: "Offerte opslaan mislukt." };

  const rows = items.map((i, idx) => {
    const t = lineTotals(i);
    return {
      quote_id: quote.id,
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
      is_optional: i.isOptional,
      is_selected: !i.isOptional,
    };
  });

  const { error: itemsError } = await supabase
    .from("portal_quote_items")
    .insert(rows);
  if (itemsError) {
    await supabase.from("portal_quotes").delete().eq("id", quote.id);
    return { error: "Offerteregels opslaan mislukt." };
  }

  await writeAuditLog({
    userId: ctx.user.id,
    action: "admin.quote_created",
    metadata: { quoteId: quote.id, quoteNumber },
  });

  revalidateQuotes(quote.id);
  redirect(`/admin/quotes/${quote.id}`);
}

export async function updateQuoteAction(
  _prev: QuoteActionState,
  formData: FormData,
): Promise<QuoteActionState> {
  if (!(await verifyOrigin())) return { error: "Verzoek geweigerd." };
  const ctx = await requireAdmin();
  await requirePermission(ctx, "quotes.edit");

  const quoteId = String(formData.get("quoteId") || "");
  const expectedVersion = Number(formData.get("expectedVersion") || 0);
  if (!quoteId || !expectedVersion) return { error: "Ongeldige aanvraag." };

  const meta = quoteMetaSchema.omit({ organizationId: true }).safeParse({
    projectId: formData.get("projectId") || "",
    title: formData.get("title"),
    description: formData.get("description") || "",
    validUntil: formData.get("validUntil") || "",
    termsVersion: formData.get("termsVersion") || "",
    discountCents: formData.get("discountCents") || 0,
  });
  if (!meta.success) return { error: "Controleer de offertegegevens." };

  const items = parseItemsFromForm(formData);
  if (!items) return { error: "Voeg minimaal één geldige regel toe." };

  const totals = quoteHeaderTotals(
    items.map((i) => ({
      quantity: i.quantity,
      unitPriceCents: i.unitPriceCents,
      discountCents: i.discountCents,
      taxRateBasisPoints: i.taxRateBasisPoints,
      isOptional: i.isOptional,
      isSelected: !i.isOptional,
    })),
    meta.data.discountCents,
  );

  const supabase = createServiceRoleClient();
  if (!supabase) return { error: "Database niet beschikbaar." };

  const { data: existing } = await supabase
    .from("portal_quotes")
    .select("id, status, organization_id, version")
    .eq("id", quoteId)
    .maybeSingle();
  if (!existing) return { error: "Offerte niet gevonden." };
  if (!["DRAFT", "IN_REVIEW", "READY"].includes(existing.status)) {
    return { error: "Verzonden offertes bewerk je via een nieuwe versie." };
  }

  const { data: updated, error } = await supabase
    .from("portal_quotes")
    .update({
      title: meta.data.title,
      description: meta.data.description || null,
      project_id: meta.data.projectId || null,
      valid_until: meta.data.validUntil || null,
      terms_version: meta.data.termsVersion || null,
      discount_cents: totals.discountCents,
      subtotal_cents: totals.subtotalCents,
      vat_cents: totals.taxCents,
      total_cents: totals.totalCents,
      version: existing.version + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", quoteId)
    .eq("version", expectedVersion)
    .select("id")
    .maybeSingle();

  if (error || !updated) {
    return { error: "Opslaan mislukt (versieconflict?)." };
  }

  await supabase.from("portal_quote_items").delete().eq("quote_id", quoteId);
  await supabase.from("portal_quote_items").insert(
    items.map((i, idx) => {
      const t = lineTotals(i);
      return {
        quote_id: quoteId,
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
        is_optional: i.isOptional,
        is_selected: !i.isOptional,
      };
    }),
  );

  await writeAuditLog({
    userId: ctx.user.id,
    action: "admin.quote_updated",
    metadata: { quoteId },
  });

  revalidateQuotes(quoteId);
  return { success: true, message: "Offerte opgeslagen." };
}

export async function markQuoteReadyAction(formData: FormData) {
  const ctx = await requireAdmin();
  await requirePermission(ctx, "quotes.review");
  if (!(await verifyOrigin())) redirect("/admin/quotes");

  const quoteId = String(formData.get("quoteId") || "");
  const expectedVersion = Number(formData.get("expectedVersion") || 0);
  const supabase = createServiceRoleClient();
  if (!supabase || !quoteId) redirect("/admin/quotes");

  const { data: q } = await supabase
    .from("portal_quotes")
    .select("id, status, terms_version, total_cents, version")
    .eq("id", quoteId)
    .maybeSingle();
  if (!q || !["DRAFT", "IN_REVIEW"].includes(q.status)) {
    redirect(`/admin/quotes/${quoteId}?fout=status`);
  }
  if (!q.terms_version) redirect(`/admin/quotes/${quoteId}?fout=voorwaarden`);
  if (q.total_cents < 0) redirect(`/admin/quotes/${quoteId}?fout=totaal`);

  await supabase
    .from("portal_quotes")
    .update({
      status: "READY",
      version: expectedVersion + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", quoteId)
    .eq("version", expectedVersion);

  await writeAuditLog({
    userId: ctx.user.id,
    action: "admin.quote_ready",
    metadata: { quoteId },
  });
  revalidateQuotes(quoteId);
  redirect(`/admin/quotes/${quoteId}`);
}

export async function sendQuoteAction(formData: FormData) {
  const ctx = await requireAdmin();
  await requirePermission(ctx, "quotes.send");
  if (!(await verifyOrigin())) redirect("/admin/quotes");

  const quoteId = String(formData.get("quoteId") || "");
  const expectedVersion = Number(formData.get("expectedVersion") || 0);
  const supabase = createServiceRoleClient();
  if (!supabase || !quoteId) redirect("/admin/quotes");

  const { data: q } = await supabase
    .from("portal_quotes")
    .select("*, items:portal_quote_items(*)")
    .eq("id", quoteId)
    .maybeSingle();

  if (!q) {
    redirect(`/admin/quotes/${quoteId}?fout=status`);
  }
  const sendGate = assertQuoteCanBeSent(q.status);
  if (!sendGate.ok) {
    redirect(`/admin/quotes/${quoteId}?fout=status`);
  }
  if (!q.terms_version) redirect(`/admin/quotes/${quoteId}?fout=voorwaarden`);
  if (!assertQuoteExpectedVersion(q.version, expectedVersion)) {
    redirect(`/admin/quotes/${quoteId}?fout=versie`);
  }

  const items = (q.items as unknown[]) ?? [];
  if (items.length === 0 && q.total_cents <= 0) {
    redirect(`/admin/quotes/${quoteId}?fout=regels`);
  }

  const versionNumber = (q.current_version_number ?? 0) + 1;
  const snapshot = {
    quote_number: q.quote_number,
    title: q.title,
    description: q.description,
    currency: q.currency,
    subtotal_cents: q.subtotal_cents,
    discount_cents: q.discount_cents,
    vat_cents: q.vat_cents,
    total_cents: q.total_cents,
    valid_until: q.valid_until,
    terms_version: q.terms_version,
    organization_id: q.organization_id,
    project_id: q.project_id,
    items,
  };
  const snapshotChecksum = createHash("sha256")
    .update(JSON.stringify(snapshot))
    .digest("hex");

  const { data: versionRow, error: versionError } = await supabase
    .from("portal_quote_versions")
    .insert({
      quote_id: quoteId,
      version_number: versionNumber,
      status: "SENT",
      snapshot,
      snapshot_checksum: snapshotChecksum,
      created_by: ctx.user.id,
    })
    .select("id")
    .single();

  if (versionError || !versionRow) {
    redirect(`/admin/quotes/${quoteId}?fout=snapshot`);
  }

  const { data: updated, error } = await supabase
    .from("portal_quotes")
    .update({
      status: "SENT",
      sent_at: new Date().toISOString(),
      sent_by: ctx.user.id,
      current_version_number: versionNumber,
      version: expectedVersion + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", quoteId)
    .eq("version", expectedVersion)
    .select("id, organization_id, project_id")
    .maybeSingle();

  if (error || !updated) {
    await supabase.from("portal_quote_versions").delete().eq("id", versionRow.id);
    redirect(`/admin/quotes/${quoteId}?fout=verzenden`);
  }

  const { data: members } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", updated.organization_id)
    .eq("status", "ACTIVE");
  if (members?.length) {
    await supabase.from("portal_notifications").insert(
      members.map((m) => ({
        user_id: m.user_id,
        organization_id: updated.organization_id,
        type: "quote.sent",
        title: "Nieuwe offerte",
        body: "Er is een offerte voor je klaargezet.",
        href: `/portal/offertes/${quoteId}`,
        email_status: "SKIPPED",
      })),
    );
  }

  if (updated.project_id) {
    await supabase.from("portal_project_activity").insert({
      project_id: updated.project_id,
      actor_user_id: ctx.user.id,
      activity_type: "quote.sent",
      summary: "Offerte verzonden",
      visibility: "CUSTOMER_VISIBLE",
      metadata_safe: { quoteId },
    });
  }

  await writeAuditLog({
    userId: ctx.user.id,
    action: "admin.quote_sent",
    metadata: { quoteId, versionNumber },
  });

  revalidateQuotes(quoteId);
  redirect(`/admin/quotes/${quoteId}`);
}

export async function withdrawQuoteAction(formData: FormData) {
  const ctx = await requireAdmin();
  await requirePermission(ctx, "quotes.withdraw");
  if (!(await verifyOrigin())) redirect("/admin/quotes");

  const quoteId = String(formData.get("quoteId") || "");
  const expectedVersion = Number(formData.get("expectedVersion") || 0);
  const reason = String(formData.get("reason") || "").trim();
  const supabase = createServiceRoleClient();
  if (!supabase || !quoteId || !reason) redirect("/admin/quotes");

  await supabase
    .from("portal_quotes")
    .update({
      status: "WITHDRAWN",
      withdrawn_at: new Date().toISOString(),
      withdrawn_by: ctx.user.id,
      withdraw_reason: reason,
      version: expectedVersion + 1,
    })
    .eq("id", quoteId)
    .eq("version", expectedVersion)
    .in("status", ["SENT", "VIEWED", "READY"]);

  await writeAuditLog({
    userId: ctx.user.id,
    action: "admin.quote_withdrawn",
    metadata: { quoteId },
  });
  revalidateQuotes(quoteId);
  redirect(`/admin/quotes/${quoteId}`);
}
