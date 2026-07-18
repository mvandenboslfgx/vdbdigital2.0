import { z } from "zod";

export const DOCUMENT_CATEGORIES = [
  "GENERAL",
  "PROJECT_FILE",
  "DELIVERABLE",
  "QUOTE",
  "INVOICE",
  "CONTRACT",
  "BRIEFING",
  "DESIGN",
  "CONTENT",
  "REPORT",
  "SUPPORT_ATTACHMENT",
  "OTHER",
] as const;

export const DOCUMENT_VISIBILITIES = [
  "INTERNAL",
  "CUSTOMER_VISIBLE",
  "CUSTOMER_UPLOAD",
  "RESTRICTED",
] as const;

export const DOCUMENT_BUCKETS = [
  "customer-documents",
  "project-files",
  "quote-documents",
  "invoice-documents",
  "support-attachments",
] as const;

export type DocumentBucket = (typeof DOCUMENT_BUCKETS)[number];

/** Max sizes by bucket (bytes) — mirrors migration */
export const BUCKET_MAX_BYTES: Record<DocumentBucket, number> = {
  "customer-documents": 25 * 1024 * 1024,
  "project-files": 50 * 1024 * 1024,
  "quote-documents": 25 * 1024 * 1024,
  "invoice-documents": 25 * 1024 * 1024,
  "support-attachments": 25 * 1024 * 1024,
};

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
] as const;

const EXT_BY_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "text/plain": "txt",
  "text/csv": "csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/zip": "zip",
};

const BLOCKED_EXTENSIONS = new Set([
  "exe",
  "bat",
  "cmd",
  "com",
  "msi",
  "scr",
  "js",
  "mjs",
  "cjs",
  "html",
  "htm",
  "svg",
  "php",
  "sh",
  "ps1",
  "dll",
  "so",
]);

export const documentUploadMetaSchema = z.object({
  organizationId: z.string().uuid(),
  projectId: z.string().uuid().optional().or(z.literal("")),
  deliverableId: z.string().uuid().optional().or(z.literal("")),
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  category: z.enum(DOCUMENT_CATEGORIES),
  visibility: z.enum(DOCUMENT_VISIBILITIES),
  bucket: z.enum(DOCUMENT_BUCKETS).optional(),
  changeSummary: z.string().trim().max(500).optional().or(z.literal("")),
  parentDocumentId: z.string().uuid().optional().or(z.literal("")),
  idempotencyKey: z.string().uuid().optional().or(z.literal("")),
});

export const documentVisibilityUpdateSchema = z.object({
  documentId: z.string().uuid(),
  expectedVersion: z.coerce.number().int().positive(),
  visibility: z.enum(DOCUMENT_VISIBILITIES),
});

export function sanitizeOriginalFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "file";
  return base
    .replace(/[^\w.\- ()\[\]]+/g, "_")
    .replace(/\0/g, "")
    .slice(0, 180);
}

export function extensionFromFilename(name: string): string {
  const m = name.toLowerCase().match(/\.([a-z0-9]{1,8})$/);
  return m?.[1] ?? "";
}

export function hasDoubleExtension(name: string): boolean {
  return /\.[a-z0-9]{1,8}\.[a-z0-9]{1,8}$/i.test(name);
}

export function assertSafeUploadFilename(name: string): string {
  const safe = sanitizeOriginalFilename(name);
  if (!safe || safe.includes("..") || safe.includes("/") || safe.includes("\\")) {
    throw new Error("INVALID_FILENAME");
  }
  if (hasDoubleExtension(safe)) {
    throw new Error("DOUBLE_EXTENSION");
  }
  const ext = extensionFromFilename(safe);
  if (BLOCKED_EXTENSIONS.has(ext)) {
    throw new Error("BLOCKED_EXTENSION");
  }
  return safe;
}

export function mimeToExtension(mime: string): string {
  return EXT_BY_MIME[mime] ?? "bin";
}

export function resolveBucketForCategory(
  category: (typeof DOCUMENT_CATEGORIES)[number],
  projectId?: string | null,
): DocumentBucket {
  switch (category) {
    case "QUOTE":
      return "quote-documents";
    case "INVOICE":
      return "invoice-documents";
    case "SUPPORT_ATTACHMENT":
      return "support-attachments";
    case "PROJECT_FILE":
    case "DELIVERABLE":
    case "DESIGN":
    case "BRIEFING":
    case "CONTENT":
    case "REPORT":
      return "project-files";
    default:
      return projectId ? "project-files" : "customer-documents";
  }
}

export function buildStoragePath(input: {
  organizationId: string;
  projectId?: string | null;
  documentId: string;
  safeFilename: string;
}): string {
  const org = input.organizationId.replace(/[^a-f0-9-]/gi, "");
  const doc = input.documentId.replace(/[^a-f0-9-]/gi, "");
  const file = assertSafeUploadFilename(input.safeFilename);
  if (!org || !doc) throw new Error("INVALID_PATH_IDS");
  if (input.projectId) {
    const project = input.projectId.replace(/[^a-f0-9-]/gi, "");
    if (!project) throw new Error("INVALID_PATH_IDS");
    return `organizations/${org}/projects/${project}/${doc}/${file}`;
  }
  return `organizations/${org}/general/${doc}/${file}`;
}

/** Lightweight magic-byte checks for common types. */
export function sniffMime(buffer: Buffer, claimedMime: string): boolean {
  if (buffer.length === 0) return false;
  if (claimedMime === "application/pdf") {
    return buffer.subarray(0, 5).toString("utf8") === "%PDF-";
  }
  if (claimedMime === "image/png") {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }
  if (claimedMime === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (claimedMime === "image/webp") {
    return (
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }
  if (claimedMime === "application/zip" || claimedMime.includes("openxmlformats")) {
    return buffer[0] === 0x50 && buffer[1] === 0x4b;
  }
  if (claimedMime === "text/plain" || claimedMime === "text/csv") {
    // Reject if high ratio of nulls / control chars that look binary
    const sample = buffer.subarray(0, Math.min(512, buffer.length));
    let weird = 0;
    for (const b of sample) {
      if (b === 0) weird += 1;
    }
    return weird === 0;
  }
  return ALLOWED_MIME_TYPES.includes(
    claimedMime as (typeof ALLOWED_MIME_TYPES)[number],
  );
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export const SIGNED_URL_TTL_SECONDS = 120;
