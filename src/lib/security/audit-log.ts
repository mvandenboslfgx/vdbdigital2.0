import "server-only";
import { createServiceRoleClient } from "@/lib/database/server";
import { isSupabaseFullyConfigured } from "@/config/env";

export interface AuditLogInput {
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

const REDACTED_KEYS = ["password", "token", "secret", "authorization", "cookie"];

function sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (REDACTED_KEYS.some((k) => key.toLowerCase().includes(k))) {
      clean[key] = "[REDACTED]";
    } else if (typeof value === "string" && value.length > 500) {
      clean[key] = value.slice(0, 500) + "…";
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  if (!isSupabaseFullyConfigured()) return;

  const supabase = createServiceRoleClient();
  if (!supabase) return;

  await supabase.from("audit_logs").insert({
    user_id: input.userId ?? null,
    action: input.action,
    resource_type: input.resourceType ?? null,
    resource_id: input.resourceId ?? null,
    metadata: sanitizeMetadata(input.metadata ?? {}),
    ip_address: input.ipAddress ?? null,
  });
}
