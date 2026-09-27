import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabasePublicKey } from "@/config/env";
import { assertSafeSupabaseTarget } from "@/lib/security/supabase-target";
import { SERVER_AUTH_COOKIE_OPTIONS } from "@/lib/auth/cookie-options";

interface SessionOptions {
  /** Extra request headers (e.g. x-locale) — merged onto the request */
  requestHeaders?: Headers;
  /** When set, respond with a rewrite instead of next() */
  rewriteUrl?: URL;
}

/**
 * Copy Set-Cookie + cache headers when replacing a response after setAll.
 * Prefer getSetCookie() so multiple cookies are not comma-folded.
 */
export function copySupabaseAuthState(
  from: NextResponse,
  to: NextResponse,
): NextResponse {
  const setCookies =
    typeof from.headers.getSetCookie === "function"
      ? from.headers.getSetCookie()
      : [];
  if (setCookies.length > 0) {
    for (const cookie of setCookies) {
      to.headers.append("Set-Cookie", cookie);
    }
  } else {
    from.cookies.getAll().forEach((cookie) => {
      to.cookies.set(cookie.name, cookie.value);
    });
  }
  for (const header of ["cache-control", "expires", "pragma"] as const) {
    const value = from.headers.get(header);
    if (value) to.headers.set(header, value);
  }
  return to;
}

function applyRequestHeaderOverrides(
  request: NextRequest,
  overrides?: Headers,
): void {
  if (!overrides) return;
  // NextRequest.headers is mutable in middleware/proxy for these overrides.
  overrides.forEach((value, key) => {
    request.headers.set(key, value);
  });
}

/**
 * Official Next.js contract: pass request.headers so OpenNext receives
 * x-middleware-request-cookie after request.cookies mutations.
 */
function buildSessionResponse(
  request: NextRequest,
  options: SessionOptions,
): NextResponse {
  applyRequestHeaderOverrides(request, options.requestHeaders);
  if (options.rewriteUrl) {
    return NextResponse.rewrite(options.rewriteUrl, {
      request: { headers: request.headers },
    });
  }
  return NextResponse.next({
    request: { headers: request.headers },
  });
}

function isAuthCookieClear(
  value: string,
  cookieOptions?: Parameters<NextResponse["cookies"]["set"]>[2],
): boolean {
  if (!value) return true;
  if (cookieOptions?.maxAge === 0) return true;
  if (cookieOptions?.expires instanceof Date && cookieOptions.expires.getTime() <= Date.now()) {
    return true;
  }
  return false;
}

/**
 * Apply refreshed auth cookies to the *request* Cookie jar for RSC.
 * Clears must DELETE from the request (not set empty) — empty chunks in the
 * Cookie header break chunked Supabase session parse, and RSC setAll is a
 * no-op so it cannot recover via refresh.
 */
function applyAuthCookiesToRequest(
  request: NextRequest,
  cookiesToSet: Array<{
    name: string;
    value: string;
    options?: Parameters<NextResponse["cookies"]["set"]>[2];
  }>,
): void {
  for (const { name, value, options: cookieOptions } of cookiesToSet) {
    if (isAuthCookieClear(value, cookieOptions)) {
      request.cookies.delete(name);
    } else {
      request.cookies.set(name, value);
    }
  }

  // Drop any leftover empty auth values that were already on the request.
  for (const cookie of request.cookies.getAll()) {
    if (
      (cookie.name.startsWith("sb-") || cookie.name.includes("auth-token")) &&
      !cookie.value
    ) {
      request.cookies.delete(cookie.name);
    }
  }
}

function normalizeAuthCookieOptions(
  options?: Parameters<NextResponse["cookies"]["set"]>[2],
): Parameters<NextResponse["cookies"]["set"]>[2] {
  const secure =
    process.env.NODE_ENV === "production" ? true : (options?.secure ?? false);
  return {
    ...options,
    path: "/",
    maxAge: options?.maxAge,
    expires: options?.expires,
    httpOnly: options?.httpOnly ?? true,
    secure,
    sameSite:
      options?.sameSite === true
        ? "strict"
        : options?.sameSite === false
          ? "lax"
          : (options?.sameSite ?? "lax"),
    domain: undefined,
  };
}

/**
 * Official @supabase/ssr Proxy session refresh (Next.js 16).
 */
export async function updateSupabaseSession(
  request: NextRequest,
  options: SessionOptions = {},
): Promise<NextResponse> {
  assertSafeSupabaseTarget(process.env);

  let supabaseResponse = buildSessionResponse(request, options);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = getSupabasePublicKey();
  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookieOptions: SERVER_AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        // 1) Request jar for RSC: write values, DELETE clears (never empty values).
        applyAuthCookiesToRequest(request, cookiesToSet);
        // 2) Rebuild response so x-middleware-request-cookie carries the new jar.
        supabaseResponse = buildSessionResponse(request, options);
        // 3) Browser Set-Cookie: ALL cookies including Max-Age=0 stale-chunk clears.
        cookiesToSet.forEach(({ name, value, options: cookieOptions }) => {
          supabaseResponse.cookies.set(
            name,
            value,
            normalizeAuthCookieOptions(cookieOptions),
          );
        });
        if (headers) {
          Object.entries(headers).forEach(([key, value]) => {
            supabaseResponse.headers.set(key, value);
          });
        }
      },
    },
  });

  await supabase.auth.getClaims();
  return supabaseResponse;
}

/**
 * Shared cookie adapter for Route Handlers that MUST persist session cookies.
 */
export function createRouteHandlerSupabase(
  request: NextRequest,
  pending: {
    cookies: Array<{
      name: string;
      value: string;
      options?: Parameters<NextResponse["cookies"]["set"]>[2];
    }>;
    headers: Record<string, string>;
  },
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = getSupabasePublicKey();
  if (!supabaseUrl || !supabaseKey) return null;

  return createServerClient(supabaseUrl, supabaseKey, {
    cookieOptions: SERVER_AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        pending.cookies.push(...cookiesToSet);
        if (headers) Object.assign(pending.headers, headers);
      },
    },
  });
}

export function applyPendingAuthCookies(
  response: NextResponse,
  pending: Array<{
    name: string;
    value: string;
    options?: Parameters<NextResponse["cookies"]["set"]>[2];
  }>,
): void {
  for (const cookie of pending) {
    response.cookies.set(
      cookie.name,
      cookie.value,
      normalizeAuthCookieOptions(cookie.options),
    );
  }
}
