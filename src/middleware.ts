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

  const cspShared = [
    "default-src 'self'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://*.supabase.co https://api.mollie.com",
    "frame-src https://www.mollie.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];

  const cspEnforcing = [
    ...cspShared,
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
  ].join("; ");

  // Report-Only: stricter candidate (no unsafe-inline) for staging/preview telemetry only.
  // Does not block; enforcing policy above remains unchanged until nonce/hashes proven.
  // Must not ship always-on RO in production/local prod — it floods Issues (inline
  // script/style) and fails Lighthouse best-practices without changing enforcement.
  const cspReportOnly = [
    ...cspShared,
    "script-src 'self'",
    "style-src 'self'",
  ].join("; ");

  response.headers.set("Content-Security-Policy", cspEnforcing);
  if (isPreviewDeployment() || process.env.CSP_REPORT_ONLY === "1") {
    response.headers.set("Content-Security-Policy-Report-Only", cspReportOnly);
  }

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

function attachPathname(response: NextResponse, barePath: string): NextResponse {
  response.headers.set("x-pathname", barePath);
  return response;
}

function prefersDutchBrowser(request: NextRequest): boolean {
  const accept = request.headers.get("accept-language") ?? "";
  return /^nl(-|$)/i.test(accept.trim()) || /,nl(-|;|$)/i.test(accept);
}

function needsSupabaseSession(barePath: string): boolean {
  return (
    barePath.startsWith("/admin") ||
    barePath.startsWith("/portal") ||
    barePath.startsWith("/account") ||
    barePath.startsWith("/inloggen") ||
    barePath.startsWith("/uitloggen") ||
    barePath.startsWith("/login") ||
    barePath.startsWith("/auth") ||
    barePath.startsWith("/cart") ||
    barePath.startsWith("/checkout") ||
    barePath.startsWith("/wachtwoord") ||
    barePath.startsWith("/uitnodiging") ||
    barePath.startsWith("/invite")
  );
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

  // ADR-001: /en/... permanently redirects to the unprefixed English URL.
  if (pathname === "/en" || pathname.startsWith("/en/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/en" ? "/" : pathname.slice(3) || "/";
    return NextResponse.redirect(url, 308);
  }

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
  requestHeaders.set("x-pathname", barePath);

  const sessionOptions =
    locale === "nl"
      ? {
          requestHeaders,
          rewriteUrl: (() => {
            const rewriteUrl = request.nextUrl.clone();
            rewriteUrl.pathname = barePath;
            return rewriteUrl;
          })(),
        }
      : { requestHeaders };

  // Public marketing/legal/shop: skip remote auth refresh (major TTFB / LCP win).
  // Auth-bearing surfaces still refresh the Supabase session.
  const response = needsSupabaseSession(barePath)
    ? await updateSupabaseSession(request, sessionOptions)
    : sessionOptions.rewriteUrl
      ? NextResponse.rewrite(sessionOptions.rewriteUrl, {
          request: { headers: requestHeaders },
        })
      : NextResponse.next({
          request: { headers: requestHeaders },
        });

  return applySecurityHeaders(
    attachPathname(attachLocale(response, locale), barePath),
  );
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
