import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import {
  assertInvoiceAllowsPaymentReversal,
  derivePaymentStatus,
  outstandingCents,
  recomputeInvoiceStatusFromPayments,
} from "@/lib/commerce/invoice-money";
import { hasPermission } from "@/lib/auth/permissions";
import { hasCustomerPermission } from "@/lib/auth/customer-permissions";

const REVERSAL_MIGRATION =
  "supabase/migrations/20260719170000_invoice_payment_reversal_integrity.sql";
const ORIGINAL_MIGRATION =
  "supabase/migrations/20260719160000_invoices_financial_documents.sql";

describe("payment reversal — status recomputation", () => {
  it("partial payment reverse → PARTIALLY_PAID or OPEN", () => {
    expect(
      recomputeInvoiceStatusFromPayments({
        currentStatus: "PARTIALLY_PAID",
        totalCents: 10000,
        amountPaidCents: 2500,
      }),
    ).toEqual({
      ok: true,
      status: "PARTIALLY_PAID",
      amountDueCents: 7500,
    });

    expect(
      recomputeInvoiceStatusFromPayments({
        currentStatus: "PARTIALLY_PAID",
        totalCents: 10000,
        amountPaidCents: 0,
        dueDate: "2099-01-01",
        now: new Date("2026-07-16"),
      }),
    ).toEqual({ ok: true, status: "OPEN", amountDueCents: 10000 });
  });

  it("PAID → PARTIALLY_PAID when remaining active payments", () => {
    expect(
      recomputeInvoiceStatusFromPayments({
        currentStatus: "PAID",
        totalCents: 10000,
        amountPaidCents: 4000,
      }),
    ).toEqual({
      ok: true,
      status: "PARTIALLY_PAID",
      amountDueCents: 6000,
    });
  });

  it("PAID → OPEN when fully reversed and not overdue", () => {
    expect(
      recomputeInvoiceStatusFromPayments({
        currentStatus: "PAID",
        totalCents: 10000,
        amountPaidCents: 0,
        dueDate: "2099-06-01",
        now: new Date("2026-07-16"),
      }),
    ).toEqual({ ok: true, status: "OPEN", amountDueCents: 10000 });
  });

  it("PAID → OVERDUE when fully reversed and due date passed", () => {
    expect(
      recomputeInvoiceStatusFromPayments({
        currentStatus: "PAID",
        totalCents: 10000,
        amountPaidCents: 0,
        dueDate: "2020-01-01",
        now: new Date("2026-07-16"),
      }),
    ).toEqual({ ok: true, status: "OVERDUE", amountDueCents: 10000 });
  });

  it("PARTIALLY_PAID → OPEN when last active payment reversed", () => {
    expect(
      derivePaymentStatus({
        totalCents: 5000,
        amountPaidCents: 0,
        dueDate: "2099-01-01",
      }),
    ).toBe("OPEN");
  });

  it("reversed amounts use outstanding floor (no negative due)", () => {
    expect(outstandingCents(1000, 0)).toBe(1000);
    expect(outstandingCents(1000, 1000)).toBe(0);
  });
});

describe("payment reversal — fail-closed statuses", () => {
  it("blocks CANCELED / CREDITED / ARCHIVED", () => {
    for (const status of ["CANCELED", "CREDITED", "ARCHIVED"] as const) {
      expect(
        assertInvoiceAllowsPaymentReversal({ status }),
      ).toEqual({ ok: false, code: "STATUS_LOCKED" });
      expect(
        recomputeInvoiceStatusFromPayments({
          currentStatus: status,
          totalCents: 1000,
          amountPaidCents: 0,
        }).ok,
      ).toBe(false);
    }
  });

  it("blocks credit notes", () => {
    expect(
      assertInvoiceAllowsPaymentReversal({
        status: "OPEN",
        invoiceType: "CREDIT_NOTE",
      }),
    ).toEqual({ ok: false, code: "CREDIT_NOTE_LOCKED" });
  });

  it("blocks draft/review/ready", () => {
    expect(
      assertInvoiceAllowsPaymentReversal({ status: "DRAFT" }),
    ).toEqual({ ok: false, code: "STATUS_INVALID" });
  });
});

describe("payment reversal — permissions", () => {
  it("OWNER/ADMIN may reverse; CONTENT/SUPPORT may not", () => {
    expect(hasPermission("OWNER", "invoices.reverse_payment")).toBe(true);
    expect(hasPermission("ADMIN", "invoices.reverse_payment")).toBe(true);
    expect(hasPermission("CONTENT", "invoices.reverse_payment")).toBe(false);
    expect(hasPermission("SUPPORT", "invoices.reverse_payment")).toBe(false);
  });

  it("CUSTOMER portal roles cannot use staff reverse permission", () => {
    expect(hasCustomerPermission("BILLING", "portal.invoices.view")).toBe(true);
    expect(hasCustomerPermission("VIEW_ONLY", "portal.invoices.view")).toBe(true);
    expect(hasPermission("SUPPORT", "invoices.reverse_payment")).toBe(false);
    expect(hasPermission("CONTENT", "invoices.reverse_payment")).toBe(false);
  });
});

describe("payment reversal — migration & action contracts", () => {
  it("ships forward-only reversal migration without editing the original", () => {
    expect(existsSync(REVERSAL_MIGRATION)).toBe(true);
    expect(existsSync(ORIGINAL_MIGRATION)).toBe(true);
    const sql = readFileSync(REVERSAL_MIGRATION, "utf8");
    const original = readFileSync(ORIGINAL_MIGRATION, "utf8");
    expect(original).not.toContain("reverse_portal_invoice_payment");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.reverse_portal_invoice_payment");
    expect(sql).toContain("p_reversal_reason");
    expect(sql).toContain("p_reversal_idempotency_key");
    expect(sql).toContain("FOR UPDATE");
    expect(sql).toContain("can_reverse_invoice_payment");
    expect(sql).toContain("uq_portal_invoice_payment_reversal_idempotency");
    expect(sql).toContain("trg_protect_portal_invoice_payment_record");
    expect(sql).toContain("PAYMENT_RECORD_DELETE_FORBIDDEN");
    expect(sql).toContain("admin.invoice_payment_reversed");
    expect(sql).toContain("SET search_path = public");
    expect(sql).toContain("SECURITY DEFINER");
    expect(sql).not.toMatch(/\bmollie\.payments\b/i);
    expect(sql).not.toMatch(
      /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.(refund_mollie_payment|create_provider_refund)/i,
    );
    expect(sql).toContain("no_provider_refund_rpc");
  });

  it("verifier expects reverse RPC checks", () => {
    const sql = readFileSync(REVERSAL_MIGRATION, "utf8");
    expect(sql).toContain("fn:reverse_portal_invoice_payment");
    expect(sql).toContain("reverse_rpc:execute_grants_minimal");
    expect(sql).toContain("no_provider_refund_rpc");
    expect(sql).toContain("idx:reversal_idempotency_unique");
  });

  it("server action gates permission and calls reverse RPC", () => {
    const src = readFileSync("src/server/actions/invoice-actions.ts", "utf8");
    expect(src).toContain("reverseInvoicePaymentAction");
    expect(src).toContain('requirePermission(ctx, "invoices.reverse_payment")');
    expect(src).toContain("reverse_portal_invoice_payment");
    expect(src).toContain("providerRefund: false");
    expect(src).toContain("mollieCall: false");
    expect(src.toLowerCase()).not.toContain("mollie.payments");
  });

  it("admin UI shows reverse control copy and not refund wording as action", () => {
    const ui = readFileSync(
      "src/components/admin/reverse-payment-controls.tsx",
      "utf8",
    );
    expect(ui).toContain("Betaling terugdraaien");
    expect(ui).toContain(
      "Deze actie draait alleen de administratieve betalingsregistratie terug",
    );
    expect(ui).not.toMatch(/Mollie|providerrefund|createRefund/i);
  });

  it("portal invoice page does not expose reversal reasons", () => {
    const portal = readFileSync(
      "src/app/portal/(protected)/facturen/[id]/page.tsx",
      "utf8",
    );
    expect(portal).not.toContain("reversal_reason");
    expect(portal).not.toContain("Betaling terugdraaien");
    expect(portal).toContain("Geregistreerd betaald");
    expect(portal).toContain("Openstaand");
  });

  it("checkout remains off in this suite", () => {
    expect(process.env.CHECKOUT_ENABLED === "true").toBe(false);
    expect(process.env.P05_MIGRATION_APPLIED).toBeFalsy();
  });
});
