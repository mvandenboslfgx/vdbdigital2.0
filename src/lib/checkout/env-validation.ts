/**
 * Central checkout / release-gate environment validation.
 * Never prints secret values.
 */

import { detectMollieKeyMode, assertMollieKeySafeForRuntime } from "@/lib/payments/mollie-mode";
import { extractEmailAddress, isEmailFromAddress } from "@/lib/email/address";

const PLACEHOLDER_EMAIL_FROM = [
  "onboarding@resend.dev",
  "example@",
  "@example.com",
  "test@test.com",
  "noreply@localhost",
  "changeme@",
];

export type EnvClass =
  | "required_all"
  | "required_production"
  | "required_when_checkout"
  | "optional"
  | "server_only"
  | "public_safe";

export const CHECKOUT_ENV_CATALOG: Array<{
  name: string;
  class: EnvClass;
  purpose: string;
}> = [
  { name: "CHECKOUT_ENABLED", class: "optional", purpose: "Feature flag; default OFF" },
  { name: "NEXT_PUBLIC_APP_URL", class: "required_all", purpose: "App origin / redirects" },
  { name: "NEXT_PUBLIC_SITE_NAME", class: "public_safe", purpose: "Brand name" },
  { name: "NEXT_PUBLIC_SUPABASE_URL", class: "required_production", purpose: "Supabase API" },
  {
    name: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    class: "public_safe",
    purpose: "Supabase publishable key",
  },
  { name: "SUPABASE_SECRET_KEY", class: "server_only", purpose: "Service role; never client" },
  { name: "MOLLIE_API_KEY", class: "required_when_checkout", purpose: "Payments" },
  { name: "MOLLIE_WEBHOOK_TOKEN", class: "optional", purpose: "Webhook query token" },
  { name: "UPSTASH_REDIS_REST_URL", class: "optional", purpose: "Rate limiter backend" },
  { name: "UPSTASH_REDIS_REST_TOKEN", class: "server_only", purpose: "Rate limiter secret" },
  { name: "RESEND_API_KEY", class: "required_when_checkout", purpose: "Transactional email" },
  { name: "EMAIL_FROM", class: "required_when_checkout", purpose: "Verified sender" },
  { name: "EMAIL_ADMIN", class: "optional", purpose: "Internal notifications" },
  { name: "ALLOWED_ORIGINS", class: "optional", purpose: "Extra CSRF origins" },
  { name: "EMAIL_ALLOWED_FROM_DOMAINS", class: "optional", purpose: "Prod EMAIL_FROM allowlist" },
];

export function isPlaceholderEmailFrom(email: string | undefined | null): boolean {
  if (!email) return true;
  const lower = email.trim().toLowerCase();
  return PLACEHOLDER_EMAIL_FROM.some((p) => lower.includes(p) || lower.startsWith(p));
}

export function isValidEmailSyntax(email: string): boolean {
  return isEmailFromAddress(email);
}

export function emailFromDomainAllowed(
  email: string,
  allowedDomainsCsv: string | undefined,
): boolean {
  if (!allowedDomainsCsv) return !isPlaceholderEmailFrom(email);
  const bare = extractEmailAddress(email);
  const domain = bare?.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  const allowed = allowedDomainsCsv
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(domain);
}

export interface CheckoutEnvIssue {
  code: string;
  message: string;
  severity: "error" | "warning";
}

export function validateCheckoutEnvironment(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): { ok: boolean; issues: CheckoutEnvIssue[] } {
  const issues: CheckoutEnvIssue[] = [];
  const isProd = env.VERCEL_ENV === "production" || (
    env.NODE_ENV === "production" && env.VERCEL_ENV !== "preview"
  );
  const checkoutOn = env.CHECKOUT_ENABLED === "true";

  if (checkoutOn) {
    issues.push({
      code: "checkout_flag_on",
      message: "CHECKOUT_ENABLED=true — P0.5 gate forbids enabling during this round",
      severity: "error",
    });
  }

  if (!env.NEXT_PUBLIC_APP_URL) {
    issues.push({
      code: "app_url_missing",
      message: "NEXT_PUBLIC_APP_URL is required",
      severity: "error",
    });
  }

  const mollie = assertMollieKeySafeForRuntime(env.MOLLIE_API_KEY, env);
  if (env.MOLLIE_API_KEY && !mollie.ok) {
    issues.push({
      code: "mollie_unsafe",
      message: mollie.reason,
      severity: "error",
    });
  }

  if (isProd || checkoutOn) {
    if (!env.EMAIL_FROM || !isValidEmailSyntax(env.EMAIL_FROM)) {
      issues.push({
        code: "email_from_invalid",
        message: "EMAIL_FROM must be a valid email address",
        severity: "error",
      });
    } else if (
      isPlaceholderEmailFrom(env.EMAIL_FROM) ||
      !emailFromDomainAllowed(env.EMAIL_FROM, env.EMAIL_ALLOWED_FROM_DOMAINS)
    ) {
      issues.push({
        code: "email_from_placeholder",
        message:
          "EMAIL_FROM looks like a placeholder or domain is not in EMAIL_ALLOWED_FROM_DOMAINS",
        severity: "error",
      });
    }
  }

  if (checkoutOn) {
    const needed = [
      "NEXT_PUBLIC_SUPABASE_URL",
      "SUPABASE_SECRET_KEY",
      "MOLLIE_API_KEY",
      "RESEND_API_KEY",
      "EMAIL_FROM",
    ];
    for (const key of needed) {
      const value =
        key === "SUPABASE_SECRET_KEY"
          ? env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY
          : env[key];
      if (!value) {
        issues.push({
          code: "checkout_requirement_missing",
          message: `${key} is required when checkout is enabled`,
          severity: "error",
        });
      }
    }

    const hasLimiter =
      Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) ||
      Boolean(env.NEXT_PUBLIC_SUPABASE_URL && (env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY));
    if (!hasLimiter) {
      issues.push({
        code: "limiter_missing",
        message: "Limiter backend required when checkout is enabled (Upstash or Supabase RPC)",
        severity: "error",
      });
    }
  }

  if (detectMollieKeyMode(env.MOLLIE_API_KEY) === "live" && env.VERCEL_ENV === "preview") {
    issues.push({
      code: "live_mollie_preview",
      message: "Live Mollie key must not be used on preview",
      severity: "error",
    });
  }

  const errors = issues.filter((i) => i.severity === "error");
  return { ok: errors.length === 0 && !checkoutOn, issues };
}

export function isCheckoutFeatureFlagOff(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  return env.CHECKOUT_ENABLED !== "true";
}
