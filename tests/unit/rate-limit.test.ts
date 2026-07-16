import { describe, it, expect, vi, afterEach } from "vitest";
import {
  checkRateLimit,
  __resetDevRateLimitBucketsForTests,
} from "@/lib/security/rate-limit";

vi.mock("@/lib/database/server", () => ({
  isSupabaseDatabaseReady: () => false,
  createServiceRoleClient: () => null,
}));

describe("P0.5 rate limit behaviors", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    __resetDevRateLimitBucketsForTests();
  });

  it("allows then rejects in development after bucket exceeds limit", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL_ENV", "development");
    for (let i = 0; i < 5; i += 1) {
      expect((await checkRateLimit("checkout", "dev@example.com")).success).toBe(true);
    }
    expect((await checkRateLimit("checkout", "dev@example.com")).success).toBe(false);
  });

  it("fail-closed for checkout in production without backend", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    expect((await checkRateLimit("checkout", "a@b.nl")).success).toBe(false);
  });

  it("fail-closed for checkout in preview without backend", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");
    expect((await checkRateLimit("payment", "a@b.nl")).success).toBe(false);
  });
});
