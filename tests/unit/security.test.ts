import { describe, it, expect } from "vitest";
import { isValidRedirectUrl } from "@/lib/security/redirect";

describe("Safe redirects", () => {
  it("allows same-origin URLs", () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    expect(isValidRedirectUrl("http://localhost:3000/checkout/success")).toBe(true);
  });

  it("blocks external URLs", () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    expect(isValidRedirectUrl("https://evil.com/phish")).toBe(false);
  });
});
