import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { createServiceRoleClient } from "@/lib/database/server";
import {
  ALLOWED_MIME_TYPES,
  BUCKET_MAX_BYTES,
  SIGNED_URL_TTL_SECONDS,
  assertSafeUploadFilename,
  buildStoragePath,
  mimeToExtension,
  resolveBucketForCategory,
  sniffMime,
  type DocumentBucket,
  DOCUMENT_CATEGORIES,
} from "@/lib/validation/documents";

export function sha256Hex(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export type PreparedUpload = {
  documentId: string;
  bucket: DocumentBucket;
  storagePath: string;
  safeFilename: string;
  fileExtension: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
  buffer: Buffer;
};

export function prepareUploadBuffer(input: {
  fileName: string;
  claimedMime: string;
  buffer: Buffer;
  category: (typeof DOCUMENT_CATEGORIES)[number];
  organizationId: string;
  projectId?: string | null;
  documentId?: string;
  bucket?: DocumentBucket;
}): PreparedUpload {
  if (input.buffer.length === 0) {
    throw new Error("EMPTY_FILE");
  }

  const mime = input.claimedMime.toLowerCase().split(";")[0]?.trim() ?? "";
  if (!ALLOWED_MIME_TYPES.includes(mime as (typeof ALLOWED_MIME_TYPES)[number])) {
    throw new Error("MIME_NOT_ALLOWED");
  }
  if (!sniffMime(input.buffer, mime)) {
    throw new Error("MIME_MISMATCH");
  }

  const bucket =
    input.bucket ??
    resolveBucketForCategory(input.category, input.projectId);
  const max = BUCKET_MAX_BYTES[bucket];
  if (input.buffer.length > max) {
    throw new Error("FILE_TOO_LARGE");
  }

  // ZIP only for staff project-files (caller enforces); still allow in prepare
  const originalSafe = assertSafeUploadFilename(input.fileName);
  const ext = mimeToExtension(mime);
  const documentId = input.documentId ?? randomUUID();
  const safeFilename = `v1-${documentId.slice(0, 8)}.${ext}`;
  const storagePath = buildStoragePath({
    organizationId: input.organizationId,
    projectId: input.projectId,
    documentId,
    safeFilename,
  });

  return {
    documentId,
    bucket,
    storagePath,
    safeFilename: originalSafe,
    fileExtension: ext,
    mimeType: mime,
    sizeBytes: input.buffer.length,
    checksumSha256: sha256Hex(input.buffer),
    buffer: input.buffer,
  };
}

export async function uploadToPrivateBucket(
  prepared: PreparedUpload,
): Promise<void> {
  const supabase = createServiceRoleClient();
  if (!supabase) throw new Error("DATABASE_UNAVAILABLE");

  const { error } = await supabase.storage
    .from(prepared.bucket)
    .upload(prepared.storagePath, prepared.buffer, {
      contentType: prepared.mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(`STORAGE_UPLOAD_FAILED:${error.message}`);
  }
}

export async function removeStorageObject(
  bucket: string,
  path: string,
): Promise<void> {
  const supabase = createServiceRoleClient();
  if (!supabase) return;
  await supabase.storage.from(bucket).remove([path]);
}

export async function createShortLivedSignedUrl(input: {
  bucket: string;
  path: string;
  downloadName: string;
}): Promise<{ url: string; expiresIn: number }> {
  const supabase = createServiceRoleClient();
  if (!supabase) throw new Error("DATABASE_UNAVAILABLE");

  const { data, error } = await supabase.storage
    .from(input.bucket)
    .createSignedUrl(input.path, SIGNED_URL_TTL_SECONDS, {
      download: input.downloadName,
    });

  if (error || !data?.signedUrl) {
    throw new Error("SIGNED_URL_FAILED");
  }

  return { url: data.signedUrl, expiresIn: SIGNED_URL_TTL_SECONDS };
}
