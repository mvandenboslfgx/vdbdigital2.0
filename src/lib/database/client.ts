import { createBrowserClient } from "@supabase/ssr";
import {
  getPublicEnv,
  getSupabasePublicKey,
  isSupabasePublicConfigured,
} from "@/config/env";

export function createClient() {
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
