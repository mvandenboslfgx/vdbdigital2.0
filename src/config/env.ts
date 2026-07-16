import { z } from "zod";

/** Publieke env — veilig voor clientbundles */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SITE_NAME: z.string().min(1).default("VDB Digital"),
  NEXT_PUBLIC_CONTACT_EMAIL: z.string().email().optional(),
  NEXT_PUBLIC_SUPPORT_EMAIL: z.string().email().optional(),
  NEXT_PUBLIC_WHATSAPP_NUMBER: z.string().optional(),
  NEXT_PUBLIC_TAWK_PROPERTY_ID: z.string().optional(),
  NEXT_PUBLIC_TAWK_WIDGET_ID: z.string().optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  /** Legacy anon key (Supabase dashboard → API → anon) */
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  /** Publishable key (Supabase dashboard → API → publishable) */
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function getPublicEnv(): PublicEnv {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SITE_NAME: process.env.NEXT_PUBLIC_SITE_NAME,
    NEXT_PUBLIC_CONTACT_EMAIL: process.env.NEXT_PUBLIC_CONTACT_EMAIL,
    NEXT_PUBLIC_SUPPORT_EMAIL: process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
    NEXT_PUBLIC_WHATSAPP_NUMBER: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
    NEXT_PUBLIC_TAWK_PROPERTY_ID: process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID,
    NEXT_PUBLIC_TAWK_WIDGET_ID: process.env.NEXT_PUBLIC_TAWK_WIDGET_ID,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}

/** Publieke Supabase key — publishable heeft voorrang op legacy anon key */
export function getSupabasePublicKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

let legacySecretKeyWarned = false;

/**
 * Server-only Supabase Secret key.
 * Ondersteunt tijdelijk SUPABASE_SERVICE_ROLE_KEY (legacy/deprecated).
 */
export function getSupabaseSecretKey(): string | undefined {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (secret) return secret;

  const legacy = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (legacy) {
    if (!legacySecretKeyWarned && process.env.NODE_ENV !== "test") {
      legacySecretKeyWarned = true;
      console.warn(
        "[env] SUPABASE_SERVICE_ROLE_KEY is deprecated; migrate to SUPABASE_SECRET_KEY.",
      );
    }
    return legacy;
  }

  return undefined;
}

let legacyWebhookTokenWarned = false;

/**
 * Optioneel applicatiewebhooktoken — geen officiële Mollie signing secret.
 * Ondersteunt tijdelijk MOLLIE_WEBHOOK_SECRET (legacy).
 */
export function getMollieWebhookToken(): string | undefined {
  const token = process.env.MOLLIE_WEBHOOK_TOKEN;
  if (token) return token;

  const legacy = process.env.MOLLIE_WEBHOOK_SECRET;
  if (legacy) {
    if (!legacyWebhookTokenWarned && process.env.NODE_ENV !== "test") {
      legacyWebhookTokenWarned = true;
      console.warn(
        "[env] MOLLIE_WEBHOOK_SECRET is deprecated; migrate to MOLLIE_WEBHOOK_TOKEN.",
      );
    }
    return legacy;
  }

  return undefined;
}

export function isProtectedPreviewDeployment(): boolean {
  return process.env.VERCEL === "1" && process.env.VERCEL_ENV === "preview";
}

/** Server-only env — importeer alleen vanuit server-only modules */
const serverEnvSchema = publicEnvSchema.extend({
  /** Supabase Secret key (server-only) */
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
  /** @deprecated Gebruik SUPABASE_SECRET_KEY */
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  MOLLIE_API_KEY: z.string().min(1).optional(),
  /** Optioneel applicatiewebhooktoken (geen Mollie signature) */
  MOLLIE_WEBHOOK_TOKEN: z.string().min(1).optional(),
  /** @deprecated Gebruik MOLLIE_WEBHOOK_TOKEN */
  MOLLIE_WEBHOOK_SECRET: z.string().min(1).optional(),
  /** Vercel Deployment Protection bypass — uitsluitend Preview, server-side */
  VERCEL_AUTOMATION_BYPASS_SECRET: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().email().optional(),
  EMAIL_ADMIN: z.string().email().optional(),
  TAWK_API_SECRET: z.string().min(1).optional(),
  TURNSTILE_SECRET_KEY: z.string().min(1).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedServerEnv: ServerEnv | null = null;

function envWithoutEmpty(values: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value === "" || value === undefined) continue;
    out[key] = value;
  }
  return out;
}

export function getServerEnv(): ServerEnv {
  if (cachedServerEnv) return cachedServerEnv;
  cachedServerEnv = serverEnvSchema.parse(
    envWithoutEmpty({
      ...process.env,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      NEXT_PUBLIC_SITE_NAME: process.env.NEXT_PUBLIC_SITE_NAME ?? "VDB Digital",
    }),
  );
  return cachedServerEnv;
}

export function isSupabasePublicConfigured(): boolean {
  const env = getPublicEnv();
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && getSupabasePublicKey());
}

export function isSupabaseFullyConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL && getSupabasePublicKey() && getSupabaseSecretKey(),
  );
}

export function validateProductionEnv(): { ok: true } | { ok: false; missing: string[] } {
  if (process.env.NODE_ENV !== "production") {
    return { ok: true };
  }

  const env = getServerEnv();
  const required: Array<[string, unknown]> = [
    ["NEXT_PUBLIC_APP_URL", env.NEXT_PUBLIC_APP_URL],
    ["NEXT_PUBLIC_SUPABASE_URL", env.NEXT_PUBLIC_SUPABASE_URL],
    ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", getSupabasePublicKey()],
    ["SUPABASE_SECRET_KEY", getSupabaseSecretKey()],
    ["MOLLIE_API_KEY", env.MOLLIE_API_KEY],
    ["RESEND_API_KEY", env.RESEND_API_KEY],
    ["EMAIL_FROM", env.EMAIL_FROM],
  ];

  const missing = required.filter(([, v]) => !v).map(([k]) => k);
  if (missing.length > 0) {
    return { ok: false, missing };
  }
  return { ok: true };
}

/** Zelfde vereisten als production — gebruikt bij Vercel Preview builds. */
export function validatePreviewBuildEnv(): { ok: true } | { ok: false; missing: string[] } {
  return validateProductionEnv();
}
