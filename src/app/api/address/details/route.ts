import { NextRequest, NextResponse } from "next/server";
import { getDutchAddressDetails, isGooglePlacesConfigured } from "@/lib/google/places";
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
    return NextResponse.json({ address: null }, { status: 200 });
  }

  const limiter = await checkRateLimit("address-details", clientId(request));
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

  const { placeId, sessionToken } = (payload ?? {}) as {
    placeId?: unknown;
    sessionToken?: unknown;
  };

  if (
    typeof placeId !== "string" ||
    placeId.length < 10 ||
    placeId.length > 256 ||
    typeof sessionToken !== "string" ||
    sessionToken.length < 16 ||
    sessionToken.length > 120
  ) {
    return NextResponse.json({ error: "Invalid place" }, { status: 400 });
  }

  try {
    const address = await getDutchAddressDetails(placeId, sessionToken);
    return NextResponse.json(
      { address },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Address lookup temporarily unavailable" },
      { status: 502 },
    );
  }
}
