import { describe, it, expect, vi, afterEach } from "vitest";

describe("UX-001 site config phone defaults", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("uses visible default phone when NEXT_PUBLIC_COMPANY_PHONE is absent", async () => {
    vi.stubEnv("NEXT_PUBLIC_COMPANY_PHONE", "");
    vi.stubEnv("NEXT_PUBLIC_COMPANY_PHONE_TEL", "");
    delete process.env.NEXT_PUBLIC_COMPANY_PHONE;
    delete process.env.NEXT_PUBLIC_COMPANY_PHONE_TEL;

    const { siteConfig } = await import("@/config/site");
    expect(siteConfig.company.phone).toBe("06 286 00 727");
    expect(siteConfig.company.phoneTel).toBe("+31628600727");
  });

  it("allows env override of display and tel values", async () => {
    vi.stubEnv("NEXT_PUBLIC_COMPANY_PHONE", "020 123 4567");
    vi.stubEnv("NEXT_PUBLIC_COMPANY_PHONE_TEL", "+31201234567");

    const { siteConfig } = await import("@/config/site");
    expect(siteConfig.company.phone).toBe("020 123 4567");
    expect(siteConfig.company.phoneTel).toBe("+31201234567");
  });
});
