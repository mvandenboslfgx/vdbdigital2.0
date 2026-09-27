/**
 * TEMP auth cookie forensics — names + attributes only, never values/tokens.
 * Remove after AUTH PASS (hard refresh proven in desktop Chrome).
 */

export type CookieMeta = {
  name: string;
  byteLength: number;
  /** Present only when parsed from Set-Cookie */
  path?: string;
  domain?: string | null;
  secure?: boolean;
  sameSite?: string | null;
  httpOnly?: boolean;
  hasMaxAge?: boolean;
  hasExpires?: boolean;
  maxAgeZero?: boolean;
  emptyValue?: boolean;
};

/** TEMP: always on until desktop Chrome hard-refresh AUTH PASS, then remove. */
const FORENSICS_ENABLED = true;

export function describeRequestCookies(
  cookies: Array<{ name: string; value: string }>,
): CookieMeta[] {
  return cookies
    .filter(
      (c) =>
        c.name.startsWith("sb-") ||
        c.name.includes("auth") ||
        c.name.includes("code-verifier") ||
        c.name.includes("pkce"),
    )
    .map((c) => ({
      name: c.name,
      byteLength: c.value?.length ?? 0,
      emptyValue: !c.value,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Parse a single Set-Cookie header into safe metadata (no cookie value). */
export function describeSetCookieHeader(header: string): CookieMeta {
  const parts = header.split(";").map((p) => p.trim());
  const [nv, ...attrs] = parts;
  const eq = nv.indexOf("=");
  const name = eq >= 0 ? nv.slice(0, eq) : nv;
  const value = eq >= 0 ? nv.slice(eq + 1) : "";

  let path: string | undefined;
  let domain: string | null | undefined;
  let secure = false;
  let httpOnly = false;
  let sameSite: string | null = null;
  let hasMaxAge = false;
  let hasExpires = false;
  let maxAgeZero = false;

  for (const attr of attrs) {
    const lower = attr.toLowerCase();
    if (lower.startsWith("path=")) path = attr.slice(5);
    else if (lower.startsWith("domain=")) domain = attr.slice(7);
    else if (lower === "secure") secure = true;
    else if (lower === "httponly") httpOnly = true;
    else if (lower.startsWith("samesite=")) sameSite = attr.slice(9);
    else if (lower.startsWith("max-age=")) {
      hasMaxAge = true;
      maxAgeZero = attr.slice(8) === "0";
    } else if (lower.startsWith("expires=")) hasExpires = true;
  }

  return {
    name,
    byteLength: value.length,
    path,
    domain: domain ?? null,
    secure,
    sameSite,
    httpOnly,
    hasMaxAge,
    hasExpires,
    maxAgeZero,
    emptyValue: value.length === 0,
  };
}

export function describeSetCookieHeaders(headers: string[]): CookieMeta[] {
  return headers.map(describeSetCookieHeader);
}

export function logAuthForensics(
  stage: string,
  payload: Record<string, unknown>,
): void {
  if (!FORENSICS_ENABLED) return;
  // Structured log — never includes token values.
  console.info(
    JSON.stringify({
      type: "auth_cookie_forensics",
      stage,
      t: Date.now(),
      ...payload,
    }),
  );
}
