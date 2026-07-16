/**
 * P0/P0.5 payment integrity contract catalog (pure — no DB I/O).
 * Used by verify-p0-payments and unit tests.
 */

export const P0_PAYMENT_MIGRATION_FILES = [
  "supabase/migrations/20260716000000_p0_payment_integrity.sql",
  "supabase/migrations/20260716010000_p05_rate_limit_hardening.sql",
  "supabase/migrations/20260716020000_p05_verify_payment_contracts.sql",
] as const;

/** Checks that must PASS for schema contract readiness (excluding behavioral) */
export const REQUIRED_CONTRACT_CHECKS = [
  "table:orders",
  "table:payments",
  "table:webhook_events",
  "table:rate_limit_buckets",
  "enum:payment_status_extended",
  "column:orders.idempotency_key",
  "column:orders.customer_type",
  "column:orders.payment_init_status",
  "column:payments.provider_status",
  "column:webhook_events.processing_status",
  "column:webhook_events.last_error",
  "column:webhook_events.processed_at",
  "index:idx_orders_idempotency_key",
  "constraint:webhook_events_provider_external_id",
  "constraint:rate_limit_buckets_pkey",
  "data:orders.payment_init_status_nonnull",
  "data:webhook_events.processing_status_nonnull",
  "rpc:check_rate_limit.signature",
  "rpc:check_rate_limit.security_definer",
  "rpc:check_rate_limit.search_path",
  "rpc:check_rate_limit.returns",
  "rpc:check_rate_limit.no_public_execute",
  "rpc:check_rate_limit.service_role_execute",
  "rpc:check_rate_limit.advisory_lock",
  "rpc:create_order_with_items.signature",
  "rpc:create_order_with_items.security_definer",
  "rpc:create_order_with_items.search_path",
  "rpc:create_order_with_items.no_public_execute",
  "rpc:apply_mollie_payment_update.signature",
  "rpc:apply_mollie_payment_update.security_definer",
  "rpc:apply_mollie_payment_update.search_path",
  "rpc:apply_mollie_payment_update.returns",
  "rpc:apply_mollie_payment_update.no_public_execute",
  "rls:rate_limit_buckets.enabled",
  "rls:rate_limit_buckets.deny_anon",
  "rls:rate_limit_buckets.deny_authenticated",
] as const;

export const BEHAVIORAL_CONTRACT_CHECKS = [
  "behavioral:rate_limit_serial_cap",
  "behavioral:webhook_reclaim_after_failed",
  "behavioral:webhook_duplicate_paid",
  "behavioral:refund_after_paid",
] as const;

export type VerifyCheck = {
  name: string;
  ok: boolean;
  detail?: string;
};

export type VerifySummary = {
  ok: boolean;
  failed: VerifyCheck[];
  missingRequired: string[];
  checks: VerifyCheck[];
  mode: "schema" | "schema+behavioral";
};

export function evaluateContractResults(
  rows: VerifyCheck[],
  options: { requireBehavioral: boolean },
): VerifySummary {
  const byName = new Map(rows.map((r) => [r.name, r]));
  const required: string[] = [...REQUIRED_CONTRACT_CHECKS];
  if (options.requireBehavioral) {
    required.push(...BEHAVIORAL_CONTRACT_CHECKS);
  }

  const missingRequired = required.filter((name) => !byName.has(name));
  const failed = rows.filter((r) => !r.ok && r.name !== "behavioral:skipped");

  for (const name of missingRequired) {
    failed.push({
      name,
      ok: false,
      detail: "required check missing from verifier output",
    });
  }

  // If behavioral was skipped while required, fail
  if (options.requireBehavioral) {
    const skipped = byName.get("behavioral:skipped");
    if (skipped?.ok) {
      failed.push({
        name: "behavioral:required",
        ok: false,
        detail: "behavioral checks were skipped but P05_VERIFY_BEHAVIORAL=1 requires them",
      });
    }
  }

  return {
    ok: failed.length === 0 && missingRequired.length === 0,
    failed,
    missingRequired,
    checks: rows,
    mode: options.requireBehavioral ? "schema+behavioral" : "schema",
  };
}

export function formatEvidenceBlock(summary: VerifySummary, meta: {
  environment: string;
  runAt: string;
  behavioral: boolean;
}): string {
  const lines = [
    "# P0.5 Migration Verification Evidence",
    "",
    `Date (UTC): ${meta.runAt}`,
    `Environment: ${meta.environment}`,
    `Mode: ${summary.mode}`,
    `Behavioral: ${meta.behavioral ? "yes" : "no"}`,
    `Result: ${summary.ok ? "PASS" : "FAIL"}`,
    "",
    "## Checks",
    "",
  ];
  for (const c of summary.checks) {
    lines.push(`- ${c.ok ? "PASS" : "FAIL"} \`${c.name}\`${c.detail ? ` — ${c.detail}` : ""}`);
  }
  if (summary.failed.length > 0) {
    lines.push("", "## Failures", "");
    for (const f of summary.failed) {
      lines.push(`- \`${f.name}\`${f.detail ? `: ${f.detail}` : ""}`);
    }
  }
  lines.push(
    "",
    "## Operator note",
    "",
    "Do **not** set `P05_MIGRATION_APPLIED=1` unless Result is PASS.",
    "Do **not** store secrets, API keys, or real customer data in this evidence file.",
    "",
  );
  return lines.join("\n");
}
