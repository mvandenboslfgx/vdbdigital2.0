/**
 * Centrale base-URL-resolutie voor Cloudflare/OpenNext.
 *
 * Contract:
 * - Local development: localhost (of expliciete APP_URL)
 * - Cloudflare preview: expliciete workers.dev/pages.dev preview-URL
 * - Cloudflare production: exact https://vdbdigital.nl (fail-closed)
 *
 * Production valt nooit terug op een preview-host, localhost of www.
 */

export const CANONICAL_PRODUCTION_ORIGIN = "https://vdbdigital.nl" as const;

const LOCALHOST_DEFAULT = "http://localhost:3000";

export type DeploymentEnvironment =
  | "production"
  | "preview"
  | "development"
  | "unknown";

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

export function isLocalhostUrl(url: string): boolean {
  try {
    const hostname = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  } catch {
    return false;
  }
}

export function isCloudflarePreviewHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h.endsWith(".workers.dev") || h.endsWith(".pages.dev");
}

/** Legacy host detector kept only to reject old preview origins. */
export function isVercelPreviewHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h.endsWith(".vercel.app") || h.endsWith(".now.sh");
}

export function isHostedPreviewHost(hostname: string): boolean {
  return isCloudflarePreviewHost(hostname) || isVercelPreviewHost(hostname);
}

export function getDeploymentEnvironment(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): DeploymentEnvironment {
  const explicit = env.VDB_DEPLOYMENT_ENV?.trim().toLowerCase();
  if (explicit === "production" || explicit === "preview" || explicit === "development") {
    return explicit;
  }

  const rawUrl = env.NEXT_PUBLIC_APP_URL?.trim();
  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
      if (isCloudflarePreviewHost(parsed.hostname)) return "preview";
      if (
        stripTrailingSlash(parsed.origin) === CANONICAL_PRODUCTION_ORIGIN &&
        env.NODE_ENV === "production"
      ) {
        return "production";
      }
      if (isLocalhostUrl(parsed.origin)) return "development";
    } catch {
      return "unknown";
    }
  }

  return env.NODE_ENV === "production" ? "unknown" : "development";
}

export function isPreviewDeployment(): boolean {
  return getDeploymentEnvironment() === "preview";
}

export function isProductionDeployment(): boolean {
  return getDeploymentEnvironment() === "production";
}

export type ProductionAppUrlEvaluation =
  | { ok: true; origin: typeof CANONICAL_PRODUCTION_ORIGIN }
  | { ok: false; reason: string };

export function evaluateProductionAppUrl(
  raw: string | undefined | null,
): ProductionAppUrlEvaluation {
  if (raw == null || String(raw).trim() === "") {
    return {
      ok: false,
      reason: `NEXT_PUBLIC_APP_URL is required and must be exactly ${CANONICAL_PRODUCTION_ORIGIN}`,
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(String(raw).trim());
  } catch {
    return {
      ok: false,
      reason: `NEXT_PUBLIC_APP_URL must be a valid absolute URL equal to ${CANONICAL_PRODUCTION_ORIGIN}`,
    };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, reason: "NEXT_PUBLIC_APP_URL must not contain credentials" };
  }
  if (parsed.search || parsed.hash) {
    return { ok: false, reason: "NEXT_PUBLIC_APP_URL must not contain query or fragment" };
  }
  if (parsed.protocol !== "https:") {
    return {
      ok: false,
      reason: `NEXT_PUBLIC_APP_URL must use HTTPS (${CANONICAL_PRODUCTION_ORIGIN})`,
    };
  }
  if (parsed.pathname !== "/" && parsed.pathname !== "") {
    return {
      ok: false,
      reason: `NEXT_PUBLIC_APP_URL must be an origin only (${CANONICAL_PRODUCTION_ORIGIN})`,
    };
  }

  const origin = stripTrailingSlash(parsed.origin);
  if (isLocalhostUrl(origin)) {
    return {
      ok: false,
      reason: `NEXT_PUBLIC_APP_URL must not be localhost in production (${CANONICAL_PRODUCTION_ORIGIN})`,
    };
  }
  if (parsed.hostname.toLowerCase() === "www.vdbdigital.nl") {
    return {
      ok: false,
      reason: `NEXT_PUBLIC_APP_URL must use apex, not www (${CANONICAL_PRODUCTION_ORIGIN})`,
    };
  }
  if (isHostedPreviewHost(parsed.hostname)) {
    return {
      ok: false,
      reason: `NEXT_PUBLIC_APP_URL must not be a preview host (${CANONICAL_PRODUCTION_ORIGIN})`,
    };
  }
  if (origin !== CANONICAL_PRODUCTION_ORIGIN) {
    return {
      ok: false,
      reason: `NEXT_PUBLIC_APP_URL must be exactly ${CANONICAL_PRODUCTION_ORIGIN}`,
    };
  }

  return { ok: true, origin: CANONICAL_PRODUCTION_ORIGIN };
}

export function assertProductionAppUrl(raw: string | undefined | null): string {
  const result = evaluateProductionAppUrl(raw);
  if (!result.ok) throw new Error(result.reason);
  return result.origin;
}

export function resolveAppUrl(): string {
  const deployment = getDeploymentEnvironment();
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (deployment === "production") {
    return assertProductionAppUrl(explicit);
  }

  if (deployment === "preview") {
    if (!explicit || isLocalhostUrl(explicit)) {
      throw new Error(
        "NEXT_PUBLIC_APP_URL must be the Cloudflare preview origin when VDB_DEPLOYMENT_ENV=preview",
      );
    }
    return stripTrailingSlash(
      explicit.startsWith("http") ? explicit : `https://${explicit}`,
    );
  }

  if (explicit) {
    return stripTrailingSlash(
      explicit.startsWith("http") ? explicit : `https://${explicit}`,
    );
  }

  return LOCALHOST_DEFAULT;
}

export function resolvePublicSiteUrl(): string {
  return resolveAppUrl();
}
