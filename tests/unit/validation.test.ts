import { describe, it, expect } from "vitest";
import { contactFormSchema, checkoutFormSchema } from "@/lib/validation/forms";

describe("Form validation", () => {
  it("validates contact form", () => {
    const result = contactFormSchema.safeParse({
      name: "Jan Jansen",
      email: "jan@example.com",
      subject: "Vraag",
      message: "Dit is een testbericht met voldoende tekens.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects short messages", () => {
    const result = contactFormSchema.safeParse({
      name: "Jan",
      email: "jan@example.com",
      subject: "Vraag",
      message: "Kort",
    });
    expect(result.success).toBe(false);
  });

  it("requires terms acceptance for checkout", () => {
    const result = checkoutFormSchema.safeParse({
      email: "jan@example.com",
      firstName: "Jan",
      lastName: "Jansen",
      country: "NL",
      acceptTerms: undefined,
    });
    expect(result.success).toBe(false);
  });
});
