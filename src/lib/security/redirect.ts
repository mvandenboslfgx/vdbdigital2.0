import { resolveAppUrl } from "@/lib/url/app-url";

const ALLOWED_INTERNAL_PREFIXES = [
  "/admin",
  "/portal",
  "/inloggen",
  "/account-aanmaken",
  "/wachtwoord-vergeten",
  "/wachtwoord-herstellen",
  "/account-activeren",
  "/uitnodiging",
  "/e-mail-bevestigen",
  "/uitloggen",
  "/auth/",
] as const;

export function isValidRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const appOrigin = new URL(resolveAppUrl()).origin;
    return parsed.origin === appOrigin;
  } catch {
    return false;
  }
}

/** Alleen relatieve interne paden — geen open redirects. */
export function isSafeInternalPath(path: string | null | undefined): path is string {
  if (!path || typeof path !== "string") return false;
  if (!path.startsWith("/") || path.startsWith("//")) return false;
  if (path.includes("\\") || path.includes("@")) return false;
  try {
    const parsed = new URL(path, "http://local.invalid");
    if (parsed.hostname !== "local.invalid") return false;
    const pathname = parsed.pathname;
    return ALLOWED_INTERNAL_PREFIXES.some((prefix) => {
      if (prefix.endsWith("/")) {
        return pathname.startsWith(prefix) || pathname === prefix.slice(0, -1);
      }
      return pathname === prefix || pathname.startsWith(`${prefix}/`);
    });
  } catch {
    return false;
  }
}

export function safeInternalPathOr(
  path: string | null | undefined,
  fallback: string,
): string {
  return isSafeInternalPath(path) ? path : fallback;
}
