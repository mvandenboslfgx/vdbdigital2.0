/**
 * Centrale base-URL-resolutie — nooit clientinput vertrouwen.
 *
 * Contract:
 * - Local / non-Vercel: http://localhost:3000 (or explicit APP_URL)
 * - Vercel Preview: explicit non-localhost APP_URL, else https://${VERCEL_URL}
 * - Vercel Production: MUST be exactly https://vdbdigital.nl (fail-closed)
 *
 * Production never falls back to VERCEL_URL, localhost, or www.
 */

export const CANONICAL_PRODUCTION_ORIGIN = "https://vdbdigital.nl" as const;

const LOCALHOST_DEFAULT = "http://localhost:3000";

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

function normalizeHttpsHost(host: string): string {
  const cleaned = host.replace(/^https?:\/\//, "");
  return `https://${cleaned}`;
}

export function isLocalhostUrl(url: string): boolean {
  try {
    const hostname = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  } catch {
    return false;
  }
}

export function isPreviewDeployment(): boolean {
  return process.env.VERCEL === "1" && process.env.VERCEL_ENV === "preview";
}

export function isProductionDeployment(): boolean {
  return process.env.VERCEL === "1" && process.env.VERCEL_ENV === "production";
}

export function isVercelPreviewHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h.endsWith(".vercel.app") || h.endsWith(".now.sh");
}

export type ProductionAppUrlEvaluation =
  | { ok: true; origin: typeof CANONICAL_PRODUCTION_ORIGIN }
  | { ok: false; reason: string };

/**
 * Fail-closed evaluation for Vercel Production NEXT_PUBLIC_APP_URL.
 * Does not log env values or secrets.
 */
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
    return {
      ok: false,
      reason: "NEXT_PUBLIC_APP_URL must not contain credentials",
    };
  }
  if (parsed.search || parsed.hash) {
    return {
      ok: false,
      reason: "NEXT_PUBLIC_APP_URL must not contain query or fragment",
    };
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
  if (isVercelPreviewHost(parsed.hostname)) {
    return {
      ok: false,
      reason: `NEXT_PUBLIC_APP_URL must not be a Vercel preview host (${CANONICAL_PRODUCTION_ORIGIN})`,
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

/** Throws a safe Error when production APP_URL is missing or invalid. */
export function assertProductionAppUrl(raw: string | undefined | null): string {
  const result = evaluateProductionAppUrl(raw);
  if (!result.ok) {
    throw new Error(result.reason);
  }
  return result.origin;
}

/**
 * Server-side canonical application URL for redirects, webhooks, e-mail and metadata.
 * Production: fail-closed to https://vdbdigital.nl only — never VERCEL_URL / localhost / www.
 */
export function resolveAppUrl(): string {
  if (process.env.VERCEL === "1") {
    const vercelHost = process.env.VERCEL_URL?.trim();

    if (isPreviewDeployment()) {
      const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
      if (explicit && !isLocalhostUrl(explicit)) {
        return stripTrailingSlash(
          explicit.startsWith("http") ? explicit : `https://${explicit}`,
        );
      }
      if (vercelHost) {
        return stripTrailingSlash(normalizeHttpsHost(vercelHost));
      }
    }

    if (isProductionDeployment()) {
      // Fail-closed: no VERCEL_URL / localhost rescue path.
      return assertProductionAppUrl(process.env.NEXT_PUBLIC_APP_URL);
    }
  }

  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) {
    return stripTrailingSlash(
      explicit.startsWith("http") ? explicit : `https://${explicit}`,
    );
  }

  return LOCALHOST_DEFAULT;
}

/**
 * Public site URL for SEO metadata (metadataBase, sitemap, JSON-LD).
 * Same rules as resolveAppUrl — single source of truth.
 */
export function resolvePublicSiteUrl(): string {
  return resolveAppUrl();
}
