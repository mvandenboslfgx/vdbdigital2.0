import { isLocale, type Locale } from "@/i18n/config";

/** Safe query keys preserved across language switches. */
export const SAFE_QUERY_KEYS = new Set([
  "product",
  "category",
  "categorie",
  "ref",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
]);

/** Sensitive keys stripped on language switch (auth, payment, tokens). */
export const SENSITIVE_QUERY_KEYS = new Set([
  "token",
  "access_token",
  "refresh_token",
  "code",
  "state",
  "session",
  "session_id",
  "payment_id",
  "paymentId",
  "mollie",
  "checkout",
  "password",
  "secret",
  "key",
  "api_key",
  "apikey",
]);

export function filterSearchParams(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): URLSearchParams {
  const source =
    params instanceof URLSearchParams
      ? params
      : new URLSearchParams(
          Object.entries(params).flatMap(([k, v]) => {
            if (v === undefined) return [];
            if (Array.isArray(v)) return v.map((item) => [k, item] as [string, string]);
            return [[k, v] as [string, string]];
          }),
        );

  const out = new URLSearchParams();
  for (const [key, value] of source.entries()) {
    const lower = key.toLowerCase();
    if (SENSITIVE_QUERY_KEYS.has(lower) || SENSITIVE_QUERY_KEYS.has(key)) continue;
    if (!SAFE_QUERY_KEYS.has(key) && !SAFE_QUERY_KEYS.has(lower)) continue;
    out.append(key, value);
  }
  return out;
}

export function appendFilteredSearch(path: string, params: URLSearchParams): string {
  const qs = params.toString();
  if (!qs) return path;
  return `${path}?${qs}`;
}

/** Only `en` | `nl` — never trust arbitrary client locale strings. */
export function parseFormLocale(raw: unknown): Locale {
  if (typeof raw === "string" && isLocale(raw)) return raw;
  return "en";
}
