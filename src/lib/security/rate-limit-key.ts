/**
 * Hashed rate-limit identifiers — never store raw emails/IPs as Redis/DB keys.
 */
import { createHash } from "crypto";

export function hashRateLimitIdentifier(identifier: string): string {
  const normalized = identifier.trim().toLowerCase() || "anonymous";
  return createHash("sha256").update(normalized).digest("hex").slice(0, 40);
}

export function buildRateLimitStorageKey(bucket: string, identifier: string): string {
  return `rl:${bucket}:${hashRateLimitIdentifier(identifier)}`;
}
