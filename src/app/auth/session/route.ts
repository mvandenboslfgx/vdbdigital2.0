import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  applyPendingAuthCookies,
  createRouteHandlerSupabase,
} from "@/lib/database/middleware";

export const dynamic = "force-dynamic";

/**
 * Optional explicit session check/refresh (Route Handler).
 * Proxy owns refresh on normal navigations; this is for diagnostics/clients.
 */
export async function GET(request: NextRequest) {
  const pending = {
    cookies: [] as Array<{
      name: string;
      value: string;
      options?: Parameters<NextResponse["cookies"]["set"]>[2];
    }>,
    headers: {} as Record<string, string>,
  };

  const supabase = createRouteHandlerSupabase(request, pending);
  if (!supabase) {
    return NextResponse.json(
      { ok: false, reason: "not_configured" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { data, error } = await supabase.auth.getClaims();
  const authenticated = Boolean(data?.claims?.sub) && !error;

  const response = NextResponse.json(
    {
      ok: authenticated,
      authenticated,
    },
    {
      status: 200,
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    },
  );

  applyPendingAuthCookies(response, pending.cookies);
  for (const [key, value] of Object.entries(pending.headers)) {
    response.headers.set(key, value);
  }

  return response;
}
