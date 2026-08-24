import { createBrowserClient } from "@supabase/ssr";
import {
  getPublicEnv,
  getSupabasePublicKey,
  isSupabasePublicConfigured,
} from "@/config/env";
import { assertSafeSupabaseTarget } from "@/lib/security/supabase-target";

export function createClient() {
  assertSafeSupabaseTarget(process.env);
  if (!isSupabasePublicConfigured()) {
    return null;
  }

  const env = getPublicEnv();
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    getSupabasePublicKey()!,
  );
}

export { isSupabasePublicConfigured as isSupabaseConfigured };
