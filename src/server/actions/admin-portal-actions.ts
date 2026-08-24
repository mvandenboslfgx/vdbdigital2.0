"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { verifyOrigin } from "@/lib/security/origin";
import {
  createOrganizationWithInvite,
  resendOrganizationInvitation,
  revokeOrganizationInvitation,
} from "@/server/repositories/admin-portal";
import { resolveInvitationRecipient } from "@/lib/email/invitation-recipient";

export type AdminPortalActionState = {
  error?: string;
  notice?: string;
};

const createSchema = z.object({
  legalName: z.string().min(2).max(200),
  tradeName: z.string().max(200).optional(),
  type: z.enum(["BUSINESS", "CONSUMER"]),
  contactEmail: z.string().email().max(254),
  inviteEmail: z.string().max(254).optional(),
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
    inviteEmail: String(formData.get("inviteEmail") ?? "").trim() || undefined,
  });

  if (!parsed.success) {
    return { error: "Controleer de invoer." };
  }

  const recipient = resolveInvitationRecipient({
    contactEmail: parsed.data.contactEmail,
    inviteEmail: parsed.data.inviteEmail,
  });
  if (!recipient.ok) {
    return { error: recipient.error };
  }

  try {
    const result = await createOrganizationWithInvite({
      ...parsed.data,
      inviteEmail: recipient.recipient,
    });
    const mail = result.mailSent ? "sent" : "failed";
    redirect(`/admin/customers/${result.organizationId}?invite=1&mail=${mail}`);
  } catch (err) {
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

export async function resendInvitationAction(
  _prev: AdminPortalActionState,
  formData: FormData,
): Promise<AdminPortalActionState> {
  if (!(await verifyOrigin())) {
    return { error: "Verzoek geweigerd." };
  }
  const invitationId = String(formData.get("invitationId") ?? "");
  if (!invitationId) {
    return { error: "Uitnodiging ontbreekt." };
  }
  try {
    const result = await resendOrganizationInvitation(invitationId);
    if (!result.sent) {
      return { error: result.reason ?? "Versturen mislukt." };
    }
    return { notice: "Uitnodiging opnieuw verstuurd." };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Opnieuw versturen mislukt.",
    };
  }
}

export async function revokeInvitationAction(
  _prev: AdminPortalActionState,
  formData: FormData,
): Promise<AdminPortalActionState> {
  if (!(await verifyOrigin())) {
    return { error: "Verzoek geweigerd." };
  }
  const invitationId = String(formData.get("invitationId") ?? "");
  if (!invitationId) {
    return { error: "Uitnodiging ontbreekt." };
  }
  try {
    await revokeOrganizationInvitation(invitationId);
    return { notice: "Uitnodiging ingetrokken." };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Intrekken mislukt.",
    };
  }
}
