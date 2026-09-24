import "server-only";

import { createServiceRoleClient } from "@/lib/database/server";

export async function notifyOrganizationMembers(input: {
  organizationId: string;
  type: string;
  title: string;
  body?: string | null;
  href?: string | null;
  excludeUserIds?: string[];
}): Promise<number> {
  const supabase = createServiceRoleClient();
  if (!supabase) return 0;

  const { data: members } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", input.organizationId)
    .eq("status", "ACTIVE");

  const excluded = new Set(input.excludeUserIds ?? []);
  const userIds = Array.from(
    new Set(
      (members ?? [])
        .map((member) => member.user_id as string)
        .filter((id) => Boolean(id) && !excluded.has(id)),
    ),
  );

  if (userIds.length === 0) return 0;

  const rows = userIds.map((userId) => ({
    user_id: userId,
    organization_id: input.organizationId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    href: input.href ?? null,
    email_status: "SKIPPED",
  }));

  const { error } = await supabase.from("portal_notifications").insert(rows);
  return error ? 0 : rows.length;
}
