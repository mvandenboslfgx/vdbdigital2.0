import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabasePublicKey } from "@/config/env";

interface SessionOptions {
  /** Extra request headers (e.g. x-locale) */
  requestHeaders?: Headers;
  /** When set, respond with a rewrite instead of next() */
  rewriteUrl?: URL;
}

export async function updateSupabaseSession(
  request: NextRequest,
  options: SessionOptions = {},
): Promise<NextResponse> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = getSupabasePublicKey();

  const buildResponse = () => {
    if (options.rewriteUrl) {
      return NextResponse.rewrite(options.rewriteUrl, {
        request: {
          headers: options.requestHeaders ?? request.headers,
        },
      });
    }
    return NextResponse.next({
      request: {
        headers: options.requestHeaders ?? request.headers,
      },
    });
  };

  if (!supabaseUrl || !supabaseKey) {
    return buildResponse();
  }

  let supabaseResponse = buildResponse();

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = buildResponse();
        cookiesToSet.forEach(({ name, value, options: cookieOptions }) =>
          supabaseResponse.cookies.set(name, value, cookieOptions),
        );
      },
    },
  });

  await supabase.auth.getUser();

  return supabaseResponse;
}
