/** Verwijdert gevoelige queryparameters voor logging. */
const SENSITIVE_QUERY_KEYS = new Set([
  "token",
  "secret",
  "x-vercel-protection-bypass",
  "x-vercel-set-bypass-cookie",
]);

export function sanitizeUrlForLog(url: string): string {
  try {
    const parsed = new URL(url);
    for (const key of [...parsed.searchParams.keys()]) {
      if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) {
        parsed.searchParams.set(key, "[REDACTED]");
      }
    }
    return parsed.toString();
  } catch {
    return "[invalid-url]";
  }
}
