import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  getSupabasePublicKey,
  getServerEnv,
} from "@/config/env";
import { isSafeInternalPath } from "@/lib/security/redirect";
import { resolvePostLoginPath } from "@/server/auth/resolve-home";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(`${origin}/inloggen`);
  }

  const env = getServerEnv();
  const publicKey = getSupabasePublicKey();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !publicKey) {
    return NextResponse.redirect(`${origin}/inloggen?fout=config`);
  }

  const pendingCookies: Array<{
    name: string;
    value: string;
    options?: Parameters<NextResponse["cookies"]["set"]>[2];
  }> = [];

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    publicKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            pendingCookies.push({ name, value, options });
          });
        },
      },
    },
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/inloggen?fout=sessie`);
  }

  const requested = isSafeInternalPath(nextParam) ? nextParam : null;
  const destination = await resolvePostLoginPath(data.user.id, requested);

  const response = NextResponse.redirect(`${origin}${destination}`);
  for (const cookie of pendingCookies) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }
  return response;
}
