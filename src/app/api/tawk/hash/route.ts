import { NextResponse } from "next/server";

/**
 * Public Tawk visitor-hash signing removed (P0).
 * Generating a hash for arbitrary emails from a public POST undermined secure visitor identity.
 * Reintroduce only behind authenticated server-known identity if needed.
 */
export async function GET() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function POST() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
