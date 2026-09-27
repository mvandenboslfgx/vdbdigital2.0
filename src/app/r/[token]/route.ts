import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  PARTNER_REFERRAL_COOKIE,
  PARTNER_REFERRAL_COOKIE_MAX_AGE_SEC,
  hashVisitorKey,
  isValidReferralTokenShape,
} from "@/lib/partner/referral";
import { resolveAppUrl } from "@/lib/url/app-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function isUnsafeGetMutationContext(request: Request): boolean {
  const purpose = (
    request.headers.get("sec-purpose") ||
    request.headers.get("purpose") ||
    ""
  ).toLowerCase();
  if (purpose.includes("prefetch")) return true;
  if (request.headers.get("next-router-prefetch") === "1") return true;
  // Only record clicks on real top-level document navigations.
  const mode = request.headers.get("sec-fetch-mode");
  const dest = request.headers.get("sec-fetch-dest");
  if (mode && mode !== "navigate") return true;
  if (dest && dest !== "document") return true;
  return false;
}

/**
 * Public referral landing: /r/<token>
 * - Always sets httpOnly referral cookie + redirects (safe)
 * - Records click only on real document navigations (never prefetch/RSC)
 */
export async function GET(request: Request, { params }: Params) {
  const { token: raw } = await params;
  const token = decodeURIComponent(raw || "").trim();
  const appUrl = resolveAppUrl();
  const redirectHome = NextResponse.redirect(new URL("/", appUrl), 302);

  if (!isValidReferralTokenShape(token)) {
    return redirectHome;
  }

  const supabase = serviceClient();
  const allowClickCapture = supabase && !isUnsafeGetMutationContext(request);

  if (supabase) {
    const { data: resolved } = await supabase.rpc("resolve_partner_referral_token", {
      p_token: token,
    });
    const row = Array.isArray(resolved) ? resolved[0] : resolved;
    if (!row?.partner_id) {
      return redirectHome;
    }
    if (allowClickCapture) {
      const ua = request.headers.get("user-agent") ?? "";
      const fwd =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
      const visitorHash = hashVisitorKey([fwd, ua.slice(0, 120)]);
      await supabase.rpc("capture_partner_referral_click", {
        p_token: token,
        p_visitor_key_hash: visitorHash,
        p_source: "referral_link",
        p_metadata: { path: "/r/" },
      });
    }
  }

  const res = NextResponse.redirect(new URL("/shop", appUrl), 302);
  res.cookies.set(PARTNER_REFERRAL_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PARTNER_REFERRAL_COOKIE_MAX_AGE_SEC,
  });
  return res;
}
