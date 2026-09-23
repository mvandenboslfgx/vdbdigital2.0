"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/database/server";
import { verifyOrigin } from "@/lib/security/origin";
import { writeAuditLog } from "@/lib/security/audit-log";
import { isSafeInternalPath } from "@/lib/security/redirect";
import { resolveAppUrl } from "@/lib/url/app-url";

/**
 * Starts Google OAuth only. Authorization remains entirely server-side through
 * admin_roles / organization_members / RLS after the callback completes.
 */
export async function googleLoginAction(formData: FormData): Promise<void> {
  if (!(await verifyOrigin())) {
    await writeAuditLog({
      action: "auth.google_oauth_failed",
      metadata: { reason: "origin" },
    });
    redirect("/inloggen?fout=google");
  }

  const rawNext = formData.get("next");
  const next =
    typeof rawNext === "string" && isSafeInternalPath(rawNext)
      ? rawNext
      : undefined;

  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/inloggen?fout=config");

  const callback = new URL("/auth/callback", resolveAppUrl());
  if (next) callback.searchParams.set("next", next);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callback.toString(),
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    await writeAuditLog({
      action: "auth.google_oauth_failed",
      metadata: { reason: "provider" },
    });
    redirect("/inloggen?fout=google");
  }

  await writeAuditLog({
    action: "auth.google_oauth_started",
    metadata: { next: next ?? null },
  });

  redirect(data.url);
}
