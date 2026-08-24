import { describe, expect, it, vi, beforeEach } from "vitest";

const sendMock = vi.fn();

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

describe("sendInvitationEmail", () => {
  beforeEach(() => {
    sendMock.mockReset();
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "VDB Digital Software <noreply@vdbdigital.nl>");
  });

  it("does not call Resend when recipient equals from address", async () => {
    const { sendInvitationEmail } = await import("@/lib/email/resend");
    const result = await sendInvitationEmail({
      to: "noreply@vdbdigital.nl",
      organizationName: "Test BV",
      acceptUrl: "https://vdbdigital.nl/uitnodiging/accepteren?token=abc",
    });
    expect(result.sent).toBe(false);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("sends to the customer mailbox and returns provider id", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_123" }, error: null });
    const { sendInvitationEmail } = await import("@/lib/email/resend");
    const result = await sendInvitationEmail({
      to: "klant@example.com",
      organizationName: "Test BV",
      acceptUrl: "https://vdbdigital.nl/uitnodiging/accepteren?token=abc",
    });
    expect(result.sent).toBe(true);
    expect(result.providerMessageId).toBe("msg_123");
    expect(sendMock).toHaveBeenCalledTimes(1);
    const payload = sendMock.mock.calls[0]?.[0] as {
      to: string;
      from: string;
      html: string;
    };
    expect(payload.to).toBe("klant@example.com");
    expect(payload.from).toContain("noreply@vdbdigital.nl");
    expect(payload.html).toContain(
      "https://vdbdigital.nl/uitnodiging/accepteren?token=abc",
    );
  });

  it("marks provider rejection as not sent", async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: { message: "domain not verified" },
    });
    const { sendInvitationEmail } = await import("@/lib/email/resend");
    const result = await sendInvitationEmail({
      to: "klant@example.com",
      organizationName: "Test BV",
      acceptUrl: "https://vdbdigital.nl/uitnodiging/accepteren?token=abc",
    });
    expect(result.sent).toBe(false);
    expect(result.reason).toMatch(/domain not verified/);
  });
});
