import "server-only";
import { createServiceRoleClient } from "@/lib/database/server";
import { writeAuditLog } from "@/lib/security/audit-log";

/**
 * Apply Mollie paid/failed status to a portal invoice.
 * Uses service role (webhook has no staff session). Idempotent on external_reference.
 */
export async function applyPortalInvoiceMolliePayment(params: {
  invoiceId: string;
  paymentId: string;
  providerStatus: string;
  amountCents: number;
  currency: string;
  customerUserId?: string | null;
}): Promise<{ ok: boolean; alreadyProcessed: boolean; detail: string }> {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { ok: false, alreadyProcessed: false, detail: "no_db" };
  }

  const { data: invoice, error } = await supabase
    .from("portal_invoices")
    .select(
      "id, status, currency, total_cents, amount_paid_cents, amount_due_cents, version, organization_id",
    )
    .eq("id", params.invoiceId)
    .maybeSingle();

  if (error || !invoice) {
    return { ok: false, alreadyProcessed: false, detail: "not_found" };
  }

  if (params.currency.toUpperCase() !== String(invoice.currency).toUpperCase()) {
    return { ok: false, alreadyProcessed: false, detail: "currency_mismatch" };
  }

  if (params.providerStatus !== "paid") {
    await writeAuditLog({
      action: "webhook.mollie_invoice_non_paid",
      resourceType: "portal_invoice",
      resourceId: params.invoiceId,
      metadata: {
        paymentIdPrefix: params.paymentId.slice(0, 8),
        providerStatus: params.providerStatus,
      },
    });
    return { ok: true, alreadyProcessed: false, detail: "ignored_non_paid" };
  }

  if (params.amountCents !== invoice.amount_due_cents) {
    // Allow exact total match when due equals remaining.
    const remaining = invoice.total_cents - invoice.amount_paid_cents;
    if (params.amountCents !== remaining && params.amountCents !== invoice.amount_due_cents) {
      return { ok: false, alreadyProcessed: false, detail: "amount_mismatch" };
    }
  }

  const { data: existing } = await supabase
    .from("portal_invoice_payment_records")
    .select("id")
    .eq("invoice_id", params.invoiceId)
    .eq("external_reference", params.paymentId)
    .maybeSingle();

  if (existing?.id) {
    return { ok: true, alreadyProcessed: true, detail: "duplicate" };
  }

  // Resolve recorded_by: prefer customer from metadata, else first org member.
  let recordedBy = params.customerUserId ?? null;
  if (!recordedBy) {
    const { data: member } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", invoice.organization_id)
      .eq("status", "ACTIVE")
      .limit(1)
      .maybeSingle();
    recordedBy = (member?.user_id as string | undefined) ?? null;
  }
  if (!recordedBy) {
    return { ok: false, alreadyProcessed: false, detail: "no_recorder" };
  }

  const idempotencyKey = `mollie:${params.paymentId}`;
  const paymentDate = new Date().toISOString().slice(0, 10);

  const { error: insertError } = await supabase
    .from("portal_invoice_payment_records")
    .insert({
      invoice_id: params.invoiceId,
      amount_cents: params.amountCents,
      currency: invoice.currency,
      payment_date: paymentDate,
      payment_method: "CARD_EXTERNAL",
      external_reference: params.paymentId,
      internal_note: "mollie_test_webhook",
      recorded_by: recordedBy,
      idempotency_key: idempotencyKey,
    });

  if (insertError) {
    if (String(insertError.code) === "23505") {
      return { ok: true, alreadyProcessed: true, detail: "duplicate_constraint" };
    }
    return { ok: false, alreadyProcessed: false, detail: "insert_failed" };
  }

  const paid = invoice.amount_paid_cents + params.amountCents;
  const due = Math.max(invoice.total_cents - paid, 0);
  const status = due === 0 ? "PAID" : "PARTIALLY_PAID";

  const { error: updateError } = await supabase
    .from("portal_invoices")
    .update({
      amount_paid_cents: paid,
      amount_due_cents: due,
      status,
      paid_at: due === 0 ? new Date().toISOString() : null,
      version: invoice.version + 1,
      status_updated_by: recordedBy,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.invoiceId)
    .eq("version", invoice.version);

  if (updateError) {
    return { ok: false, alreadyProcessed: false, detail: "update_failed" };
  }

  await writeAuditLog({
    action: "webhook.mollie_invoice_paid",
    resourceType: "portal_invoice",
    resourceId: params.invoiceId,
    metadata: {
      paymentIdPrefix: params.paymentId.slice(0, 8),
      amountCents: params.amountCents,
      status,
    },
  });

  return { ok: true, alreadyProcessed: false, detail: status };
}
