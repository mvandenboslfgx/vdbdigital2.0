import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSupabaseSession } from "@/lib/database/middleware";
import { isPreviewDeployment } from "@/lib/url/app-url";
import {
  defaultLocale,
  legacyRedirects,
  stripLocalePrefix,
  type Locale,
} from "@/i18n/config";

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );

  if (isPreviewDeployment()) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://embed.tawk.to",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://*.supabase.co https://api.mollie.com https://embed.tawk.to wss://*.tawk.to",
    "frame-src https://embed.tawk.to https://www.mollie.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);

  return response;
}

function resolveLegacyTarget(pathname: string): string | null {
  if (legacyRedirects[pathname]) return legacyRedirects[pathname];
  for (const [from, to] of Object.entries(legacyRedirects)) {
    if (pathname.startsWith(`${from}/`)) {
      return `${to}${pathname.slice(from.length)}`;
    }
  }
  return null;
}

function attachLocale(response: NextResponse, locale: Locale): NextResponse {
  response.headers.set("x-locale", locale);
  response.cookies.set("NEXT_LOCALE", locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

function prefersDutchBrowser(request: NextRequest): boolean {
  const accept = request.headers.get("accept-language") ?? "";
  return /^nl(-|$)/i.test(accept.trim()) || /,nl(-|;|$)/i.test(accept);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/_next")
  ) {
    return applySecurityHeaders(await updateSupabaseSession(request));
  }

  const { locale: pathLocale, pathname: barePath } =
    stripLocalePrefix(pathname);

  // First visit: Dutch browser may safely land on /nl (manual cookie always wins later)
  const localeCookie = request.cookies.get("NEXT_LOCALE")?.value;
  if (
    barePath === "/" &&
    pathLocale === "en" &&
    !localeCookie &&
    prefersDutchBrowser(request)
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/nl";
    return NextResponse.redirect(url, 302);
  }

  const legacyTarget = resolveLegacyTarget(barePath);
  if (legacyTarget) {
    const url = request.nextUrl.clone();
    const prefix = pathLocale === "nl" ? "/nl" : "";
    url.pathname = `${prefix}${legacyTarget}`;
    return NextResponse.redirect(url, 308);
  }

  // Admin is English-only
  if (barePath.startsWith("/admin")) {
    if (pathname.startsWith("/nl")) {
      const url = request.nextUrl.clone();
      url.pathname = barePath;
      return NextResponse.redirect(url, 308);
    }
    const response = await updateSupabaseSession(request);
    return applySecurityHeaders(attachLocale(response, defaultLocale));
  }

  const locale: Locale = pathLocale;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-locale", locale);

  if (locale === "nl") {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = barePath;
    const response = await updateSupabaseSession(request, {
      requestHeaders,
      rewriteUrl,
    });
    return applySecurityHeaders(attachLocale(response, locale));
  }

  const response = await updateSupabaseSession(request, { requestHeaders });
  return applySecurityHeaders(attachLocale(response, locale));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
