import { describe, expect, it } from "vitest";
import { extractEmailAddress, isEmailFromAddress } from "@/lib/email/address";

describe("email address helpers", () => {
  it("accepts bare emails", () => {
    expect(isEmailFromAddress("noreply@vdbdigital.nl")).toBe(true);
    expect(extractEmailAddress("noreply@vdbdigital.nl")).toBe("noreply@vdbdigital.nl");
  });

  it("accepts Resend-style display names", () => {
    expect(isEmailFromAddress("VDB Digital <noreply@vdbdigital.nl>")).toBe(true);
    expect(extractEmailAddress("VDB Digital <noreply@vdbdigital.nl>")).toBe(
      "noreply@vdbdigital.nl",
    );
  });

  it("rejects invalid values", () => {
    expect(isEmailFromAddress("not-an-email")).toBe(false);
    expect(isEmailFromAddress("Name <not-an-email>")).toBe(false);
    expect(isEmailFromAddress("")).toBe(false);
  });
});
