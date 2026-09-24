/**
 * Mollie key mode separation — fail closed on unsafe combinations.
 * Hosting target: Cloudflare/OpenNext.
 */

import {
  getDeploymentEnvironment,
  isLocalhostUrl,
} from "@/lib/url/app-url";

export type MollieKeyMode = "test" | "live" | "unknown" | "missing";

export function detectMollieKeyMode(apiKey: string | undefined | null): MollieKeyMode {
  if (!apiKey) return "missing";
  if (apiKey.startsWith("test_")) return "test";
  if (apiKey.startsWith("live_")) return "live";
  return "unknown";
}

export function isLocalOrPreviewRuntime(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  const appUrl = env.NEXT_PUBLIC_APP_URL ?? "";
  if (appUrl && isLocalhostUrl(appUrl)) return true;
  const deployment = getDeploymentEnvironment(env);
  return deployment === "development" || deployment === "preview";
}

export function isProductionDeployment(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  return getDeploymentEnvironment(env) === "production";
}

/**
 * Live keys are accepted only on the explicitly identified production origin.
 * Preview/development/unknown runtimes fail closed for live keys.
 */
export function assertMollieKeySafeForRuntime(
  apiKey: string | undefined | null,
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): { ok: true; mode: MollieKeyMode } | { ok: false; reason: string; mode: MollieKeyMode } {
  const mode = detectMollieKeyMode(apiKey);
  if (mode === "missing") {
    return { ok: false, reason: "MOLLIE_API_KEY missing", mode };
  }
  if (mode === "unknown") {
    return { ok: false, reason: "MOLLIE_API_KEY must start with test_ or live_", mode };
  }
  if (mode === "live" && !isProductionDeployment(env)) {
    return {
      ok: false,
      reason: "Live Mollie key is allowed only on the Cloudflare production deployment",
      mode,
    };
  }
  return { ok: true, mode };
}

export function describeMollieModeForGate(
  apiKey: string | undefined | null,
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): string {
  const check = assertMollieKeySafeForRuntime(apiKey, env);
  if (!check.ok) return `NOT SAFE: ${check.reason}`;
  if (check.mode === "test") return "test mode (safe for verification)";
  return "live mode configured for production";
}
