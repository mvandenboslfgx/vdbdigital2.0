"use server";

import { revalidatePath } from "next/cache";
import { verifyOrigin } from "@/lib/security/origin";
import {
  markPayoutPaid,
  reviewPayoutRequest,
} from "@/server/repositories/partner-payouts";

export type PayoutActionState = {
  error?: string;
  notice?: string;
};

export async function approvePayoutRequestAction(
  _prev: PayoutActionState,
  formData: FormData,
): Promise<PayoutActionState> {
  if (!(await verifyOrigin())) {
    return { error: "Verzoek geweigerd." };
  }
  const requestId = String(formData.get("requestId") ?? "");
  if (!requestId) return { error: "Aanvraag ontbreekt." };
  try {
    await reviewPayoutRequest({ requestId, approve: true });
    revalidatePath("/admin/payouts");
    return { notice: "Uitbetaling goedgekeurd." };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Goedkeuren mislukt.",
    };
  }
}

export async function rejectPayoutRequestAction(
  _prev: PayoutActionState,
  formData: FormData,
): Promise<PayoutActionState> {
  if (!(await verifyOrigin())) {
    return { error: "Verzoek geweigerd." };
  }
  const requestId = String(formData.get("requestId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!requestId) return { error: "Aanvraag ontbreekt." };
  if (reason.length < 3) return { error: "Vul een afwijsreden in." };
  try {
    await reviewPayoutRequest({ requestId, approve: false, reason });
    revalidatePath("/admin/payouts");
    return { notice: "Aanvraag afgewezen." };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Afwijzen mislukt.",
    };
  }
}

export async function markPayoutPaidAction(
  _prev: PayoutActionState,
  formData: FormData,
): Promise<PayoutActionState> {
  if (!(await verifyOrigin())) {
    return { error: "Verzoek geweigerd." };
  }
  const payoutId = String(formData.get("payoutId") ?? "");
  const externalReference = String(formData.get("externalReference") ?? "").trim();
  if (!payoutId) return { error: "Uitbetaling ontbreekt." };
  try {
    await markPayoutPaid({
      payoutId,
      externalReference: externalReference || undefined,
    });
    revalidatePath("/admin/payouts");
    return { notice: "Gemarkeerd als uitbetaald." };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Markeren mislukt.",
    };
  }
}
