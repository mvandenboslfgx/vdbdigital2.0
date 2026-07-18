import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/database/server";
import { writeAuditLog } from "@/lib/security/audit-log";
import { resolveAppUrl } from "@/lib/url/app-url";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.auth.signOut();
    if (user) {
      await writeAuditLog({ userId: user.id, action: "auth.logout" });
    }
  }
  return NextResponse.redirect(`${resolveAppUrl()}/inloggen`);
}
