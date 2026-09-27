import { describe, expect, it } from "vitest";
import { SERVER_AUTH_COOKIE_OPTIONS } from "@/lib/auth/cookie-options";
import { describeSetCookieHeader } from "@/lib/auth/cookie-forensics";

describe("auth cookie path contract", () => {
  it("forces Path=/ for portal hard navigation", () => {
    expect(SERVER_AUTH_COOKIE_OPTIONS.path).toBe("/");
    expect(SERVER_AUTH_COOKIE_OPTIONS.sameSite).toBe("lax");
    expect(SERVER_AUTH_COOKIE_OPTIONS.httpOnly).toBe(true);
    expect(SERVER_AUTH_COOKIE_OPTIONS.domain).toBeUndefined();
  });

  it("detects wrong-path auth cookies in forensics", () => {
    const bad = describeSetCookieHeader(
      "sb-x-auth-token.0=abc; Path=/auth/callback; HttpOnly; Secure; SameSite=Lax",
    );
    expect(bad.path).toBe("/auth/callback");
    expect(bad.path).not.toBe("/");
  });
});
