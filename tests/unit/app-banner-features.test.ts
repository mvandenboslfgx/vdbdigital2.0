import { describe, it, expect, vi, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Tests for feature flag helpers in src/config/features.ts
// ---------------------------------------------------------------------------

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isAppBannerEnabled", () => {
  it("returns false by default (missing env)", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_DOWNLOAD_BANNER_ENABLED", "");
    const { isAppBannerEnabled } = await import("@/config/features");
    expect(isAppBannerEnabled()).toBe(false);
  });

  it("returns false when set to 'false'", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_DOWNLOAD_BANNER_ENABLED", "false");
    const { isAppBannerEnabled } = await import("@/config/features");
    expect(isAppBannerEnabled()).toBe(false);
  });

  it("returns true only when set to 'true'", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_DOWNLOAD_BANNER_ENABLED", "true");
    const { isAppBannerEnabled } = await import("@/config/features");
    expect(isAppBannerEnabled()).toBe(true);
  });
});

describe("isAppBannerLive — fail-closed", () => {
  it("returns false when flag=true but no destinations", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_DOWNLOAD_BANNER_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_APP_DEEP_LINK_URL", "");
    vi.stubEnv("NEXT_PUBLIC_ANDROID_APP_STORE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_IOS_APP_STORE_URL", "");
    const { isAppBannerLive } = await import("@/config/features");
    expect(isAppBannerLive()).toBe(false);
  });

  it("returns false when flag=false even with valid store URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_DOWNLOAD_BANNER_ENABLED", "false");
    vi.stubEnv("NEXT_PUBLIC_ANDROID_APP_STORE_URL", "https://play.google.com/store/apps/details?id=nl.vdbdigital");
    const { isAppBannerLive } = await import("@/config/features");
    expect(isAppBannerLive()).toBe(false);
  });

  it("returns true when flag=true and a valid android store URL is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_DOWNLOAD_BANNER_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_ANDROID_APP_STORE_URL", "https://play.google.com/store/apps/details?id=nl.vdbdigital");
    vi.stubEnv("NEXT_PUBLIC_IOS_APP_STORE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_APP_DEEP_LINK_URL", "");
    const { isAppBannerLive } = await import("@/config/features");
    expect(isAppBannerLive()).toBe(true);
  });
});

describe("getAppBannerDelayMs", () => {
  it("returns 12000 by default", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_BANNER_DELAY_MS", "");
    const { getAppBannerDelayMs } = await import("@/config/features");
    expect(getAppBannerDelayMs()).toBe(12_000);
  });

  it("parses custom value", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_BANNER_DELAY_MS", "5000");
    const { getAppBannerDelayMs } = await import("@/config/features");
    expect(getAppBannerDelayMs()).toBe(5000);
  });

  it("falls back to 12000 for invalid value", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_BANNER_DELAY_MS", "not-a-number");
    const { getAppBannerDelayMs } = await import("@/config/features");
    expect(getAppBannerDelayMs()).toBe(12_000);
  });
});

describe("getAppBannerVersion", () => {
  it("returns v1 by default", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_BANNER_VERSION", "");
    const { getAppBannerVersion } = await import("@/config/features");
    expect(getAppBannerVersion()).toBe("v1");
  });

  it("returns custom version", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_BANNER_VERSION", "v2");
    const { getAppBannerVersion } = await import("@/config/features");
    expect(getAppBannerVersion()).toBe("v2");
  });
});
