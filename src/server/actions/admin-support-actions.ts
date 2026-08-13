"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/server/auth/require-admin";
import { requirePermission } from "@/server/auth/require-permission";
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from "@/lib/database/server";
import { verifyOrigin } from "@/lib/security/origin";
import { writeAuditLog } from "@/lib/security/audit-log";
import { checkRateLimit } from "@/lib/security/rate-limit";

export type AdminSupportActionState = {
  error?: string;
  message?: string;
  success?: boolean;
};

const replySchema = z.object({
  ticketId: z.string().uuid(),
  body: z.string().min(1).max(5000),
});

const statusSchema = z.object({
  ticketId: z.string().uuid(),
  toStatus: z.enum([
    "OPEN",
    "IN_PROGRESS",
    "WAITING_FOR_CUSTOMER",
    "WAITING_FOR_VDB",
    "RESOLVED",
    "CLOSED",
  ]),
});

async function assertSupportManage() {
  const ctx = await requireAdmin();
  await requirePermission(ctx, "support.manage");
  return ctx;
}

export async function adminReplySupportTicketAction(
  _prev: AdminSupportActionState,
  formData: FormData,
): Promise<AdminSupportActionState> {
  if (!(await verifyOrigin())) return { error: "Verzoek geweigerd." };
  const parsed = replySchema.safeParse({
    ticketId: formData.get("ticketId"),
    body: formData.get("body"),
  });
  if (!parsed.success) return { error: "Ongeldige reactie." };

  const ctx = await assertSupportManage();
  const limited = await checkRateLimit("admin-support-reply", ctx.user.id);
  if (!limited.success) return { error: "Te veel pogingen. Probeer later opnieuw." };

  const userClient = await createServerSupabaseClient();
  if (!userClient) return { error: "Database niet beschikbaar." };

  const { error } = await userClient.rpc("reply_portal_support_ticket", {
    p_ticket_id: parsed.data.ticketId,
    p_body: parsed.data.body.trim(),
  });
  if (error) {
    return { error: error.message || "Reactie mislukt." };
  }

  await writeAuditLog({
    userId: ctx.user.id,
    action: "admin.support.reply_public",
    metadata: { ticket_id_prefix: parsed.data.ticketId.slice(0, 8) },
  });
  revalidatePath(`/admin/support/${parsed.data.ticketId}`);
  revalidatePath("/admin/support");
  return { success: true, message: "Externe reactie geplaatst." };
}

export async function adminInternalNoteSupportTicketAction(
  _prev: AdminSupportActionState,
  formData: FormData,
): Promise<AdminSupportActionState> {
  if (!(await verifyOrigin())) return { error: "Verzoek geweigerd." };
  const parsed = replySchema.safeParse({
    ticketId: formData.get("ticketId"),
    body: formData.get("body"),
  });
  if (!parsed.success) return { error: "Ongeldige notitie." };

  const ctx = await assertSupportManage();
  const limited = await checkRateLimit("admin-support-note", ctx.user.id);
  if (!limited.success) return { error: "Te veel pogingen. Probeer later opnieuw." };

  // Fail-closed when flag off — never fall back to public reply.
  const service = createServiceRoleClient();
  if (service) {
    const { data: flag } = await service
      .from("feature_flags")
      .select("enabled")
      .eq("key", "support_internal_notes_rpc")
      .maybeSingle();
    if (flag?.enabled !== true) {
      return {
        error:
          "Interne notities zijn uitgeschakeld (support_internal_notes_rpc=false).",
      };
    }
  }

  const userClient = await createServerSupabaseClient();
  if (!userClient) return { error: "Database niet beschikbaar." };

  const { error } = await userClient.rpc("add_portal_support_internal_note", {
    p_ticket_id: parsed.data.ticketId,
    p_body: parsed.data.body.trim(),
  });
  if (error) {
    const msg = error.message || "";
    if (msg.includes("FEATURE_DISABLED")) {
      return {
        error:
          "Interne notities zijn uitgeschakeld (support_internal_notes_rpc=false).",
      };
    }
    return { error: msg || "Interne notitie mislukt." };
  }

  await writeAuditLog({
    userId: ctx.user.id,
    action: "admin.support.internal_note",
    metadata: { ticket_id_prefix: parsed.data.ticketId.slice(0, 8) },
  });
  revalidatePath(`/admin/support/${parsed.data.ticketId}`);
  return { success: true, message: "Interne notitie opgeslagen." };
}

export async function adminTransitionSupportTicketStatusAction(
  _prev: AdminSupportActionState,
  formData: FormData,
): Promise<AdminSupportActionState> {
  if (!(await verifyOrigin())) return { error: "Verzoek geweigerd." };
  const parsed = statusSchema.safeParse({
    ticketId: formData.get("ticketId"),
    toStatus: formData.get("toStatus"),
  });
  if (!parsed.success) return { error: "Ongeldige status." };

  const ctx = await assertSupportManage();
  const limited = await checkRateLimit("admin-support-status", ctx.user.id);
  if (!limited.success) return { error: "Te veel pogingen. Probeer later opnieuw." };

  const userClient = await createServerSupabaseClient();
  if (!userClient) return { error: "Database niet beschikbaar." };

  const { error } = await userClient.rpc(
    "transition_portal_support_ticket_status",
    {
      p_ticket_id: parsed.data.ticketId,
      p_to_status: parsed.data.toStatus,
    },
  );
  if (error) {
    return { error: error.message || "Statuswijziging mislukt." };
  }

  await writeAuditLog({
    userId: ctx.user.id,
    action: "admin.support.status_transition",
    metadata: {
      ticket_id_prefix: parsed.data.ticketId.slice(0, 8),
      to_status: parsed.data.toStatus,
    },
  });
  revalidatePath(`/admin/support/${parsed.data.ticketId}`);
  revalidatePath("/admin/support");
  return { success: true, message: "Status bijgewerkt." };
}
