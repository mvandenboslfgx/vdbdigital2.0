import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/config/env", () => ({
  getSupabasePublicKey: () => "test-publishable-key",
}));

vi.mock("@/lib/security/supabase-target", () => ({
  assertSafeSupabaseTarget: () => undefined,
}));

const createServerClient = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: (...args: unknown[]) => createServerClient(...args),
}));

describe("Cloudflare-safe session proxy", () => {
  beforeEach(() => {
    createServerClient.mockReset();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  });

  it("uses getClaims (not getSession) inside updateSupabaseSession", async () => {
    const getClaims = vi
      .fn()
      .mockResolvedValue({ data: { claims: { sub: "user-1" } }, error: null });
    const getSession = vi.fn();
    createServerClient.mockReturnValue({
      auth: { getClaims, getSession },
    });

    const { updateSupabaseSession } = await import(
      "@/lib/database/middleware"
    );
    const request = new NextRequest("https://vdbdigital.nl/portal", {
      headers: { cookie: "sb-test-auth-token=stale" },
    });

    const response = await updateSupabaseSession(request);
    expect(createServerClient).toHaveBeenCalled();
    expect(getClaims).toHaveBeenCalled();
    expect(getSession).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
  });
});
