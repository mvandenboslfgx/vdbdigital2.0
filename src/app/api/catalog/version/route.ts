import { NextResponse } from "next/server";
import {
  CATALOG_CONTENT_VERSION,
  CATALOG_CONTRACT_PIN,
} from "@/config/commercial/catalog-version";

export const dynamic = "force-dynamic";

/**
 * Cheap catalog sync probe for clients (website / future mobile).
 * Clients may cache and revalidate via ETag / If-None-Match.
 */
export async function GET(request: Request) {
  const body = {
    catalog_version: CATALOG_CONTENT_VERSION,
    contract: CATALOG_CONTRACT_PIN,
    updated_at: new Date().toISOString(),
    status: "partial_ssot" as const,
    notes:
      "Commercial packages still dual-sourced (TS + Supabase). Treat as draft until SSOT unification.",
  };

  const etag = `"${CATALOG_CONTENT_VERSION}"`;
  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: etag,
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    });
  }

  return NextResponse.json(body, {
    headers: {
      ETag: etag,
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}
