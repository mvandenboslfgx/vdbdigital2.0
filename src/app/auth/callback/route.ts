import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  applyPendingAuthCookies,
  createRouteHandlerSupabase,
} from "@/lib/database/middleware";
import { ensureCustomerOrg } from "@/server/auth/ensure-customer-org";
import { resolvePostLoginPath } from "@/server/auth/resolve-home";
import { isSafeInternalPath } from "@/lib/security/redirect";
import { writeAuditLog } from "@/lib/security/audit-log";
import { resolveAppUrl } from "@/lib/url/app-url";

export const dynamic = "force-dynamic";

/**
 * Official OAuth callback: server exchangeCodeForSession → Set-Cookie → redirect.
 * Single owner of the OAuth code (no client PKCE + establish double exchange).
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const err = url.searchParams.get("error");
  const nextParam = url.searchParams.get("next");
  const appOrigin = resolveAppUrl().replace(/\/$/, "");

  const fail = (reason: string) => {
    const dest = new URL("/inloggen", appOrigin);
    dest.searchParams.set("fout", reason);
    return NextResponse.redirect(dest, {
      status: 303,
      headers: {
        "Cache-Control": "private, no-store, max-age=0, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  };

  if (err) return fail("oauth");
  if (!code) return fail("code");

  const pending = {
    cookies: [] as Array<{
      name: string;
      value: string;
      options?: Parameters<NextResponse["cookies"]["set"]>[2];
    }>,
    headers: {} as Record<string, string>,
  };

  const supabase = createRouteHandlerSupabase(request, pending);
  if (!supabase) return fail("config");

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session?.user) {
    console.error(
      JSON.stringify({
        type: "auth_callback_exchange_failed",
        message: error?.message?.slice(0, 120) ?? "no_session",
      }),
    );
    return fail("sessie");
  }

  const user = data.session.user;
  const metadata = user.user_metadata as Record<string, unknown> | undefined;

  try {
    await ensureCustomerOrg(user.id, {
      source: "auth_callback",
      email: user.email,
      fullName:
        (typeof metadata?.full_name === "string" && metadata.full_name.trim()) ||
        (typeof metadata?.name === "string" && metadata.name.trim()) ||
        null,
      company:
        typeof metadata?.company === "string" && metadata.company.trim()
          ? metadata.company.trim()
          : null,
      marketingOptIn: metadata?.marketing_opt_in === true,
    });
  } catch {
    // Fail-closed routing below; do not block login on provisioning errors.
  }

  await writeAuditLog({
    userId: user.id,
    action: "auth.login_success",
    metadata: { step: "google_oauth" },
  });

  const requested = isSafeInternalPath(nextParam) ? nextParam : null;
  const destination = await resolvePostLoginPath(user.id, requested);
  const destUrl = new URL(destination, appOrigin);

  const response = NextResponse.redirect(destUrl, 303);

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
