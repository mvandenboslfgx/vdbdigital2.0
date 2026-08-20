/**
 * Bootstrap / recovery OWNER identity.
 * Authorization is always via admin_roles (OWNER), never email alone.
 * This email is protected from demotion/deletion by normal admin flows.
 */
export const BOOTSTRAP_OWNER_EMAIL = "algemeen@vdbdigital.nl";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isBootstrapOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return normalizeEmail(email) === BOOTSTRAP_OWNER_EMAIL;
}
