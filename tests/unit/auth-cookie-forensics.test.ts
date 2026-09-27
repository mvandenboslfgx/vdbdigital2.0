import { describe, expect, it } from "vitest";
import {
  describeRequestCookies,
  describeSetCookieHeader,
} from "@/lib/auth/cookie-forensics";

describe("cookie forensics (safe metadata)", () => {
  it("never includes cookie values in request metadata", () => {
    const meta = describeRequestCookies([
      { name: "sb-abc-auth-token.0", value: "super-secret-token-chunk" },
      { name: "unrelated", value: "x" },
    ]);
    expect(meta).toHaveLength(1);
    expect(meta[0]?.name).toBe("sb-abc-auth-token.0");
    expect(meta[0]?.byteLength).toBe("super-secret-token-chunk".length);
    expect(JSON.stringify(meta)).not.toContain("super-secret");
  });

  it("detects Max-Age=0 and empty deletion cookies", () => {
    const cleared = describeSetCookieHeader(
      "sb-abc-auth-token.1=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax",
    );
    expect(cleared.name).toBe("sb-abc-auth-token.1");
    expect(cleared.emptyValue).toBe(true);
    expect(cleared.maxAgeZero).toBe(true);
    expect(cleared.httpOnly).toBe(true);
    expect(cleared.secure).toBe(true);
    expect(cleared.sameSite?.toLowerCase()).toBe("lax");
    expect(cleared.path).toBe("/");
  });
});
