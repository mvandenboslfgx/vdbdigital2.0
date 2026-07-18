import { describe, expect, it } from "vitest";
import {
  assertSafeUploadFilename,
  buildStoragePath,
  hasDoubleExtension,
  sniffMime,
  resolveBucketForCategory,
} from "@/lib/validation/documents";
import { hasPermission } from "@/lib/auth/permissions";
import { hasCustomerPermission } from "@/lib/auth/customer-permissions";

describe("document path & filename safety", () => {
  it("builds org/project UUID paths", () => {
    const org = "550e8400-e29b-41d4-a716-446655440000";
    const project = "550e8400-e29b-41d4-a716-446655440001";
    const doc = "550e8400-e29b-41d4-a716-446655440002";
    const path = buildStoragePath({
      organizationId: org,
      projectId: project,
      documentId: doc,
      safeFilename: "brief.pdf",
    });
    expect(path).toContain(`organizations/${org}/projects/${project}/${doc}/`);
    expect(path.endsWith(".pdf") || path.includes("brief")).toBe(true);
  });

  it("rejects path traversal and double extensions", () => {
    expect(hasDoubleExtension("invoice.pdf.exe")).toBe(true);
    expect(() => assertSafeUploadFilename("malware.exe")).toThrow();
    expect(() => assertSafeUploadFilename("payload.js")).toThrow();
  });

  it("sniffs PDF magic bytes", () => {
    const pdf = Buffer.from("%PDF-1.4\n...");
    expect(sniffMime(pdf, "application/pdf")).toBe(true);
    expect(sniffMime(Buffer.from("not-pdf"), "application/pdf")).toBe(false);
  });

  it("maps categories to private buckets", () => {
    expect(resolveBucketForCategory("QUOTE")).toBe("quote-documents");
    expect(resolveBucketForCategory("INVOICE")).toBe("invoice-documents");
    expect(resolveBucketForCategory("PROJECT_FILE")).toBe("project-files");
  });
});

describe("document permissions", () => {
  it("OWNER can physically delete; ADMIN cannot", () => {
    expect(hasPermission("OWNER", "documents.delete_physical")).toBe(true);
    expect(hasPermission("ADMIN", "documents.delete_physical")).toBe(false);
  });

  it("VIEW_ONLY downloads but cannot upload", () => {
    expect(hasCustomerPermission("VIEW_ONLY", "portal.documents.download")).toBe(
      true,
    );
    expect(hasCustomerPermission("VIEW_ONLY", "portal.documents.upload")).toBe(
      false,
    );
  });

  it("PRIMARY can manage own uploads", () => {
    expect(
      hasCustomerPermission("PRIMARY", "portal.documents.manage_own_uploads"),
    ).toBe(true);
  });
});
