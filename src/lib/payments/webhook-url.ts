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
  if (token) {
    params.set("token", token);
  }

  const query = params.toString();
  const url = `${appUrl}/api/webhooks/mollie${query ? `?${query}` : ""}`;
  return { ok: true, url };
}

/**
 * Valideert applicatiewebhooktoken uit query (niet Mollie signature).
 * Fail-closed: ontbrekende serverconfiguratie is nooit geldig.
 */
export function verifyMollieWebhookToken(
  providedToken: string | null,
): {
  valid: true;
} | {
  valid: false;
  reason: "missing" | "invalid" | "unconfigured";
} {
  const expected = getMollieWebhookToken();
  if (!expected) {
    return { valid: false, reason: "unconfigured" };
  }

  const provided = providedToken?.trim() || null;
  if (!provided) {
    return { valid: false, reason: "missing" };
  }

  if (!timingSafeCompare(provided, expected)) {
    return { valid: false, reason: "invalid" };
  }

  return { valid: true };
}
