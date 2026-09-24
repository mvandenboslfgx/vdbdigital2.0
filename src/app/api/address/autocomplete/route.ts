import { NextRequest, NextResponse } from "next/server";
import { autocompleteDutchAddress, isGooglePlacesConfigured } from "@/lib/google/places";
import { verifyOrigin } from "@/lib/security/origin";
import { checkRateLimit, rateLimitErrorMessage } from "@/lib/security/rate-limit";

function clientId(request: NextRequest): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "anonymous"
  );
}

export async function POST(request: NextRequest) {
  if (!(await verifyOrigin())) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  if (!isGooglePlacesConfigured()) {
    return NextResponse.json({ suggestions: [] }, { status: 200 });
  }

  const limiter = await checkRateLimit("address-autocomplete", clientId(request));
  if (!limiter.success) {
    return NextResponse.json(
      { error: rateLimitErrorMessage(limiter) },
      {
        status: 429,
        headers: limiter.retryAfterSeconds
          ? { "Retry-After": String(limiter.retryAfterSeconds) }
          : undefined,
      },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { input, sessionToken } = (payload ?? {}) as {
    input?: unknown;
    sessionToken?: unknown;
  };

  if (
    typeof input !== "string" ||
    input.trim().length < 2 ||
    input.trim().length > 120 ||
    typeof sessionToken !== "string" ||
    sessionToken.length < 16 ||
    sessionToken.length > 120
  ) {
    return NextResponse.json({ suggestions: [] }, { status: 200 });
  }

  try {
    const suggestions = await autocompleteDutchAddress(
      input.trim(),
      sessionToken,
    );
    return NextResponse.json(
      { suggestions },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Address lookup temporarily unavailable" },
      { status: 502 },
    );
  }
}
