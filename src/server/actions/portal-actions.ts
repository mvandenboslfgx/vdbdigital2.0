"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCustomer } from "@/server/auth/require-customer";
import { createServiceRoleClient, createServerSupabaseClient } from "@/lib/database/server";
import { verifyOrigin } from "@/lib/security/origin";
import { writeAuditLog } from "@/lib/security/audit-log";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { hasCustomerPermission } from "@/lib/auth/customer-permissions";
import { validateSelectedOptionalQuoteItems } from "@/lib/commerce/quote-status";

function denyPortalPermission(): PortalActionState {
  return {
    error: "Je hebt geen rechten voor deze actie binnen je organisatie.",
  };
}

export type PortalActionState = {
  error?: string;
  message?: string;
  success?: boolean;
};

const respondSchema = z.object({
  quoteId: z.string().uuid(),
  decision: z.enum(["ACCEPT", "DECLINE"]),
  note: z.string().max(2000).optional(),
});

const ticketSchema = z.object({
  subject: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  category: z.string().max(80).optional(),
});

const replySchema = z.object({
  ticketId: z.string().uuid(),
  body: z.string().min(1).max(5000),
});

const profileSchema = z.object({
  fullName: z.string().min(2).max(120),
});

/** Offerte accepteren/afwijzen via RPC — digitale offerteacceptatie, geen Mollie. */
export async function respondToQuoteAction(
  _prev: PortalActionState,
  formData: FormData,
): Promise<PortalActionState> {
  if (!(await verifyOrigin())) {
    return { error: "Verzoek geweigerd." };
  }

  const parsed = respondSchema.safeParse({
    quoteId: formData.get("quoteId"),
    decision: formData.get("decision"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { error: "Ongeldige aanvraag." };
  }

  const ctx = await requireCustomer();
  const needsAccept = parsed.data.decision === "ACCEPT";
  if (
    !hasCustomerPermission(
      ctx.customerRole,
      needsAccept ? "portal.quotes.accept" : "portal.quotes.decline",
    )
  ) {
    return denyPortalPermission();
  }
  const limited = await checkRateLimit("portal-quote", ctx.user.id);
  if (!limited.success) {
    return { error: "Te veel pogingen. Probeer later opnieuw." };
  }

  const service = createServiceRoleClient();
  if (!service) return { error: "Database niet beschikbaar." };

  const { data: quote } = await service
    .from("portal_quotes")
    .select(
      "id, status, organization_id, version, terms_version, valid_until, project_id",
    )
    .eq("id", parsed.data.quoteId)
    .eq("organization_id", ctx.organization.id)
    .maybeSingle();

  if (!quote) {
    return { error: "Deze offerte kan nu niet worden beantwoord." };
  }

  if (
    quote.valid_until &&
    quote.valid_until.slice(0, 10) < new Date().toISOString().slice(0, 10)
  ) {
    return { error: "Deze offerte is verlopen en kan niet meer worden geaccepteerd." };
  }

  const userClient = await createServerSupabaseClient();
  if (!userClient) return { error: "Sessie niet beschikbaar." };

  const selectedRaw = String(formData.get("selectedOptionalIds") || "[]");
  let selectedIds: string[] = [];
  try {
    const parsedIds = JSON.parse(selectedRaw);
    if (Array.isArray(parsedIds)) {
      selectedIds = parsedIds.filter((x) => typeof x === "string");
    }
  } catch {
    selectedIds = [];
  }

  if (needsAccept) {
    const { data: itemRows } = await service
      .from("portal_quote_items")
      .select("id, is_optional")
      .eq("quote_id", quote.id);
    const selection = validateSelectedOptionalQuoteItems(
      (itemRows ?? []).map((row) => ({
        id: row.id as string,
        isOptional: Boolean(row.is_optional),
      })),
      selectedIds,
    );
    if (!selection.ok) {
      return {
        error:
          "Ongeldige optionele regels. Alleen bestaande optionele onderdelen mogen worden geselecteerd.",
      };
    }
    selectedIds = selection.selectedIds;
  }

  const { data: rpcRows, error: rpcError } = needsAccept
    ? await userClient.rpc("accept_portal_quote", {
        p_quote_id: quote.id,
        p_expected_version: quote.version,
        p_selected_optional_item_ids: selectedIds,
      })
    : await userClient.rpc("decline_portal_quote", {
        p_quote_id: quote.id,
        p_expected_version: quote.version,
        p_reason: parsed.data.note ?? null,
      });

  if (rpcError) {
    return { error: "Opslaan mislukt. Probeer opnieuw." };
  }

  const row = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows;
  const ok = Boolean(row?.ok);
  const detail = String(row?.detail ?? "");

  if (!ok) {
    const messages: Record<string, string> = {
      EXPIRED: "Deze offerte is verlopen.",
      INVALID_STATUS: "Deze offerte kan nu niet worden beantwoord.",
      VERSION_CONFLICT: "De offerte is ondertussen gewijzigd. Vernieuw de pagina.",
      ROLE_DENIED: "Je hebt geen rechten om te reageren.",
      TERMS_REQUIRED: "Voorwaardenversie ontbreekt.",
      ALREADY_ACCEPTED_OTHER: "Deze offerte is al geaccepteerd.",
      ACCEPTANCE_CONFLICT: "Acceptatie conflicteert. Probeer opnieuw.",
    };
    return { error: messages[detail] ?? "Deze offerte kan nu niet worden beantwoord." };
  }

  if (detail === "ALREADY_ACCEPTED" || detail === "ALREADY_DECLINED") {
    return {
      success: true,
      message: needsAccept
        ? "Offerte was al geaccepteerd. Er is geen betaling gestart."
        : "Offerte was al afgewezen.",
    };
  }

  await writeAuditLog({
    userId: ctx.user.id,
    action: needsAccept ? "portal.quote_accepted" : "portal.quote_declined",
    metadata: {
      quoteId: quote.id,
      organizationId: ctx.organization.id,
      termsVersion: quote.terms_version ?? null,
      detail,
    },
  });

  if (quote.project_id) {
    await service.from("portal_project_activity").insert({
      project_id: quote.project_id,
      actor_user_id: ctx.user.id,
      activity_type: needsAccept ? "quote.accepted" : "quote.declined",
      summary: needsAccept ? "Offerte geaccepteerd" : "Offerte afgewezen",
      visibility: "CUSTOMER_VISIBLE",
      metadata_safe: { quoteId: quote.id },
    });
  }

  revalidatePath("/portal/offertes");
  revalidatePath(`/portal/offertes/${quote.id}`);
  revalidatePath("/admin/quotes");
  return {
    success: true,
    message: needsAccept
      ? "Digitale offerteacceptatie vastgelegd. Er is geen betaling of factuur gestart."
      : "Offerte afgewezen.",
  };
}

export async function createSupportTicketAction(
  _prev: PortalActionState,
  formData: FormData,
): Promise<PortalActionState> {
  if (!(await verifyOrigin())) {
    return { error: "Verzoek geweigerd." };
  }

  const parsed = ticketSchema.safeParse({
    subject: formData.get("subject"),
    description: formData.get("description"),
    category: formData.get("category") || undefined,
  });
  if (!parsed.success) {
    return { error: "Vul een onderwerp en omschrijving in." };
  }

  const ctx = await requireCustomer();
  if (!hasCustomerPermission(ctx.customerRole, "portal.support.create")) {
    return denyPortalPermission();
  }
  const limited = await checkRateLimit("portal-support", ctx.user.id);
  if (!limited.success) {
    return { error: "Te veel tickets. Probeer later opnieuw." };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return { error: "Database niet beschikbaar." };

  const ticketNumber = `T-${Date.now().toString(36).toUpperCase()}`;
  const { data, error } = await supabase
    .from("portal_support_tickets")
    .insert({
      organization_id: ctx.organization.id,
      ticket_number: ticketNumber,
      created_by: ctx.user.id,
      subject: parsed.data.subject,
      description: parsed.data.description,
      category: parsed.data.category ?? "GENERAL",
      status: "OPEN",
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Ticket kon niet worden aangemaakt." };
  }

  await writeAuditLog({
    userId: ctx.user.id,
    action: "portal.ticket_created",
    metadata: { ticketId: data.id, organizationId: ctx.organization.id },
  });

  revalidatePath("/portal/support");
  return { success: true, message: `Ticket ${ticketNumber} is aangemaakt.` };
}

export async function replySupportTicketAction(
  _prev: PortalActionState,
  formData: FormData,
): Promise<PortalActionState> {
  if (!(await verifyOrigin())) {
    return { error: "Verzoek geweigerd." };
  }

  const parsed = replySchema.safeParse({
    ticketId: formData.get("ticketId"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { error: "Reactie is ongeldig." };
  }

  const ctx = await requireCustomer();
  if (!hasCustomerPermission(ctx.customerRole, "portal.support.reply")) {
    return denyPortalPermission();
  }
  const supabase = createServiceRoleClient();
  if (!supabase) return { error: "Database niet beschikbaar." };

  const { data: ticket } = await supabase
    .from("portal_support_tickets")
    .select("id, status")
    .eq("id", parsed.data.ticketId)
    .eq("organization_id", ctx.organization.id)
    .maybeSingle();

  if (!ticket || ticket.status === "CLOSED") {
    return { error: "Dit ticket is niet beschikbaar." };
  }

  const { error } = await supabase.from("portal_support_replies").insert({
    ticket_id: ticket.id,
    author_user_id: ctx.user.id,
    body: parsed.data.body,
    is_internal: false,
  });

  if (error) {
    return { error: "Reactie kon niet worden opgeslagen." };
  }

  await supabase
    .from("portal_support_tickets")
    .update({
      status: "WAITING_FOR_VDB",
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticket.id);

  await writeAuditLog({
    userId: ctx.user.id,
    action: "portal.ticket_replied",
    metadata: { ticketId: ticket.id },
  });

  revalidatePath(`/portal/support/${ticket.id}`);
  return { success: true, message: "Reactie geplaatst." };
}

export async function updatePortalProfileAction(
  _prev: PortalActionState,
  formData: FormData,
): Promise<PortalActionState> {
  if (!(await verifyOrigin())) {
    return { error: "Verzoek geweigerd." };
  }

  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
  });
  if (!parsed.success) {
    return { error: "Vul een geldige naam in." };
  }

  const ctx = await requireCustomer();
  if (!hasCustomerPermission(ctx.customerRole, "portal.profile.edit")) {
    return denyPortalPermission();
  }
  const supabase = createServiceRoleClient();
  if (!supabase) return { error: "Database niet beschikbaar." };

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ctx.user.id);

  if (error) {
    return { error: "Profiel kon niet worden bijgewerkt." };
  }

  revalidatePath("/portal/profiel");
  return { success: true, message: "Profiel opgeslagen." };
}

export async function markNotificationsReadAction(): Promise<PortalActionState> {
  const ctx = await requireCustomer();
  const supabase = createServiceRoleClient();
  if (!supabase) return { error: "Database niet beschikbaar." };

  await supabase
    .from("portal_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", ctx.user.id)
    .is("read_at", null);

  revalidatePath("/portal/meldingen");
  return { success: true, message: "Meldingen gemarkeerd als gelezen." };
}
