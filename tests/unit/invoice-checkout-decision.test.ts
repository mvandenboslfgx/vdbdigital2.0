import { describe, expect, it } from "vitest";
import {
  assertStagingTestCheckoutEnv,
  decideInvoiceCheckout,
  detectKeyShape,
  maskPaymentRef,
  type InvoiceRow,
} from "@/lib/payments/invoice-checkout-decision";

const baseInvoice: InvoiceRow = {
  id: "inv-aaaaaaaa",
  organization_id: "org-1",
  status: "ISSUED",
  currency: "EUR",
  total_cents: 1999,
  amount_paid_cents: 0,
  amount_due_cents: 1999,
  invoice_number: "SYNTH-001",
  external_payment_reference: null,
};

const stagingEnv = {
  invoiceId: "inv-aaaaaaaa",
  appEnv: "staging",
  supabaseUrl: "https://qzekuvmgfekzsowdecyk.supabase.co",
  mollieApiKey: "test_dummy",
  testCheckoutEnabled: "true",
  checkoutEnabled: "false",
  payoutEnabled: "false",
};

describe("invoice-checkout-decision", () => {
  it("classifies mollie key shapes", () => {
    expect(detectKeyShape("test_dummy")).toBe("test");
    expect(detectKeyShape("live_dummy")).toBe("live");
    expect(detectKeyShape("weird")).toBe("invalid");
    expect(detectKeyShape("")).toBe("missing");
  });

  it("requires staging + test checkout flag + test key", () => {
    expect(
      assertStagingTestCheckoutEnv({ ...stagingEnv, appEnv: "production" }).ok,
    ).toBe(false);
    expect(
      assertStagingTestCheckoutEnv({
        ...stagingEnv,
        mollieApiKey: "live_dummy",
      }).ok,
    ).toBe(false);
    expect(
      assertStagingTestCheckoutEnv({
        ...stagingEnv,
        checkoutEnabled: "true",
      }).ok,
    ).toBe(false);
    expect(assertStagingTestCheckoutEnv(stagingEnv).ok).toBe(true);
  });

  it("denies production supabase ref", () => {
    const r = assertStagingTestCheckoutEnv({
      ...stagingEnv,
      supabaseUrl: "https://nhsrdnjfsxfikfbdmdfj.supabase.co",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("FORBIDDEN");
  });

  it("enforces ownership and amount authority", () => {
    expect(
      decideInvoiceCheckout(baseInvoice, ["org-other"], stagingEnv).ok,
    ).toBe(false);
    expect(
      decideInvoiceCheckout(baseInvoice, ["org-1"], {
        ...stagingEnv,
        expectedAmountCents: 1,
      }),
    ).toMatchObject({ ok: false, code: "AMOUNT_MISMATCH" });
    expect(
      decideInvoiceCheckout(baseInvoice, ["org-1"], stagingEnv),
    ).toMatchObject({ ok: true, dueCents: 1999 });
  });

  it("rejects paid / void / non-EUR / oversized", () => {
    expect(
      decideInvoiceCheckout(
        { ...baseInvoice, status: "PAID", amount_due_cents: 0 },
        ["org-1"],
        stagingEnv,
      ),
    ).toMatchObject({ ok: false, code: "ALREADY_PAID" });
    expect(
      decideInvoiceCheckout(
        { ...baseInvoice, status: "CANCELED" },
        ["org-1"],
        stagingEnv,
      ),
    ).toMatchObject({ ok: false, code: "FORBIDDEN" });
    expect(
      decideInvoiceCheckout(
        { ...baseInvoice, currency: "USD" },
        ["org-1"],
        stagingEnv,
      ),
    ).toMatchObject({ ok: false, code: "CURRENCY_MISMATCH" });
    expect(
      decideInvoiceCheckout(
        { ...baseInvoice, amount_due_cents: 5_000_001 },
        ["org-1"],
        stagingEnv,
      ),
    ).toMatchObject({ ok: false, code: "FORBIDDEN" });
  });

  it("masks payment refs", () => {
    expect(maskPaymentRef("tr_abcdefghij")).toBe("tr_abcde…");
  });
});
