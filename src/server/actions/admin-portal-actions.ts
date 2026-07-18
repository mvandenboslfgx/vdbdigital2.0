"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { verifyOrigin } from "@/lib/security/origin";
import { createOrganizationWithInvite } from "@/server/repositories/admin-portal";

export type AdminPortalActionState = {
  error?: string;
  inviteUrl?: string;
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
