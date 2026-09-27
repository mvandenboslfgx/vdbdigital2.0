import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  getServerEnv,
  getSupabasePublicKey,
  isSupabasePublicConfigured,
} from "@/config/env";
import { assertSafeSupabaseTarget } from "@/lib/security/supabase-target";
import { SERVER_AUTH_COOKIE_OPTIONS } from "@/lib/auth/cookie-options";

export { createAdminClient, createServiceRoleClient } from "@/lib/database/admin";

export { SERVER_AUTH_COOKIE_OPTIONS } from "@/lib/auth/cookie-options";

/**
 * RSC / layout client — READ cookies only.
 *
 * CRITICAL (Cloudflare/OpenNext): never call cookieStore.set from RSC.
 * Handler Set-Cookie on HTML responses can Max-Age=0 clear auth chunks when
 * Proxy did not also rewrite those names — hard navigation then loses the jar
 * while soft-nav still shows a cached shell.
 *
 * Proxy (updateSupabaseSession + getClaims) owns refresh writes.
 */
export async function createServerSupabaseClient() {
  assertSafeSupabaseTarget(process.env);
  if (!isSupabasePublicConfigured()) {
    return null;
  }

  const env = getServerEnv();
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    getSupabasePublicKey()!,
    {
      cookieOptions: SERVER_AUTH_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Permanent no-op for RSC — Proxy owns session cookie writes.
        },
      },
    },
  );
}

/**
 * Cookie-writing adapter for auth Server Actions only (login/signup/password).
 * OAuth exchange must use Route Handlers (/auth/callback).
 */
export async function createAuthActionSupabaseClient() {
  assertSafeSupabaseTarget(process.env);
  if (!isSupabasePublicConfigured()) {
    return null;
  }

  const env = getServerEnv();
  const cookieStore = await cookies();
  const secure = process.env.NODE_ENV === "production";

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    getSupabasePublicKey()!,
    {
      cookieOptions: {
        ...SERVER_AUTH_COOKIE_OPTIONS,
        secure,
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet, _headers) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, {
                ...options,
                path: "/",
                sameSite: "lax",
                secure,
                httpOnly: options?.httpOnly ?? true,
                domain: undefined,
              });
            });
          } catch {
            // Action context may not allow cookie writes in some edge cases.
          }
        },
      },
    },
  );
}

export function isSupabaseConfigured(): boolean {
  return isSupabasePublicConfigured();
}

export { isSupabaseFullyConfigured as isSupabaseDatabaseReady } from "@/config/env";
