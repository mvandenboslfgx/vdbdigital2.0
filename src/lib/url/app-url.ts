/**
 * Centrale base-URL-resolutie — nooit clientinput vertrouwen.
 *
 * - Lokaal: localhost
 * - Vercel Preview: https://VERCEL_URL
 * - Production: NEXT_PUBLIC_APP_URL (definitief domein)
 */
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

/** Server-side canonical application URL for redirects, webhooks, e-mail and metadata. */
export function resolveAppUrl(): string {
  if (process.env.VERCEL === "1") {
    const vercelHost = process.env.VERCEL_URL?.trim();

    if (isPreviewDeployment() && vercelHost) {
      return stripTrailingSlash(normalizeHttpsHost(vercelHost));
    }

    if (isProductionDeployment()) {
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
  }

  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) {
    return stripTrailingSlash(
      explicit.startsWith("http") ? explicit : `https://${explicit}`,
    );
  }

  return LOCALHOST_DEFAULT;
}
