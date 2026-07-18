/**
 * EMAIL_FROM / EMAIL_ADMIN helpers.
 * Accepts bare emails and Resend-style "Display Name <email@domain>".
 */

const BARE_EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

/** Extract bare address from optional display-name form. */
export function extractEmailAddress(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const angled = trimmed.match(/<([^<>@\s]+@[^<>@\s]+\.[^<>@\s]+)>/);
  if (angled?.[1]) return angled[1].trim();
  if (BARE_EMAIL_RE.test(trimmed)) return trimmed;
  return null;
}

export function isEmailFromAddress(value: string | undefined | null): boolean {
  if (!value) return false;
  return extractEmailAddress(value) !== null;
}
