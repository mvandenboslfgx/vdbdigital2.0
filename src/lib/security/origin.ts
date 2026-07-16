import "server-only";
import { headers } from "next/headers";
import { resolveAppUrl } from "@/lib/url/app-url";
import { isProductionRuntime } from "@/lib/runtime/environment";

function collectAllowedOrigins(): Set<string> {
  const allowed = new Set<string>();

  try {
    allowed.add(new URL(resolveAppUrl()).origin);
  } catch {
    // ignore invalid app url — fail closed later
  }

  const explicit = process.env.ALLOWED_ORIGINS;
  if (explicit) {
    for (const part of explicit.split(",")) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      try {
        allowed.add(new URL(trimmed).origin);
      } catch {
        // skip invalid entries
      }
    }
  }

  // Vercel deployment URL (exact origin only — never Host header)
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    try {
      const normalized = vercelUrl.startsWith("http")
        ? vercelUrl
        : `https://${vercelUrl}`;
      allowed.add(new URL(normalized).origin);
    } catch {
      // ignore
    }
  }

  return allowed;
}

/**
 * Exact-origin CSRF check for server mutations.
 * Does not trust the Host header. Uses URL.origin equality only.
 */
export async function verifyOrigin(): Promise<boolean> {
  const headersList = await headers();
  const originHeader = headersList.get("origin");
  const allowed = collectAllowedOrigins();

  if (!originHeader) {
    // Prefer Sec-Fetch-Site when browsers omit Origin on same-site navigations.
    // Never allow missing Origin for mutation guards in production.
    const secFetchSite = headersList.get("sec-fetch-site");
    if (
      (secFetchSite === "same-origin" || secFetchSite === "none") &&
      !isProductionRuntime()
    ) {
      return true;
    }
    return false;
  }

  let origin: string;
  try {
    origin = new URL(originHeader).origin;
  } catch {
    return false;
  }

  return allowed.has(origin);
}

export { isValidRedirectUrl } from "@/lib/security/redirect";
