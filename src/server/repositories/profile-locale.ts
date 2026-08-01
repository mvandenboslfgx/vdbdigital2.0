import "server-only";
import { createServiceRoleClient } from "@/lib/database/server";
import { parsePreferredLocale } from "@/i18n/preference";
import type { Locale } from "@/i18n/config";

/**
 * Account language preference (`profiles.preferred_locale`, nullable).
 * Values are always re-validated on read: the column is allowlisted in SQL, but
 * the app must never hand an unvalidated locale to the renderer.
 */
export async function getAccountPreferredLocale(
  userId: string,
): Promise<Locale | null> {
  const supabase = createServiceRoleClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("preferred_locale")
    .eq("id", userId)
    .maybeSingle();

  if (error) return null;
  return parsePreferredLocale(data?.preferred_locale);
}

export async function setAccountPreferredLocale(
  userId: string,
  locale: Locale,
): Promise<boolean> {
  const supabase = createServiceRoleClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from("profiles")
    .update({
      preferred_locale: locale,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  return !error;
}

/**
 * Adopt a guest's explicit language choice as the account preference, without
 * ever overwriting a preference the account already has.
 */
export async function adoptPreferredLocaleIfUnset(
  userId: string,
  locale: Locale,
): Promise<boolean> {
  const supabase = createServiceRoleClient();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from("profiles")
    .update({
      preferred_locale: locale,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .is("preferred_locale", null)
    .select("id");

  return !error && (data?.length ?? 0) > 0;
}
