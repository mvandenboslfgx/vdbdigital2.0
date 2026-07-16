/**
 * Release-gate evaluator — report only.
 * Never mutates CHECKOUT_ENABLED, env, publications, or live payments.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import {
  mapMolliePaymentStatus,
  canApplyOrderTransition,
} from "@/lib/payments/mollie-status";
import { assertMollieKeySafeForRuntime } from "@/lib/payments/mollie-mode";
import {
  validateCheckoutEnvironment,
  isCheckoutFeatureFlagOff,
} from "@/lib/checkout/env-validation";
import { hasLegallyApprovedFixedSku } from "@/lib/commerce/checkout-eligibility";
import { isUpstashConfigured } from "@/lib/security/rate-limit-config";

export type ReleaseGateCode =
  | "READY FOR MANUAL CHECKOUT ENABLEMENT"
  | "NOT READY — migration missing"
  | "NOT READY — limiter backend unavailable"
  | "NOT READY — Mollie test verification incomplete"
  | "NOT READY — no legally approved FIXED SKU"
  | "NOT READY — environment invalid"
  | "NOT READY — checkout flag must stay OFF"
  | "NOT READY — payment status map incomplete"
  | "NOT READY — multiple blockers";

export interface ReleaseGateCheck {
  id: string;
  ok: boolean;
  detail: string;
}

export interface ReleaseGateReport {
  code: ReleaseGateCode;
  readyForManualEnablement: boolean;
  checks: ReleaseGateCheck[];
  checkoutRemainsOff: true;
}

const REQUIRED_STATUSES = [
  "open",
  "pending",
  "paid",
  "failed",
  "canceled",
  "expired",
  "authorized",
  "refunded",
  "charged_back",
] as const;

function migrationFilesPresent(cwd = process.cwd()): boolean {
  const a = join(cwd, "supabase/migrations/20260716000000_p0_payment_integrity.sql");
  const b = join(cwd, "supabase/migrations/20260716010000_p05_rate_limit_hardening.sql");
  return existsSync(a) && existsSync(b);
}

function rpcDefinitionsPresent(cwd = process.cwd()): boolean {
  const sql = readFileSync(
    join(cwd, "supabase/migrations/20260716000000_p0_payment_integrity.sql"),
    "utf8",
  );
  return (
    sql.includes("create_order_with_items") &&
    sql.includes("apply_mollie_payment_update") &&
    sql.includes("check_rate_limit")
  );
}

function statusMapComplete(): boolean {
  for (const status of REQUIRED_STATUSES) {
    const mapped = mapMolliePaymentStatus(status);
    if (status === "paid" && mapped.orderStatus !== "PAID") return false;
    if (status === "refunded" && !mapped.allowedAfterPaid) return false;
    if (status === "charged_back" && !mapped.allowedAfterPaid) return false;
  }
  const paid = mapMolliePaymentStatus("paid");
  const refunded = mapMolliePaymentStatus("refunded");
  return canApplyOrderTransition("PAID", refunded) && !canApplyOrderTransition("PAID", paid);
}

export function evaluateCheckoutReleaseGate(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
  cwd = process.cwd(),
): ReleaseGateReport {
  const checks: ReleaseGateCheck[] = [];

  const flagOff = isCheckoutFeatureFlagOff(env);
  checks.push({
    id: "feature_flag_off",
    ok: flagOff,
    detail: flagOff
      ? "CHECKOUT_ENABLED is off (required for P0.5)"
      : "CHECKOUT_ENABLED must remain false",
  });

  const migrationsOk = migrationFilesPresent(cwd) && rpcDefinitionsPresent(cwd);
  checks.push({
    id: "migration_files",
    ok: migrationsOk,
    detail: migrationsOk
      ? "P0/P0.5 migration files + RPC definitions present in repo"
      : "Required payment-integrity migrations missing",
  });

  const migrationAppliedHint = env.P05_MIGRATION_APPLIED === "1";
  checks.push({
    id: "migration_applied",
    ok: migrationAppliedHint,
    detail: migrationAppliedHint
      ? "Operator confirmed migration applied (P05_MIGRATION_APPLIED=1)"
      : "Set P05_MIGRATION_APPLIED=1 after applying migrations on target Supabase",
  });

  const limiterConfigured =
    isUpstashConfigured() ||
    Boolean(
      env.NEXT_PUBLIC_SUPABASE_URL &&
        (env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY) &&
        env.P05_LIMITER_RPC_VERIFIED === "1",
    );
  checks.push({
    id: "limiter_backend",
    ok: limiterConfigured,
    detail: limiterConfigured
      ? "Limiter backend configured (Upstash or verified DB RPC)"
      : "Configure Upstash or verify check_rate_limit RPC (P05_LIMITER_RPC_VERIFIED=1)",
  });

  const mollie = assertMollieKeySafeForRuntime(env.MOLLIE_API_KEY, env);
  const mollieTestVerified = env.P05_MOLLIE_TEST_VERIFIED === "1";
  checks.push({
    id: "mollie_safe",
    ok: mollie.ok,
    detail: mollie.ok ? `Mollie key mode ok (${mollie.mode})` : mollie.reason,
  });
  checks.push({
    id: "mollie_test_verified",
    ok: mollieTestVerified,
    detail: mollieTestVerified
      ? "Operator confirmed Mollie testmode flows (P05_MOLLIE_TEST_VERIFIED=1)"
      : "Complete Mollie testmode checklist then set P05_MOLLIE_TEST_VERIFIED=1",
  });

  const envResult = validateCheckoutEnvironment({
    ...env,
    // Gate itself requires flag off; validate as if not enabling
    CHECKOUT_ENABLED: "false",
  });
  // Filter out the intentional "flag on" noise — we force false above
  const envOk = envResult.issues.filter((i) => i.severity === "error").length === 0;
  checks.push({
    id: "environment",
    ok: envOk,
    detail: envOk
      ? "Environment validation passed (with checkout forced off)"
      : envResult.issues
          .filter((i) => i.severity === "error")
          .map((i) => i.message)
          .join("; "),
  });

  const hasSku = hasLegallyApprovedFixedSku("B2B") || hasLegallyApprovedFixedSku("B2C");
  checks.push({
    id: "legal_fixed_sku",
    ok: hasSku,
    detail: hasSku
      ? "At least one legally approved FIXED catalog SKU exists"
      : "No legally approved FIXED SKU in commercial catalog",
  });

  const mapOk = statusMapComplete();
  checks.push({
    id: "status_map",
    ok: mapOk,
    detail: mapOk
      ? "Mollie status map covers required transitions"
      : "Payment status map incomplete",
  });

  const failed = checks.filter((c) => !c.ok);
  let code: ReleaseGateCode;
  if (failed.length === 0) {
    code = "READY FOR MANUAL CHECKOUT ENABLEMENT";
  } else if (!flagOff) {
    code = "NOT READY — checkout flag must stay OFF";
  } else if (!migrationsOk || !migrationAppliedHint) {
    code = "NOT READY — migration missing";
  } else if (!limiterConfigured) {
    code = "NOT READY — limiter backend unavailable";
  } else if (!mollie.ok || !mollieTestVerified) {
    code = "NOT READY — Mollie test verification incomplete";
  } else if (!hasSku) {
    code = "NOT READY — no legally approved FIXED SKU";
  } else if (!envOk) {
    code = "NOT READY — environment invalid";
  } else if (!mapOk) {
    code = "NOT READY — payment status map incomplete";
  } else {
    code = "NOT READY — multiple blockers";
  }

  return {
    code,
    readyForManualEnablement: failed.length === 0,
    checks,
    checkoutRemainsOff: true,
  };
}
