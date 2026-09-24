"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { verifyOrigin } from "@/lib/security/origin";
import { createOrganizationWithInvite } from "@/server/repositories/admin-portal";
import { createServiceRoleClient } from "@/lib/database/server";
import { requireAdmin } from "@/server/auth/require-admin";
import { requirePermission } from "@/server/auth/require-permission";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { writeAuditLog } from "@/lib/security/audit-log";

export type AdminPortalActionState = {
  error?: string;
  inviteUrl?: string;
  message?: string;
  success?: boolean;
};

const createSchema = z.object({
  legalName: z.string().min(2).max(200),
  tradeName: z.string().max(200).optional(),
  type: z.enum(["BUSINESS", "CONSUMER"]),
  contactEmail: z.string().email().max(254),
  inviteEmail: z.string().email().max(254),
});

export async function createCustomerAction(
  _prev: AdminPortalActionState,
  formData: FormData,
): Promise<AdminPortalActionState> {
  if (!(await verifyOrigin())) {
    return { error: "Verzoek geweigerd." };
  }

  const parsed = createSchema.safeParse({
    legalName: formData.get("legalName"),
    tradeName: formData.get("tradeName") || undefined,
    type: formData.get("type"),
    contactEmail: formData.get("contactEmail"),
    inviteEmail: formData.get("inviteEmail"),
  });

  if (!parsed.success) {
    return { error: "Controleer de invoer." };
  }

  try {
    const result = await createOrganizationWithInvite(parsed.data);
    redirect(`/admin/customers/${result.organizationId}?invite=1`);
  } catch (err) {
    // next/navigation redirect throws; rethrow so the framework can handle it
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      typeof (err as { digest?: unknown }).digest === "string" &&
      (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw err;
    }
    return {
      error: err instanceof Error ? err.message : "Aanmaken mislukt.",
    };
  }
}


const adminConversationReplySchema = z.object({
  conversationId: z.string().uuid(),
  body: z.string().trim().min(1).max(5000),
});

export async function replyAdminConversationAction(
  _prev: AdminPortalActionState,
  formData: FormData,
): Promise<AdminPortalActionState> {
  if (!(await verifyOrigin())) return { error: "Verzoek geweigerd." };

  const parsed = adminConversationReplySchema.safeParse({
    conversationId: formData.get("conversationId"),
    body: formData.get("body"),
  });
  if (!parsed.success) return { error: "Bericht is ongeldig." };

  const ctx = await requireAdmin();
  await requirePermission(ctx, "messages.manage");

  const limited = await checkRateLimit("portal-messages", ctx.user.id);
  if (!limited.success) {
    return { error: "Te veel berichten. Probeer later opnieuw." };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return { error: "Berichtenservice niet beschikbaar." };

  const { data: conversation } = await supabase
    .from("portal_conversations")
    .select("id, organization_id, status")
    .eq("id", parsed.data.conversationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!conversation || conversation.status === "CLOSED") {
    return { error: "Dit gesprek is niet beschikbaar." };
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("portal_messages").insert({
    conversation_id: conversation.id,
    author_user_id: ctx.user.id,
    body: parsed.data.body,
    is_internal: false,
    client_message_id: crypto.randomUUID(),
  });

  if (error) return { error: "Bericht kon niet worden geplaatst." };

  await supabase
    .from("portal_conversations")
    .update({ last_message_at: now, updated_at: now })
    .eq("id", conversation.id);

  await writeAuditLog({
    userId: ctx.user.id,
    action: "admin.conversation_replied",
    metadata: {
      conversationId: conversation.id,
      organizationId: conversation.organization_id,
    },
  });

  revalidatePath("/admin/messages");
  revalidatePath(`/admin/messages/${conversation.id}`);
  revalidatePath("/portal/berichten");
  revalidatePath(`/portal/berichten/${conversation.id}`);

  return { success: true, message: "Reactie verzonden." };
}
