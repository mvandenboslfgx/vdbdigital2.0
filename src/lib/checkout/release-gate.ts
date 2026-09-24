/**
 * Cloudflare production release gate.
 * Read-only: validates configuration and repository contracts, never deploys.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import {
  mapMolliePaymentStatus,
  canApplyOrderTransition,
} from "@/lib/payments/mollie-status";
import {
  assertMollieKeySafeForRuntime,
  detectMollieKeyMode,
} from "@/lib/payments/mollie-mode";
import { validateCheckoutEnvironment } from "@/lib/checkout/env-validation";
import { hasLegallyApprovedFixedSku } from "@/lib/commerce/checkout-eligibility";
import { getDeploymentEnvironment } from "@/lib/url/app-url";

export type ReleaseGateCode =
  | "READY FOR CLOUDFLARE PRODUCTION"
  | "NOT READY — migration contract missing"
  | "NOT READY — durable limiter unavailable"
  | "NOT READY — Mollie configuration unsafe"
  | "NOT READY — live Mollie key required"
  | "NOT READY — no legally approved FIXED SKU"
  | "NOT READY — environment invalid"
  | "NOT READY — payment status map incomplete"
  | "NOT READY — multiple blockers";

export interface ReleaseGateCheck {
  id: string;
  ok: boolean;
  detail: string;
}

export interface ReleaseGateReport {
  code: ReleaseGateCode;
  readyForDeploy: boolean;
  checks: ReleaseGateCheck[];
  deployPerformed: false;
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
  const payment = join(
    cwd,
    "supabase/migrations/20260716000000_p0_payment_integrity.sql",
  );
  const limiter = join(
    cwd,
    "supabase/migrations/20260716010000_p05_rate_limit_hardening.sql",
  );
  return existsSync(payment) && existsSync(limiter);
}

function rpcDefinitionsPresent(cwd = process.cwd()): boolean {
  const path = join(
    cwd,
    "supabase/migrations/20260716000000_p0_payment_integrity.sql",
  );
  if (!existsSync(path)) return false;
  const sql = readFileSync(path, "utf8");
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
  const deployment = getDeploymentEnvironment(env);
  const checkoutOn = env.CHECKOUT_ENABLED === "true";

  checks.push({
    id: "cloudflare_production",
    ok: deployment === "production",
    detail:
      deployment === "production"
        ? "VDB_DEPLOYMENT_ENV resolves to production"
        : `Deployment environment is ${deployment}; production is required for release`,
  });

  const migrationsOk = migrationFilesPresent(cwd) && rpcDefinitionsPresent(cwd);
  checks.push({
    id: "migration_contract",
    ok: migrationsOk,
    detail: migrationsOk
      ? "Payment integrity and durable rate-limit RPC migrations are present"
      : "Required payment/rate-limit migration contract is missing",
  });

  const hasSupabaseLimiter = Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL &&
      (env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY),
  );
  const hasUpstash = Boolean(
    env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN,
  );
  const limiterConfigured = hasUpstash || hasSupabaseLimiter;
  checks.push({
    id: "durable_limiter",
    ok: limiterConfigured,
    detail: limiterConfigured
      ? hasUpstash
        ? "Durable limiter available via Upstash"
        : "Durable limiter available via Supabase RPC fallback"
      : "Configure Supabase server access or Upstash before checkout release",
  });

  const mollie = assertMollieKeySafeForRuntime(env.MOLLIE_API_KEY, env);
  checks.push({
    id: "mollie_safe",
    ok: mollie.ok,
    detail: mollie.ok ? `Mollie key is runtime-safe (${mollie.mode})` : mollie.reason,
  });

  const needsLiveMollie = deployment === "production" && checkoutOn;
  const liveMollieOk =
    !needsLiveMollie || detectMollieKeyMode(env.MOLLIE_API_KEY) === "live";
  checks.push({
    id: "mollie_live_for_checkout",
    ok: liveMollieOk,
    detail: !needsLiveMollie
      ? "Live Mollie key not required while production checkout is disabled"
      : liveMollieOk
        ? "Production checkout uses a live Mollie key"
        : "CHECKOUT_ENABLED=true in production requires a live_ Mollie key",
  });

  const envResult = validateCheckoutEnvironment(env);
  const envErrors = envResult.issues.filter((issue) => issue.severity === "error");
  checks.push({
    id: "environment",
    ok: envErrors.length === 0,
    detail:
      envErrors.length === 0
        ? "Checkout environment validation passed"
        : envErrors.map((issue) => issue.message).join("; "),
  });

  const hasSku =
    hasLegallyApprovedFixedSku("B2B") ||
    hasLegallyApprovedFixedSku("B2C");
  checks.push({
    id: "legal_fixed_sku",
    ok: hasSku,
    detail: hasSku
      ? "At least one legally approved fixed-price SKU exists"
      : "No legally approved fixed-price SKU exists",
  });

  const mapOk = statusMapComplete();
  checks.push({
    id: "status_map",
    ok: mapOk,
    detail: mapOk
      ? "Mollie status map covers required transitions"
      : "Payment status map is incomplete",
  });

  const failed = checks.filter((check) => !check.ok);
  let code: ReleaseGateCode = "NOT READY — multiple blockers";
  if (failed.length === 0) {
    code = "READY FOR CLOUDFLARE PRODUCTION";
  } else if (!migrationsOk) {
    code = "NOT READY — migration contract missing";
  } else if (!limiterConfigured) {
    code = "NOT READY — durable limiter unavailable";
  } else if (!mollie.ok) {
    code = "NOT READY — Mollie configuration unsafe";
  } else if (!liveMollieOk) {
    code = "NOT READY — live Mollie key required";
  } else if (envErrors.length > 0) {
    code = "NOT READY — environment invalid";
  } else if (!hasSku) {
    code = "NOT READY — no legally approved FIXED SKU";
  } else if (!mapOk) {
    code = "NOT READY — payment status map incomplete";
  }

  return {
    code,
    readyForDeploy: failed.length === 0,
    checks,
    deployPerformed: false,
  };
}
