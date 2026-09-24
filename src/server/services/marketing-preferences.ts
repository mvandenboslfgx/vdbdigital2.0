import "server-only";

import { createServiceRoleClient } from "@/lib/database/server";
import { syncMarketingPreference } from "@/lib/email/resend";
import type { Locale } from "@/i18n/config";

export type MarketingSource =
  | "contact_form"
  | "quote_form"
  | "checkout"
  | "portal_profile";

export async function recordMarketingPreference(input: {
  email: string;
  optIn: boolean;
  source: MarketingSource;
  locale?: Locale;
  userId?: string | null;
  firstName?: string;
  lastName?: string;
}): Promise<{ stored: boolean; synced: boolean }> {
  const email = input.email.trim().toLowerCase();
  if (!email) return { stored: false, synced: false };

  const now = new Date().toISOString();
  const supabase = createServiceRoleClient();

  let stored = false;
  let recordId: string | null = null;

  if (supabase) {
    const { data: existing } = await supabase
      .from("marketing_preferences")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    const payload = {
      email,
      user_id: input.userId ?? null,
      status: input.optIn ? "OPTED_IN" : "OPTED_OUT",
      source: input.source,
      locale: input.locale === "en" ? "en" : "nl",
      consent_version: "marketing-v1",
      consented_at: input.optIn ? now : null,
      revoked_at: input.optIn ? null : now,
      updated_at: now,
    };

    if (existing?.id) {
      const { data, error } = await supabase
        .from("marketing_preferences")
        .update(payload)
        .eq("id", existing.id)
        .select("id")
        .maybeSingle();
      stored = !error && Boolean(data?.id);
      recordId = data?.id ?? existing.id;
    } else {
      const { data, error } = await supabase
        .from("marketing_preferences")
        .insert(payload)
        .select("id")
        .maybeSingle();
      stored = !error && Boolean(data?.id);
      recordId = data?.id ?? null;
    }
  }

  const sync = await syncMarketingPreference({
    email,
    firstName: input.firstName,
    lastName: input.lastName,
    optIn: input.optIn,
  });

  if (supabase && recordId) {
    await supabase
      .from("marketing_preferences")
      .update({
        resend_synced_at: sync.synced ? now : null,
        resend_last_error: sync.synced ? null : sync.reason ?? "Unknown sync error",
        updated_at: now,
      })
      .eq("id", recordId);
  }

  return { stored, synced: sync.synced };
}

export async function getMarketingPreference(input: {
  email: string;
  userId?: string | null;
}): Promise<boolean> {
  const supabase = createServiceRoleClient();
  if (!supabase) return false;

  let query = supabase
    .from("marketing_preferences")
    .select("status")
    .ilike("email", input.email.trim().toLowerCase());

  if (input.userId) {
    query = query.or(`user_id.eq.${input.userId},user_id.is.null`);
  }

  const { data } = await query
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.status === "OPTED_IN";
}
