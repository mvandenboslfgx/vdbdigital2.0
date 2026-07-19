/**
 * npm run audit:supabase-auth
 * Local Docker Auth summary — domains only, no full emails.
 */
import { loadEnvLocal } from "./lib/env-loader";
import { isDirectCheckoutEnabled } from "../src/config/features";
import { verdictFromFindings } from "../config/supabase-project-isolation-allowlist";
import {
  runLocalDockerSelect,
  validateEnvProjectRef,
  writeEvidence,
  type Finding,
} from "./lib/supabase-isolation-audit";

loadEnvLocal();

function main() {
  console.log("=== audit:supabase-auth (read-only) ===");
  if (isDirectCheckoutEnabled()) {
    console.log("SUPABASE ISOLATION AUDIT FAIL");
    process.exit(1);
  }
  const env = validateEnvProjectRef();
  if (!env.ok) {
    console.log("RESULT: FAIL — wrong or unverified Supabase project");
    console.log("SUPABASE ISOLATION AUDIT BLOCKED");
    process.exit(1);
  }

  const findings: Finding[] = [];
  const users = runLocalDockerSelect(`SELECT count(*)::text FROM auth.users`);
  const profiles = runLocalDockerSelect(
    `SELECT count(*)::text FROM public.profiles`,
  );
  const domains = runLocalDockerSelect(`
    SELECT lower(split_part(email,'@',2)) AS domain, count(*)::text
    FROM auth.users
    WHERE email IS NOT NULL
    GROUP BY 1
    ORDER BY count(*) DESC
    LIMIT 50
  `);

  // Prefer admin_roles when profiles.role is absent (remote/local variance)
  const hasProfileRole = runLocalDockerSelect(`
    SELECT count(*)::text FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='role'
  `);
  const useAdminRoles =
    !hasProfileRole.ok || Number(hasProfileRole.rows[0]?.[0] ?? 0) === 0;

  const roles = useAdminRoles
    ? runLocalDockerSelect(`
        SELECT role::text, count(*)::text
        FROM public.admin_roles
        GROUP BY 1
        ORDER BY 1
      `)
    : runLocalDockerSelect(`
        SELECT role::text, count(*)::text
        FROM public.profiles
        GROUP BY 1
        ORDER BY 1
      `);

  if (!users.ok || !profiles.ok || !domains.ok || !roles.ok) {
    console.log("SUPABASE ISOLATION AUDIT BLOCKED");
    console.log("auth summary query failed");
    if (!users.ok) console.log(users.error);
    if (!profiles.ok) console.log(profiles.error);
    if (!domains.ok) console.log(domains.error);
    if (!roles.ok) console.log(roles.error);
    process.exit(1);
  }

  const userCount = Number(users.rows[0]?.[0] ?? 0);
  const profileCount = Number(profiles.rows[0]?.[0] ?? 0);
  console.log(`auth.users: ${userCount}`);
  console.log(`profiles: ${profileCount}`);
  console.log(`staff role source: ${useAdminRoles ? "admin_roles" : "profiles.role"}`);
  console.log("email domains (masked):");
  for (const [domain, count] of domains.rows) {
    console.log(`  ${domain} — ${count} accounts`);
  }
  console.log("staff/admin roles:");
  for (const [role, count] of roles.rows) {
    console.log(`  ${role}: ${count}`);
    if (role === "OWNER" || role === "ADMIN") {
      const staffDomains = useAdminRoles
        ? runLocalDockerSelect(`
            SELECT lower(split_part(u.email,'@',2)), count(*)::text
            FROM public.admin_roles ar
            JOIN auth.users u ON u.id = ar.user_id
            WHERE ar.role::text = '${role.replace(/'/g, "")}'
            GROUP BY 1
          `)
        : runLocalDockerSelect(`
            SELECT lower(split_part(u.email,'@',2)), count(*)::text
            FROM public.profiles p
            JOIN auth.users u ON u.id = p.id
            WHERE p.role::text = '${role.replace(/'/g, "")}'
            GROUP BY 1
          `);
      if (staffDomains.ok) {
        for (const [d, c] of staffDomains.rows) {
          const approved =
            d === "vdbdigital.nl" ||
            d.endsWith(".local") ||
            d === "example.com" ||
            d.includes("localhost");
          if (!approved) {
            findings.push({
              area: "auth",
              subject: `${role}@${d}`,
              classification: "SECURITY_BLOCKER",
              detail: `unexpected ${role} domain count=${c}`,
              blocker: true,
            });
          }
        }
      }
    }
  }

  const blockers = findings.filter((f) => f.blocker);
  const verdict = verdictFromFindings({
    blocked: false,
    blockers: blockers.length,
    reviews: 0,
  });
  for (const b of blockers) {
    console.log(`  [BLOCKER] ${b.subject} — ${b.detail}`);
  }
  console.log(verdict);

  writeEvidence(
    `supabase-isolation-auth-${new Date().toISOString().slice(0, 10)}.md`,
    [
      "# Auth isolation summary",
      `users: ${userCount}`,
      `profiles: ${profileCount}`,
      "",
      "## Domains",
      ...domains.rows.map(([d, c]) => `- ${d} — ${c}`),
      "",
      "## Roles",
      ...roles.rows.map(([r, c]) => `- ${r}: ${c}`),
      "",
      `Verdict: ${verdict}`,
      "No full emails. Read-only: yes",
    ].join("\n"),
  );

  process.exit(blockers.length > 0 ? 1 : 0);
}

main();
