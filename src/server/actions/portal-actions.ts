"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCustomer } from "@/server/auth/require-customer";
import { createServiceRoleClient } from "@/lib/database/server";
import { verifyOrigin } from "@/lib/security/origin";
import { writeAuditLog } from "@/lib/security/audit-log";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { hasCustomerPermission } from "@/lib/auth/customer-permissions";

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

/** Offerte accepteren/afwijzen — geen Mollie, geen checkout. */
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
  if (!hasCustomerPermission(ctx.customerRole, "portal.quotes.respond")) {
    return denyPortalPermission();
  }
  const limited = await checkRateLimit("portal-quote", ctx.user.id);
  if (!limited.success) {
    return { error: "Te veel pogingen. Probeer later opnieuw." };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return { error: "Database niet beschikbaar." };

  const { data: quote } = await supabase
    .from("portal_quotes")
    .select("id, status, organization_id, version, terms_version")
    .eq("id", parsed.data.quoteId)
    .eq("organization_id", ctx.organization.id)
    .maybeSingle();

  if (!quote || (quote.status !== "SENT" && quote.status !== "VIEWED")) {
    return { error: "Deze offerte kan nu niet worden beantwoord." };
  }

  const now = new Date().toISOString();
  const update =
    parsed.data.decision === "ACCEPT"
      ? {
          status: "ACCEPTED",
          accepted_at: now,
          declined_at: null,
          accepted_by: ctx.user.id,
          customer_note: parsed.data.note ?? null,
          version: (quote.version ?? 1) + 1,
        }
      : {
          status: "DECLINED",
          declined_at: now,
          accepted_at: null,
          accepted_by: null,
          customer_note: parsed.data.note ?? null,
          version: (quote.version ?? 1) + 1,
        };

  const { error } = await supabase
    .from("portal_quotes")
    .update(update)
    .eq("id", quote.id)
    .eq("version", quote.version ?? 1);

  if (error) {
    return { error: "Opslaan mislukt. Probeer opnieuw." };
  }

  await writeAuditLog({
    userId: ctx.user.id,
    action:
      parsed.data.decision === "ACCEPT"
        ? "portal.quote_accepted"
        : "portal.quote_declined",
    metadata: {
      quoteId: quote.id,
      organizationId: ctx.organization.id,
      termsVersion: quote.terms_version ?? null,
    },
  });

  revalidatePath("/portal/offertes");
  revalidatePath(`/portal/offertes/${quote.id}`);
  return {
    success: true,
    message:
      parsed.data.decision === "ACCEPT"
        ? "Offerte geaccepteerd. Er is geen betaling gestart."
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
