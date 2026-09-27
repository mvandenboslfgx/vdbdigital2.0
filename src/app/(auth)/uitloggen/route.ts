import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyPendingAuthCookies,
  createRouteHandlerSupabase,
} from "@/lib/database/middleware";
import { writeAuditLog } from "@/lib/security/audit-log";
import { resolveAppUrl } from "@/lib/url/app-url";

export const dynamic = "force-dynamic";

/**
 * POST-only logout. GET must never sign out — Next.js Link prefetch of
 * href="/uitloggen" would otherwise clear sb-*-auth-token cookies during
 * soft-nav / viewport prefetch and leave the jar empty for the next F5.
 */
export async function GET() {
  const appOrigin = resolveAppUrl().replace(/\/$/, "");
  const response = NextResponse.redirect(`${appOrigin}/portal`, 303);
  response.headers.set(
    "Cache-Control",
    "private, no-store, max-age=0, must-revalidate",
  );
  return response;
}

/**
 * Explicit logout — clears auth cookies on a 303 redirect response.
 */
export async function POST(request: NextRequest) {
  const appOrigin = resolveAppUrl().replace(/\/$/, "");
  const pending = {
    cookies: [] as Array<{
      name: string;
      value: string;
      options?: Parameters<NextResponse["cookies"]["set"]>[2];
    }>,
    headers: {} as Record<string, string>,
  };

  const supabase = createRouteHandlerSupabase(request, pending);
  if (supabase) {
    const { data } = await supabase.auth.getClaims();
    const sub =
      typeof data?.claims?.sub === "string" ? data.claims.sub : null;
    await supabase.auth.signOut();
    if (sub) {
      await writeAuditLog({ userId: sub, action: "auth.logout" });
    }
  }

  const response = NextResponse.redirect(`${appOrigin}/inloggen`, 303);

  applyPendingAuthCookies(response, pending.cookies);
  for (const [key, value] of Object.entries(pending.headers)) {
    response.headers.set(key, value);
  }
  response.headers.set(
    "Cache-Control",
    "private, no-store, max-age=0, must-revalidate",
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");

  return response;
}
