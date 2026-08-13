/**
 * Hard guards for staging Mollie E2E (server-only). No secret values returned.
 */

export const STAGING_SUPABASE_REF = "qzekuvmgfekzsowdecyk";
export const PRODUCTION_SUPABASE_DENYLIST_REF = "nhsrdnjfsxfikfbdmdfj";
export const STAGING_VERCEL_PROJECT_ID = "prj_ox86yWKOv2cP7JHRNrG8qpmcvqf2";

const PROD_HOST_DENY = [
  "vdbdigital.nl",
  "www.vdbdigital.nl",
  "nhsrdnjfsxfikfbdmdfj.supabase.co",
];

export type GuardResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

export function detectMollieShape(
  key: string | undefined | null,
): "missing" | "test" | "live" | "invalid" {
  if (!key || !String(key).trim()) return "missing";
  const v = String(key).trim();
  if (v.startsWith("test_")) return "test";
  if (v.startsWith("live_")) return "live";
  return "invalid";
}

export function assertStagingMollieE2EGuards(env: {
  allowFlag?: string | undefined;
  mollieApiKey?: string | undefined;
  checkoutEnabled?: string | undefined;
  stagingAppUrl?: string | undefined;
  supabaseUrl?: string | undefined;
  supabaseRef?: string | undefined;
}): GuardResult {
  if (env.allowFlag !== "true") {
    return {
      ok: false,
      code: "ALLOW_FLAG",
      message: "ALLOW_STAGING_MOLLIE_E2E must be exactly true",
    };
  }

  const shape = detectMollieShape(env.mollieApiKey);
  if (shape === "live") {
    return {
      ok: false,
      code: "LIVE_MOLLIE",
      message: "STOP — LIVE MOLLIE CREDENTIAL DETECTED",
    };
  }
  if (shape !== "test") {
    return {
      ok: false,
      code: "MOLLIE_KEY",
      message: "MOLLIE_API_KEY must be present and test_-shaped",
    };
  }

  const checkout = (env.checkoutEnabled ?? "").trim().toLowerCase();
  if (checkout === "true" || checkout === "1" || checkout === "yes") {
    return {
      ok: false,
      code: "CHECKOUT_ENABLED",
      message: "CHECKOUT_ENABLED must be false/absent",
    };
  }

  const ref = (env.supabaseRef ?? "").trim();
  if (ref === PRODUCTION_SUPABASE_DENYLIST_REF) {
    return {
      ok: false,
      code: "PROD_REF",
      message: "Production Supabase ref is hard-denied",
    };
  }
  if (ref && ref !== STAGING_SUPABASE_REF) {
    return {
      ok: false,
      code: "STAGING_REF",
      message: `staging ref must be exactly ${STAGING_SUPABASE_REF}`,
    };
  }

  const supabaseUrl = (env.supabaseUrl ?? "").trim();
  if (supabaseUrl) {
    try {
      const host = new URL(supabaseUrl).hostname.toLowerCase();
      if (host.includes(PRODUCTION_SUPABASE_DENYLIST_REF)) {
        return {
          ok: false,
          code: "PROD_URL",
          message: "Production Supabase URL is hard-denied",
        };
      }
      if (!host.startsWith(`${STAGING_SUPABASE_REF}.`)) {
        return {
          ok: false,
          code: "STAGING_URL",
          message: "Supabase URL must point at staging project",
        };
      }
    } catch {
      return { ok: false, code: "STAGING_URL", message: "Invalid Supabase URL" };
    }
  }

  const appUrl = (env.stagingAppUrl ?? "").trim();
  if (!appUrl) {
    return { ok: false, code: "APP_URL", message: "STAGING_APP_URL required" };
  }
  let parsed: URL;
  try {
    parsed = new URL(appUrl);
  } catch {
    return { ok: false, code: "APP_URL", message: "STAGING_APP_URL invalid" };
  }
  if (parsed.protocol !== "https:") {
    return { ok: false, code: "APP_URL", message: "STAGING_APP_URL must be https" };
  }
  const host = parsed.hostname.toLowerCase();
  for (const denied of PROD_HOST_DENY) {
    if (host === denied || host.endsWith(`.${denied}`)) {
      return {
        ok: false,
        code: "PROD_HOST",
        message: "Production host is hard-denied",
      };
    }
  }
  // Must be the dedicated staging Vercel project host (preview or assigned).
  if (
    !host.includes("vdb-digital-staging") &&
    !host.endsWith(".vercel.app")
  ) {
    return {
      ok: false,
      code: "APP_HOST",
      message: "STAGING_APP_URL must target staging Vercel project host",
    };
  }
  if (host.includes("vdbdigital") && !host.includes("vdb-digital-staging")) {
    return {
      ok: false,
      code: "APP_HOST",
      message: "STAGING_APP_URL must not target production brand domains",
    };
  }

  return { ok: true };
}

/** Build classic Mollie webhook URL without Vercel bypass (app route reachable). */
export function buildStagingMollieWebhookUrl(
  stagingAppUrl: string,
  webhookToken: string,
): string {
  const base = stagingAppUrl.replace(/\/$/, "");
  const params = new URLSearchParams({ token: webhookToken });
  return `${base}/api/webhooks/mollie?${params.toString()}`;
}

export function redactPaymentId(id: string | undefined | null): string {
  if (!id) return "absent";
  if (id.length <= 8) return `${id.slice(0, 2)}…`;
  return `${id.slice(0, 8)}…`;
}
