import "server-only";
import { createServerSupabaseClient } from "@/lib/database/server";
import { requireAdmin } from "@/server/auth/require-admin";
import { requirePermission } from "@/server/auth/require-permission";
import { writeAuditLog } from "@/lib/security/audit-log";

export type AdminPayoutRequestRow = {
  id: string;
  partner_id: string;
  requested_amount_cents: number;
  available_amount_snapshot_cents: number;
  currency: string;
  status: string;
  requested_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  partner?: { legal_name: string | null; display_name: string | null } | null;
};

export async function listAdminPayoutRequests() {
  const ctx = await requireAdmin();
  await requirePermission(ctx, "payouts.review");

  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("partner_payout_requests")
    .select(
      "id, partner_id, requested_amount_cents, available_amount_snapshot_cents, currency, status, requested_at, reviewed_at, rejection_reason, partner:partner_profiles(legal_name, display_name)",
    )
    .order("requested_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    const partner = Array.isArray(row.partner) ? row.partner[0] ?? null : row.partner;
    return { ...row, partner } as AdminPayoutRequestRow;
  });
}

export async function reviewPayoutRequest(input: {
  requestId: string;
  approve: boolean;
  reason?: string;
}) {
  const ctx = await requireAdmin();
  await requirePermission(ctx, "payouts.review");

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    throw new Error("Database niet beschikbaar");
  }

  const { data, error } = await supabase.rpc("approve_partner_payout_request", {
    p_request_id: input.requestId,
    p_approve: input.approve,
    p_rejection_reason: input.approve ? null : (input.reason ?? "rejected"),
  });

  if (error) {
    throw new Error(error.message);
  }

  await writeAuditLog({
    userId: ctx.user.id,
    action: input.approve
      ? "admin.payout_request_approved"
      : "admin.payout_request_rejected",
    metadata: {
      requestId: input.requestId,
      reason: input.approve ? null : (input.reason ?? "rejected"),
    },
  });

  return data as string;
}

export async function markPayoutPaid(input: {
  payoutId: string;
  externalReference?: string;
}) {
  const ctx = await requireAdmin();
  await requirePermission(ctx, "payouts.review");

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    throw new Error("Database niet beschikbaar");
  }

  const { data, error } = await supabase.rpc("record_partner_payout_paid", {
    p_payout_id: input.payoutId,
    p_external_reference: input.externalReference ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  await writeAuditLog({
    userId: ctx.user.id,
    action: "admin.payout_marked_paid",
    metadata: {
      payoutId: input.payoutId,
      hasExternalReference: Boolean(input.externalReference),
    },
  });

  return data as string;
}

export async function listPendingPayoutsForRequest(requestId: string) {
  const ctx = await requireAdmin();
  await requirePermission(ctx, "payouts.review");
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("partner_payouts")
    .select("id, amount_cents, currency, status, payout_request_id, paid_at, external_reference")
    .eq("payout_request_id", requestId)
    .limit(5);

  void ctx;
  return data ?? [];
}
