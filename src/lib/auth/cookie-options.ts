/**
 * Canonical production auth cookie options for server/proxy writes.
 * Path=/ is mandatory so /portal and /portal/* hard navigations receive cookies.
 * Host-only (no Domain) on apex after www→apex canonicalization.
 */
export const SERVER_AUTH_COOKIE_OPTIONS = {
  path: "/",
  sameSite: "lax" as const,
  secure: true,
  httpOnly: true,
  domain: undefined as undefined,
};
