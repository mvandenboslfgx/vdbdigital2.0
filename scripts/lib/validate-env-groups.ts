/**
 * Gedeelde environmentvalidatie — print nooit waarden.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getSupabaseSecretKey, hasPublicSupabaseKey } from "./supabase-secret";

export type EnvStatus = "configured" | "missing" | "invalid format";

export interface EnvCheck {
  name: string;
  status: EnvStatus;
  note?: string;
  group: string;
}

export function isUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function isEmail(value: string | undefined): boolean {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
}

export function isMollieTestKey(value: string | undefined): boolean {
  return Boolean(value && value.startsWith("test_"));
}

export function isMollieLiveKey(value: string | undefined): boolean {
  return Boolean(value && value.startsWith("live_"));
}

export function check(
  name: string,
  present: boolean,
  valid: boolean,
  group: string,
  note?: string,
): EnvCheck {
  if (!present) return { name, status: "missing", note, group };
  if (!valid) return { name, status: "invalid format", note, group };
  return { name, status: "configured", note, group };
}

export function isTawkWidgetConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_TAWK_WIDGET_ID?.trim());
}

export function isTawkFullyConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID?.trim() &&
      process.env.NEXT_PUBLIC_TAWK_WIDGET_ID?.trim(),
  );
}

export function collectEnvChecks(): EnvCheck[] {
  const secretKey = getSupabaseSecretKey();
  const secretPresent = Boolean(secretKey);
  const secretValid = Boolean(
    secretPresent && !secretKey!.startsWith("NEXT_PUBLIC_"),
  );

  return [
    check(
      "NEXT_PUBLIC_SUPABASE_URL",
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      isUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
      "core/database",
    ),
    check(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or ANON_KEY)",
      hasPublicSupabaseKey(),
      hasPublicSupabaseKey(),
      "core/database",
    ),
    check(
      "SUPABASE_SECRET_KEY",
      secretPresent,
      secretValid,
      "core/database",
      process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SECRET_KEY
        ? "legacy SUPABASE_SERVICE_ROLE_KEY in use — migrate"
        : "must not start with NEXT_PUBLIC_",
    ),
    check(
      "NEXT_PUBLIC_APP_URL",
      Boolean(process.env.NEXT_PUBLIC_APP_URL),
      isUrl(process.env.NEXT_PUBLIC_APP_URL),
      "preview/checkout",
    ),
    check(
      "MOLLIE_API_KEY",
      Boolean(process.env.MOLLIE_API_KEY),
      isMollieTestKey(process.env.MOLLIE_API_KEY),
      "preview/checkout",
      "must start with test_",
    ),
    check(
      "MOLLIE_WEBHOOK_TOKEN (or legacy SECRET)",
      Boolean(
        process.env.MOLLIE_WEBHOOK_TOKEN || process.env.MOLLIE_WEBHOOK_SECRET,
      ),
      Boolean(
        process.env.MOLLIE_WEBHOOK_TOKEN || process.env.MOLLIE_WEBHOOK_SECRET,
      ),
      "preview/checkout",
      "optional — applicatietoken, geen Mollie signature",
    ),
    check(
      "VERCEL_AUTOMATION_BYPASS_SECRET",
      Boolean(process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim()),
      Boolean(process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim()),
      "preview/checkout",
      "vereist voor Mollie op beschermde Preview",
    ),
    check(
      "RESEND_API_KEY",
      Boolean(process.env.RESEND_API_KEY),
      Boolean(process.env.RESEND_API_KEY?.length),
      "transactional/email",
    ),
    check(
      "EMAIL_FROM",
      Boolean(process.env.EMAIL_FROM),
      isEmail(process.env.EMAIL_FROM),
      "transactional/email",
    ),
    check(
      "EMAIL_ADMIN",
      Boolean(process.env.EMAIL_ADMIN),
      isEmail(process.env.EMAIL_ADMIN),
      "transactional/email",
    ),
    check(
      "NEXT_PUBLIC_TAWK_PROPERTY_ID",
      Boolean(process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID?.trim()),
      Boolean(process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID?.trim()),
      "optional/chat",
    ),
    check(
      "NEXT_PUBLIC_TAWK_WIDGET_ID",
      isTawkWidgetConfigured(),
      isTawkWidgetConfigured(),
      "optional/chat",
      "optional — zonder Widget ID blijft tawk.to uitgeschakeld",
    ),
    check(
      "TAWK_API_SECRET",
      Boolean(process.env.TAWK_API_SECRET),
      Boolean(
        process.env.TAWK_API_SECRET &&
          !process.env.TAWK_API_SECRET.startsWith("NEXT_PUBLIC_"),
      ),
      "optional/chat",
    ),
    check(
      "NEXT_PUBLIC_WHATSAPP_NUMBER",
      Boolean(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim()),
      Boolean(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim()),
      "optional/whatsapp",
    ),
  ];
}

export function printEnvReport(checks: EnvCheck[], title: string): void {
  console.log(`${title}\n`);
  for (const group of [
    "core/database",
    "preview/checkout",
    "transactional/email",
    "optional/chat",
    "optional/whatsapp",
  ]) {
    const items = checks.filter((c) => c.group === group);
    console.log(`[${group}]`);
    for (const status of ["configured", "missing", "invalid format"] as EnvStatus[]) {
      const subset = items.filter((c) => c.status === status);
      if (subset.length === 0) continue;
      console.log(`  ${status}: ${subset.map((c) => c.name).join(", ")}`);
    }
    console.log("");
  }
}

export function printIntegrationStatus(): void {
  if (isTawkFullyConfigured()) {
    console.log("tawk.to: OPTIONAL — ENABLED");
  } else {
    console.log("tawk.to: OPTIONAL — DISABLED");
  }
  console.log("rate limiting: VERCEL WAF CONFIGURATION REQUIRED");
}

export function printStructuralChecks(): boolean {
  let ok = true;
  const gitignorePath = resolve(process.cwd(), ".gitignore");
  const gitignore = existsSync(gitignorePath) ? readFileSync(gitignorePath, "utf8") : "";
  const envLocalIgnored =
    gitignore.includes(".env*") || gitignore.includes(".env.local");
  console.log(
    envLocalIgnored
      ? "PASS .env.local is covered by .gitignore"
      : "FAIL .env.local not in .gitignore",
  );
  if (!envLocalIgnored) ok = false;

  const examplePath = resolve(process.cwd(), ".env.example");
  const example = existsSync(examplePath) ? readFileSync(examplePath, "utf8") : "";
  const exampleHasSecrets = /(test_[a-zA-Z0-9]+|sb_publishable_|sb_secret_|eyJ[A-Za-z0-9+/=]{20,}|sk_live|sk_test)/.test(
    example,
  );
  console.log(
    exampleHasSecrets
      ? "FAIL .env.example contains real-looking secrets"
      : "PASS .env.example uses placeholders only",
  );
  if (exampleHasSecrets) ok = false;
  return ok;
}

export function missingInGroup(checks: EnvCheck[], group: string): EnvCheck[] {
  return checks.filter((c) => c.group === group && c.status === "missing");
}

export function invalidInGroup(checks: EnvCheck[], group: string): EnvCheck[] {
  return checks.filter((c) => c.group === group && c.status === "invalid format");
}
