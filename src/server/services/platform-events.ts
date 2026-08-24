import "server-only";
import { createServiceRoleClient } from "@/lib/database/server";

export async function emitPlatformEvent(input: {
  eventType: string;
  entityType: string;
  entityId: string;
  idempotencyKey: string;
  payload?: Record<string, unknown>;
}): Promise<{ duplicate: boolean } | { error: string }> {
  const supabase = createServiceRoleClient();
  if (!supabase) return { error: "database_unavailable" };

  const { error } = await supabase.from("platform_events").insert({
    event_type: input.eventType,
    entity_type: input.entityType,
    entity_id: input.entityId,
    idempotency_key: input.idempotencyKey,
    status: "completed",
    payload: input.payload ?? {},
    updated_at: new Date().toISOString(),
  });

  if (error?.code === "23505") {
    return { duplicate: true };
  }
  if (error) {
    return { error: error.message };
  }
  return { duplicate: false };
}

export async function listPlatformEvents(limit = 100) {
  const supabase = createServiceRoleClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("platform_events")
    .select(
      "id, event_type, entity_type, entity_id, status, last_error, attempt_count, created_at, payload",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data;
}
