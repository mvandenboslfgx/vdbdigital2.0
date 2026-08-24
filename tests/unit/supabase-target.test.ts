import { describe, expect, it } from "vitest";
import {
  PRODUCTION_SUPABASE_PROJECT_REF,
  STAGING_SUPABASE_PROJECT_REF,
  assertSafeSupabaseTarget,
  extractSupabaseProjectRef,
  isAuthorizedProductionSupabaseRun,
  isProductionSupabaseUrl,
  isStagingSupabaseUrl,
} from "@/lib/security/supabase-target";

const prodUrl = `https://${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`;
const stagingUrl = `https://${STAGING_SUPABASE_PROJECT_REF}.supabase.co`;

describe("supabase target guard", () => {
  it("extracts project refs from hosted URLs", () => {
    expect(extractSupabaseProjectRef(prodUrl)).toBe(PRODUCTION_SUPABASE_PROJECT_REF);
    expect(extractSupabaseProjectRef(stagingUrl)).toBe(STAGING_SUPABASE_PROJECT_REF);
    expect(extractSupabaseProjectRef("http://127.0.0.1:54321")).toBeNull();
  });

  it("blocks local/dev writes to production without override", () => {
    expect(() =>
      assertSafeSupabaseTarget({
        NEXT_PUBLIC_SUPABASE_URL: prodUrl,
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
        NODE_ENV: "development",
      }),
    ).toThrow(/production Supabase/);
  });

  it("allows staging and local Docker URLs", () => {
    expect(() =>
      assertSafeSupabaseTarget({
        NEXT_PUBLIC_SUPABASE_URL: stagingUrl,
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
        NODE_ENV: "development",
      }),
    ).not.toThrow();
    expect(() =>
      assertSafeSupabaseTarget({
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        NODE_ENV: "development",
      }),
    ).not.toThrow();
    expect(isStagingSupabaseUrl(stagingUrl)).toBe(true);
    expect(isProductionSupabaseUrl(stagingUrl)).toBe(false);
  });

  it("allows Vercel production runtime against production URL", () => {
    expect(
      isAuthorizedProductionSupabaseRun({
        VERCEL: "1",
        VERCEL_ENV: "production",
        APP_ENV: "production",
      }),
    ).toBe(true);
    expect(() =>
      assertSafeSupabaseTarget({
        NEXT_PUBLIC_SUPABASE_URL: prodUrl,
        VERCEL: "1",
        VERCEL_ENV: "production",
        APP_ENV: "production",
      }),
    ).not.toThrow();
  });

  it("does not treat APP_ENV=staging as a production run even on Vercel production flags", () => {
    expect(
      isAuthorizedProductionSupabaseRun({
        VERCEL: "1",
        VERCEL_ENV: "production",
        APP_ENV: "staging",
      }),
    ).toBe(false);
  });

  it("allows explicit production-run override", () => {
    expect(() =>
      assertSafeSupabaseTarget({
        NEXT_PUBLIC_SUPABASE_URL: prodUrl,
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
        NODE_ENV: "development",
        ALLOW_PRODUCTION_SUPABASE_WRITES: "1",
      }),
    ).not.toThrow();
  });

  it("blocks Vercel preview against production", () => {
    expect(() =>
      assertSafeSupabaseTarget({
        NEXT_PUBLIC_SUPABASE_URL: prodUrl,
        VERCEL: "1",
        VERCEL_ENV: "preview",
      }),
    ).toThrow(/production Supabase/);
  });
});
