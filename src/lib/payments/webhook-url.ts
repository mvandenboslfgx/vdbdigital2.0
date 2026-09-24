import "server-only";
import { getMollieWebhookToken } from "@/config/env";
import { timingSafeCompare } from "@/lib/security/timing-safe";
import { resolveAppUrl } from "@/lib/url/app-url";

export type WebhookUrlResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/**
 * Builds the classic Mollie Payments API webhook URL.
 * Cloudflare Workers are publicly reachable; no hosting-provider bypass query
 * parameter is required. The optional application token remains supported.
 */
export function buildMollieWebhookUrl(): WebhookUrlResult {
  let appUrl: string;
  try {
    appUrl = resolveAppUrl();
  } catch {
    return { ok: false, error: "Application URL is not configured safely" };
  }

  const params = new URLSearchParams();
  const token = getMollieWebhookToken();
  if (token) params.set("token", token);

  const query = params.toString();
  const url = `${appUrl}/api/webhooks/mollie${query ? `?${query}` : ""}`;
  return { ok: true, url };
}

export function verifyMollieWebhookToken(
  providedToken: string | null,
): { valid: true } | { valid: false; reason: "missing" | "invalid" } {
  const expected = getMollieWebhookToken();
  if (!expected) return { valid: true };
  if (!providedToken) return { valid: false, reason: "missing" };
  if (!timingSafeCompare(providedToken, expected)) {
    return { valid: false, reason: "invalid" };
  }
  return { valid: true };
}
