import "server-only";
import { getMollieWebhookToken } from "@/config/env";
import { timingSafeCompare } from "@/lib/security/timing-safe";
import { isPreviewDeployment, isProductionDeployment, resolveAppUrl } from "@/lib/url/app-url";

export type WebhookUrlResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/**
 * Bouwt de klassieke Mollie Payments API webhookUrl (server-side only).
 *
 * Preview + Deployment Protection: vereist VERCEL_AUTOMATION_BYPASS_SECRET.
 * Production: geen Vercel-bypass.
 * Optioneel applicatietoken via queryparam `token` (geen Mollie signature).
 */
export function buildMollieWebhookUrl(): WebhookUrlResult {
  const appUrl = resolveAppUrl();
  const params = new URLSearchParams();

  if (isPreviewDeployment()) {
    const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
    if (!bypass) {
      return {
        ok: false,
        error:
          "VERCEL_AUTOMATION_BYPASS_SECRET ontbreekt. Mollie-webhooks kunnen een beschermde Preview niet bereiken.",
      };
    }
    params.set("x-vercel-protection-bypass", bypass);
  }

  if (isProductionDeployment() && process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
    // Production mag nooit Vercel bypass in webhook URL gebruiken
    return {
      ok: false,
      error: "VERCEL_AUTOMATION_BYPASS_SECRET mag niet in Production worden gebruikt.",
    };
  }

  const token = getMollieWebhookToken();
  if (!token && !allowsMissingMollieWebhookToken()) {
    return {
      ok: false,
      error:
        "MOLLIE_WEBHOOK_TOKEN ontbreekt. Staging/preview/production weigeren onbeschermde webhooks.",
    };
  }
  if (token) {
    params.set("token", token);
  }

  const query = params.toString();
  const url = `${appUrl}/api/webhooks/mollie${query ? `?${query}` : ""}`;
  return { ok: true, url };
}

/**
 * Local/unit tests may omit the application webhook token.
 * Staging, preview, and production must fail closed when the token is unset —
 * otherwise any caller can POST a payment id to the webhook endpoint.
 */
export function allowsMissingMollieWebhookToken(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  if (env.NODE_ENV === "test") return true;
  const appEnv = (env.APP_ENV ?? "").trim().toLowerCase();
  if (appEnv === "staging" || appEnv === "production") return false;
  if (env.VERCEL_ENV === "production" || env.VERCEL_ENV === "preview") {
    return false;
  }
  // Local development only
  return env.NODE_ENV !== "production";
}

/** Valideert applicatiewebhooktoken uit query (niet Mollie signature). */
export function verifyMollieWebhookToken(
  providedToken: string | null,
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): { valid: true } | { valid: false; reason: "missing" | "invalid" } {
  const expected = getMollieWebhookToken();
  if (!expected) {
    if (allowsMissingMollieWebhookToken(env)) {
      return { valid: true };
    }
    return { valid: false, reason: "missing" };
  }

  if (!providedToken) {
    return { valid: false, reason: "missing" };
  }

  if (!timingSafeCompare(providedToken, expected)) {
    return { valid: false, reason: "invalid" };
  }

  return { valid: true };
}
