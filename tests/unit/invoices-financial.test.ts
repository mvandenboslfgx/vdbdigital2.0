import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import {
  derivePaymentStatus,
  outstandingCents,
} from "@/lib/commerce/invoice-money";
import {
  assertInvoiceCanBeIssued,
  assertInvoiceExpectedVersion,
  canTransitionInvoiceStatus,
  customerFacingInvoiceStatus,
  isInvoiceOperationallyOverdue,
} from "@/lib/commerce/invoice-status";
import { hasPermission } from "@/lib/auth/permissions";
import { hasCustomerPermission } from "@/lib/auth/customer-permissions";

describe("invoice issue — READY-only", () => {
  it("allows READY → ISSUED/OPEN", () => {
    expect(assertInvoiceCanBeIssued("READY")).toEqual({ ok: true });
  });

  it("blocks DRAFT and IN_REVIEW → ISSUED", () => {
    expect(assertInvoiceCanBeIssued("DRAFT")).toEqual({
      ok: false,
      code: "NOT_READY",
    });
    expect(assertInvoiceCanBeIssued("IN_REVIEW")).toEqual({
      ok: false,
      code: "NOT_READY",
    });
  });

  it("blocks re-issue from OPEN/PAID", () => {
    expect(assertInvoiceCanBeIssued("OPEN").ok).toBe(false);
    expect(assertInvoiceCanBeIssued("PAID").ok).toBe(false);
  });

  it("enforces expected version", () => {
    expect(assertInvoiceExpectedVersion(2, 2)).toBe(true);
    expect(assertInvoiceExpectedVersion(2, 1)).toBe(false);
  });
});

describe("invoice status transitions", () => {
  it("allows documented transitions", () => {
    expect(canTransitionInvoiceStatus("DRAFT", "READY")).toBe(true);
    expect(canTransitionInvoiceStatus("READY", "OPEN")).toBe(true);
    expect(canTransitionInvoiceStatus("OPEN", "PAID")).toBe(true);
  });

  it("blocks illegal transitions", () => {
    expect(canTransitionInvoiceStatus("DRAFT", "OPEN")).toBe(false);
    expect(canTransitionInvoiceStatus("CANCELED", "PAID")).toBe(false);
    expect(canTransitionInvoiceStatus("CREDITED", "OPEN")).toBe(false);
  });
});

describe("invoice money & overdue", () => {
  it("computes outstanding in minor units", () => {
    expect(outstandingCents(12100, 2100)).toBe(10000);
    expect(outstandingCents(1000, 1000)).toBe(0);
  });

  it("derives payment status", () => {
    expect(
      derivePaymentStatus({ totalCents: 10000, amountPaidCents: 10000 }),
    ).toBe("PAID");
    expect(
      derivePaymentStatus({ totalCents: 10000, amountPaidCents: 2500 }),
    ).toBe("PARTIALLY_PAID");
    expect(
      derivePaymentStatus({
        totalCents: 10000,
        amountPaidCents: 0,
        dueDate: "2020-01-01",
        now: new Date("2026-07-16"),
      }),
    ).toBe("OVERDUE");
  });

  it("overdue is server-derivable even if status not flipped", () => {
    expect(
      isInvoiceOperationallyOverdue({
        status: "OPEN",
        dueDate: "2020-01-01",
        amountDueCents: 500,
        now: new Date("2026-07-16"),
      }),
    ).toBe(true);
    expect(
      customerFacingInvoiceStatus({
        status: "OPEN",
        dueDate: "2020-01-01",
        amountDueCents: 500,
        now: new Date("2026-07-16"),
      }),
    ).toBe("OVERDUE");
  });
});

describe("invoice permissions", () => {
  it("OWNER/ADMIN can issue, record and reverse payment; CONTENT cannot", () => {
    expect(hasPermission("OWNER", "invoices.issue")).toBe(true);
    expect(hasPermission("ADMIN", "invoices.record_payment")).toBe(true);
    expect(hasPermission("ADMIN", "invoices.reverse_payment")).toBe(true);
    expect(hasPermission("CONTENT", "invoices.issue")).toBe(false);
    expect(hasPermission("CONTENT", "invoices.create")).toBe(false);
    expect(hasPermission("CONTENT", "invoices.reverse_payment")).toBe(false);
    expect(hasPermission("SUPPORT", "invoices.reverse_payment")).toBe(false);
  });

  it("SUPPORT can view assigned; BILLING can view/download", () => {
    expect(hasPermission("SUPPORT", "invoices.view_assigned")).toBe(true);
    expect(hasCustomerPermission("BILLING", "portal.invoices.view")).toBe(true);
    expect(hasCustomerPermission("BILLING", "portal.invoices.download")).toBe(
      true,
    );
  });
});

describe("invoice routes & migration", () => {
  it("ships admin and portal invoice routes", () => {
    for (const path of [
      "src/app/admin/(protected)/invoices/page.tsx",
      "src/app/admin/(protected)/invoices/new/page.tsx",
      "src/app/admin/(protected)/invoices/[id]/page.tsx",
      "src/app/admin/(protected)/invoices/[id]/edit/page.tsx",
      "src/app/admin/(protected)/invoices/[id]/preview/page.tsx",
      "src/app/admin/(protected)/invoices/[id]/versions/page.tsx",
      "src/app/portal/(protected)/facturen/page.tsx",
      "src/app/portal/(protected)/facturen/[id]/page.tsx",
      "supabase/migrations/20260719160000_invoices_financial_documents.sql",
    ]) {
      expect(existsSync(path), path).toBe(true);
    }
  });

  it("does not couple invoices to Mollie provider ids", () => {
    const sql = readFileSync(
      "supabase/migrations/20260719160000_invoices_financial_documents.sql",
      "utf8",
    );
    expect(sql).toContain("no_mollie_coupling");
    expect(sql).not.toMatch(
      /ADD COLUMN[^;]*\b(mollie_payment_id|checkout_session_id|payment_provider_id)\b/i,
    );
  });

  it("issue action enforces READY-only helper", () => {
    const src = readFileSync("src/server/actions/invoice-actions.ts", "utf8");
    expect(src).toContain("assertInvoiceCanBeIssued");
    expect(src).toContain("record_portal_invoice_payment");
    expect(src).toContain("reverse_portal_invoice_payment");
    expect(src).toContain("mollieCall: false");
    expect(src).not.toMatch(/mollie\.payments|createPayment|refundPayment/i);
  });

  it("ships payment reversal migration", () => {
    expect(
      existsSync(
        "supabase/migrations/20260719170000_invoice_payment_reversal_integrity.sql",
      ),
    ).toBe(true);
  });
});
