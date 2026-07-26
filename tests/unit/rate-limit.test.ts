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

describe("SEC-005 fail-closed / degraded fallback (contact & quote)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    __resetDevRateLimitBucketsForTests();
  });

  it("does not fail-open contact in production when durable backends are unavailable", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    for (let i = 0; i < 5; i += 1) {
      expect((await checkRateLimit("contact", "sec005@example.com")).success).toBe(true);
    }
    expect((await checkRateLimit("contact", "sec005@example.com")).success).toBe(false);
  });

  it("does not fail-open quote in production when durable backends are unavailable", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    for (let i = 0; i < 3; i += 1) {
      expect((await checkRateLimit("quote", "sec005@example.com")).success).toBe(true);
    }
    expect((await checkRateLimit("quote", "sec005@example.com")).success).toBe(false);
  });

  it("falls back to degraded memory when Upstash errors for contact", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://fake.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("upstash unavailable")));

    for (let i = 0; i < 5; i += 1) {
      expect((await checkRateLimit("contact", "upstash-fail@example.com")).success).toBe(true);
    }
    expect((await checkRateLimit("contact", "upstash-fail@example.com")).success).toBe(false);
  });

  it("still hard fail-closes checkout when Upstash errors", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://fake.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("upstash unavailable")));

    expect((await checkRateLimit("checkout", "pay@example.com")).success).toBe(false);
  });
});
