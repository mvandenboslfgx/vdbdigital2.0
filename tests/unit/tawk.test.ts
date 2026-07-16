import { describe, it, expect } from "vitest";
import { generateTawkVisitorHash } from "@/lib/chat/tawk-secure";

describe("tawk.to secure hash", () => {
  it("generates deterministic HMAC hash", () => {
    const secret = "test-secret-key";
    const a = generateTawkVisitorHash("User@Example.com", secret);
    const b = generateTawkVisitorHash("user@example.com", secret);
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });
});
