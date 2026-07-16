import "server-only";
import { createServerSupabaseClient } from "@/lib/database/server";
import { AuthError } from "@/server/auth/errors";
import type { AuthenticatedUser } from "@/server/auth/types";

/** Haalt de actuele sessie server-side op — vertrouwt nooit clientinput. */
export async function requireAuthenticatedUser(): Promise<AuthenticatedUser> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    throw new AuthError("UNAUTHENTICATED", "Authenticatie niet geconfigureerd");
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    throw new AuthError("UNAUTHENTICATED");
  }

  return {
    id: user.id,
    email: user.email,
  };
}

/** Optionele sessie — geen throw */
export async function getOptionalAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  try {
    return await requireAuthenticatedUser();
  } catch {
    return null;
  }
}
