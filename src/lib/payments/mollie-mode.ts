/**
 * Mollie key mode separation — fail closed on unsafe combinations.
 */

export type MollieKeyMode = "test" | "live" | "unknown" | "missing";

/** Read-only env view: `process.env` or an explicit record (tests / harness). */
export type MollieRuntimeEnv =
  | NodeJS.ProcessEnv
  | Readonly<Record<string, string | undefined>>;

export function detectMollieKeyMode(apiKey: string | undefined | null): MollieKeyMode {
  if (!apiKey) return "missing";
  if (apiKey.startsWith("test_")) return "test";
  if (apiKey.startsWith("live_")) return "live";
  return "unknown";
}

export function isLocalOrPreviewRuntime(
  env: MollieRuntimeEnv = process.env,
): boolean {
  const appUrl = env.NEXT_PUBLIC_APP_URL ?? "";
  if (/localhost|127\.0\.0\.1/i.test(appUrl)) return true;
  if (env.VERCEL_ENV === "preview") return true;
  if (env.VERCEL_ENV === "development") return true;
  return false;
}

export function isProductionDeployment(env: MollieRuntimeEnv = process.env): boolean {
  return env.VERCEL_ENV === "production" || (
    env.NODE_ENV === "production" && env.VERCEL_ENV !== "preview" && !isLocalOrPreviewRuntime(env)
  );
}

/**
 * Live keys must never be used on localhost/preview.
 * Unknown keys are rejected.
 */
export function assertMollieKeySafeForRuntime(
  apiKey: string | undefined | null,
  env: MollieRuntimeEnv = process.env,
): { ok: true; mode: MollieKeyMode } | { ok: false; reason: string; mode: MollieKeyMode } {
  const mode = detectMollieKeyMode(apiKey);
  if (mode === "missing") {
    return { ok: false, reason: "MOLLIE_API_KEY missing", mode };
  }
  if (mode === "unknown") {
    return { ok: false, reason: "MOLLIE_API_KEY must start with test_ or live_", mode };
  }
  if (mode === "live" && isLocalOrPreviewRuntime(env)) {
    return {
      ok: false,
      reason: "Live Mollie key is not allowed on localhost/preview",
      mode,
    };
  }
  const appEnv = (env.APP_ENV ?? "").trim().toLowerCase();
  if (mode === "live" && appEnv === "staging") {
    return {
      ok: false,
      reason: "Live Mollie key is not allowed when APP_ENV=staging",
      mode,
    };
  }
  // Production must not silently run test-mode checkout unless explicitly allowed.
  if (
    mode === "test" &&
    (isProductionDeployment(env) || appEnv === "production") &&
    env.ALLOW_MOLLIE_TEST_IN_PRODUCTION !== "true"
  ) {
    return {
      ok: false,
      reason: "Test Mollie key is not allowed in production runtime",
      mode,
    };
  }
  return { ok: true, mode };
}

/** For release-gate: production enablement expects live only after explicit decision;
 * until then test mode is the verification mode. */
export function describeMollieModeForGate(
  apiKey: string | undefined | null,
  env: MollieRuntimeEnv = process.env,
): string {
  const check = assertMollieKeySafeForRuntime(apiKey, env);
  if (!check.ok) return `NOT SAFE: ${check.reason}`;
  if (check.mode === "test") return "test mode (correct for P0.5 verification)";
  return "live mode configured (manual production decision required)";
}
