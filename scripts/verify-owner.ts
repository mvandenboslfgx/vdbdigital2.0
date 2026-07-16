/**
 * OWNER-validatie — print geen volledige e-mail of user-ID.
 * Gebruik: npm run db:verify-owner
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, requireEnv } from "./lib/env-loader";
import { getSupabaseSecretKey, requireSupabaseSecretKey } from "./lib/supabase-secret";

loadEnvLocal();
requireEnv(["NEXT_PUBLIC_SUPABASE_URL"]);
requireSupabaseSecretKey();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  getSupabaseSecretKey()!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "[invalid]";
  const visible = local.slice(0, 1);
  return `${visible}***@${domain}`;
}

async function main(): Promise<void> {
  const { data: owners, error } = await supabase
    .from("admin_roles")
    .select("user_id, role")
    .eq("role", "OWNER");

  if (error) {
    console.error("FAIL owner query");
    process.exit(1);
  }

  if (!owners || owners.length === 0) {
    console.error("BLOCKED: geen OWNER gevonden");
    console.error('Stel in: $env:BOOTSTRAP_USER_EMAIL = "jouw-admin-emailadres"');
    console.error("npm run db:bootstrap-owner");
    console.error("Remove-Item Env:BOOTSTRAP_USER_EMAIL");
    process.exit(2);
  }

  if (owners.length > 1) {
    console.error(`FAIL: ${owners.length} OWNER-records (verwacht 1)`);
    process.exit(1);
  }

  const ownerId = owners[0]!.user_id as string;
  const { data: authUser, error: authErr } = await supabase.auth.admin.getUserById(ownerId);

  if (authErr || !authUser.user) {
    console.error("FAIL: OWNER niet gekoppeld aan Supabase Auth-user");
    process.exit(1);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", ownerId)
    .maybeSingle();

  console.log("PASS minimaal één OWNER");
  console.log(`PASS geen dubbele ownerrecords (${owners.length})`);
  console.log("PASS owner gekoppeld aan Auth-user");
  console.log(`PASS owner profiel ${profile ? "aanwezig" : "ontbreekt (optioneel)"}`);
  if (authUser.user.email) {
    console.log(`INFO owner e-mail: ${maskEmail(authUser.user.email)}`);
  }
  console.log(`INFO owner user: ${ownerId.slice(0, 8)}…`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
