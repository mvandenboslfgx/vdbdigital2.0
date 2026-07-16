/**
 * Eenmalige OWNER bootstrap — alleen server-side CLI.
 *
 * Gebruik (PowerShell):
 *   $env:BOOTSTRAP_USER_ID="uuid-van-supabase-user"
 *   npm run db:bootstrap-owner
 *
 * Of via e-mail lookup:
 *   $env:BOOTSTRAP_USER_EMAIL="admin@example.com"
 *   npm run db:bootstrap-owner
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, requireEnv } from "./lib/env-loader";
import { getSupabaseSecretKey, requireSupabaseSecretKey } from "./lib/supabase-secret";
import { writeAuditLog } from "../src/lib/security/audit-log";

loadEnvLocal();
requireEnv(["NEXT_PUBLIC_SUPABASE_URL"]);
requireSupabaseSecretKey();

const userId = process.env.BOOTSTRAP_USER_ID;
const userEmail = process.env.BOOTSTRAP_USER_EMAIL;

if (!userId && !userEmail) {
  console.error("Stel BOOTSTRAP_USER_ID of BOOTSTRAP_USER_EMAIL in.");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  getSupabaseSecretKey()!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

async function main() {
  let targetUserId = userId;

  if (!targetUserId && userEmail) {
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) throw new Error(error.message);
    const user = data.users.find((u) => u.email === userEmail);
    if (!user) {
      console.error(`Gebruiker niet gevonden: ${userEmail}`);
      process.exit(1);
    }
    targetUserId = user.id;
  }

  const { data: existingOwners } = await supabase
    .from("admin_roles")
    .select("id, role")
    .eq("role", "OWNER");

  if (existingOwners && existingOwners.length > 0 && process.env.BOOTSTRAP_FORCE !== "1") {
    console.error(
      "Er bestaat al een OWNER. Gebruik BOOTSTRAP_FORCE=1 alleen wanneer dit bewust gewenst is.",
    );
    process.exit(1);
  }

  const { data: authUser, error: authErr } = await supabase.auth.admin.getUserById(
    targetUserId!,
  );
  if (authErr || !authUser.user) {
    console.error("Supabase Auth gebruiker niet gevonden.");
    process.exit(1);
  }

  await supabase.from("profiles").upsert({
    id: targetUserId,
    email: authUser.user.email!,
    updated_at: new Date().toISOString(),
  });

  const { error: roleErr } = await supabase.from("admin_roles").upsert(
    {
      user_id: targetUserId,
      role: "OWNER",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (roleErr) {
    console.error(`Bootstrap mislukt: ${roleErr.message}`);
    process.exit(1);
  }

  await writeAuditLog({
    userId: targetUserId,
    action: "admin.owner_bootstrapped",
    resourceType: "admin_role",
    resourceId: targetUserId,
    metadata: { role: "OWNER" },
  });

  console.log(`OWNER rol toegewezen aan user ${targetUserId!.slice(0, 8)}…`);
  console.log("Schakel MFA in via Supabase Dashboard voor dit account.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
