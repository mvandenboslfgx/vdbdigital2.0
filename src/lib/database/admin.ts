import "server-only";
import { getServerEnv, getSupabaseSecretKey, isSupabaseFullyConfigured } from "@/config/env";

/**
 * Supabase admin client — Secret key, bypasses RLS.
 * Alleen server-side gebruiken (mutaties, seed, webhooks, audit).
 */
export function createAdminClient() {
  if (!isSupabaseFullyConfigured()) {
    return null;
  }

  const env = getServerEnv();
  const secretKey = getSupabaseSecretKey();
  if (!secretKey) {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require("@supabase/supabase-js") as typeof import("@supabase/supabase-js");
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL!, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** @deprecated Gebruik createAdminClient */
export function createServiceRoleClient() {
  return createAdminClient();
}
