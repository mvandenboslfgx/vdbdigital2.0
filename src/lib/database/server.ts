import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  getServerEnv,
  getSupabasePublicKey,
  isSupabasePublicConfigured,
} from "@/config/env";

export { createAdminClient, createServiceRoleClient } from "@/lib/database/admin";

export async function createServerSupabaseClient() {
  if (!isSupabasePublicConfigured()) {
    return null;
  }

  const env = getServerEnv();
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    getSupabasePublicKey()!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Component — cookies kunnen niet worden gezet
          }
        },
      },
    },
  );
}

/** Publieke clientconfig aanwezig (browser + anon reads) */
export function isSupabaseConfigured(): boolean {
  return isSupabasePublicConfigured();
}

/** Volledige server-side DB-toegang (inclusief Secret key) */
export { isSupabaseFullyConfigured as isSupabaseDatabaseReady } from "@/config/env";
