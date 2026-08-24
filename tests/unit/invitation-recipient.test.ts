import { describe, expect, it } from "vitest";
import {
  assertInvitationRecipient,
  isSystemMailbox,
  resolveInvitationRecipient,
} from "@/lib/email/invitation-recipient";

describe("invitation recipient guard", () => {
  it("rejects the configured from address as recipient", () => {
    const result = assertInvitationRecipient({
      recipient: "noreply@vdbdigital.nl",
      fromAddress: "VDB Digital Software <noreply@vdbdigital.nl>",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects noreply even when from is a display-name variant", () => {
    expect(isSystemMailbox("noreply@vdbdigital.nl")).toBe(true);
    const result = resolveInvitationRecipient({
      contactEmail: "klant@example.com",
      inviteEmail: "noreply@vdbdigital.nl",
      fromAddress: "VDB Digital <noreply@vdbdigital.nl>",
    });
    expect(result.ok).toBe(false);
  });

  it("uses contact email when invite email is empty", () => {
    const result = resolveInvitationRecipient({
      contactEmail: "klant@example.com",
      inviteEmail: "  ",
      fromAddress: "VDB Digital <noreply@vdbdigital.nl>",
    });
    expect(result).toEqual({ ok: true, recipient: "klant@example.com" });
  });

  it("accepts a real customer mailbox that is not the sender", () => {
    const result = assertInvitationRecipient({
      recipient: "eigenaar@klant.nl",
      fromAddress: "VDB Digital Software <noreply@vdbdigital.nl>",
    });
    expect(result).toEqual({ ok: true, recipient: "eigenaar@klant.nl" });
  });

  it("does not treat a customer noreply-looking subdomain as allowed system mail", () => {
    const result = assertInvitationRecipient({
      recipient: "info@klant.nl",
      fromAddress: "noreply@vdbdigital.nl",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.recipient).toBe("info@klant.nl");
  });
});
