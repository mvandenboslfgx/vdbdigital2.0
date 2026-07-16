import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  getSupabasePublicKey,
  getServerEnv,
} from "@/config/env";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/admin";

  if (!code) {
    return NextResponse.redirect(`${origin}/admin/login`);
  }

  const env = getServerEnv();
  const publicKey = getSupabasePublicKey();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !publicKey) {
    return NextResponse.redirect(`${origin}/admin/login?error=config`);
  }

  const response = NextResponse.redirect(`${origin}${next}`);

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
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  await supabase.auth.exchangeCodeForSession(code);
  return response;
}
