"use server";

import {
  contactFormSchema,
  quoteFormSchema,
  supportFormSchema,
} from "@/lib/validation/forms";
import { rateLimitErrorMessage } from "@/lib/security/rate-limit";
import { buildRateLimitStorageKey } from "@/lib/security/rate-limit-key";
import { verifyOrigin } from "@/lib/security/origin";
import {
  sendContactConfirmation,
  sendContactNotification,
  sendQuoteConfirmation,
  sendQuoteNotification,
  sendSupportConfirmation,
} from "@/lib/email/resend";
import {
  createServerSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/database/server";
import { isProductionRuntime } from "@/lib/runtime/environment";
import { parseFormLocale } from "@/i18n/locale-query";

export type FormState = {
  errors?: string[];
  success?: boolean;
  mailPending?: boolean;
  /** Previous field values — used to preserve input after validation errors */
  values?: Record<string, string>;
  attempt?: number;
} | null;

function collectFormValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string") continue;
    if (key === "website") continue; // honeypot
    values[key] = value;
  }
  return values;
}

const BUDGET_LABELS: Record<string, string> = {
  under_1000: "Under €1,000",
  "1000_2500": "€1,000–€2,500",
  "2500_5000": "€2,500–€5,000",
  "5000_10000": "€5,000–€10,000",
  "10000_plus": "€10,000+",
  not_sure: "Not sure yet",
};

function buildQuoteDescription(
  data: {
    goals: string;
    problems?: string;
    requiredFunctionality?: string;
    languages?: string;
    maintenanceNeed?: string;
    currentWebsite?: string;
    preferredContactMethod?: string;
    meetingPreference: string;
    meetingLocation?: string;
    companyWebsite?: string;
    vatNumber?: string;
    country?: string;
    industry?: string;
    customerType: string;
    packageSlug?: string;
    productSlug?: string;
    requestIntent?: string;
    softwareSlug?: string;
    description?: string;
  },
): string {
  const lines: string[] = [];
  lines.push(data.goals);
  if (data.problems?.trim()) lines.push(`Problems:\n${data.problems.trim()}`);
  if (data.requiredFunctionality?.trim()) {
    lines.push(`Required functionality:\n${data.requiredFunctionality.trim()}`);
  }
  if (data.languages?.trim()) lines.push(`Languages: ${data.languages.trim()}`);
  if (data.maintenanceNeed?.trim()) {
    lines.push(`Maintenance need: ${data.maintenanceNeed.trim()}`);
  }
  if (data.currentWebsite?.trim()) {
    lines.push(`Current website: ${data.currentWebsite.trim()}`);
  }

  const meta: string[] = [
    `Customer type: ${data.customerType}`,
    `Meeting preference: ${data.meetingPreference}`,
  ];
  if (data.meetingLocation?.trim()) {
    meta.push(`Meeting location: ${data.meetingLocation.trim()}`);
  }
  if (data.preferredContactMethod) {
    meta.push(`Preferred contact: ${data.preferredContactMethod}`);
  }
  if (data.packageSlug?.trim()) meta.push(`Package: ${data.packageSlug.trim()}`);
  if (data.productSlug?.trim()) meta.push(`Product: ${data.productSlug.trim()}`);
  if (data.requestIntent?.trim()) meta.push(`Intent: ${data.requestIntent.trim()}`);
  if (data.softwareSlug?.trim()) meta.push(`Software SKU: ${data.softwareSlug.trim()}`);
  if (data.companyWebsite?.trim()) {
    meta.push(`Company website: ${data.companyWebsite.trim()}`);
  }
  if (data.vatNumber?.trim()) meta.push(`VAT: ${data.vatNumber.trim()}`);
  if (data.country?.trim()) meta.push(`Country: ${data.country.trim()}`);
  if (data.industry?.trim()) meta.push(`Industry: ${data.industry.trim()}`);
  if (data.description?.trim() && data.description.trim() !== data.goals.trim()) {
    lines.push(data.description.trim());
  }
  lines.push(`---\n${meta.join("\n")}`);
  return lines.join("\n\n");
}

async function guardFormOrigin(): Promise<string[] | null> {
  if (!(await verifyOrigin())) return ["Invalid request"];
  return null;
}

type PublicFormKind = "contact" | "quote" | "support";

type PublicFormRpcRow = {
  ok?: boolean;
  retry_after_seconds?: number;
  record_id?: string | null;
  error_code?: string | null;
};

async function persistPublicForm(
  kind: PublicFormKind,
  email: string,
  payload: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const secret = process.env.PUBLIC_FORM_RPC_SECRET;

  if (!isSupabaseConfigured() || !secret) {
    if (isProductionRuntime()) {
      return { ok: false, error: "Form storage is temporarily unavailable" };
    }
    return { ok: true };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { ok: false, error: "Form storage is temporarily unavailable" };
  }

  const { data, error } = await supabase.rpc("submit_vdb_public_form", {
    p_secret: secret,
    p_kind: kind,
    p_rate_key: buildRateLimitStorageKey(kind, email),
    p_payload: payload,
  });

  if (error) {
    return { ok: false, error: "Your request could not be saved. Please try again later." };
  }

  const row = (Array.isArray(data) ? data[0] : data) as PublicFormRpcRow | null;
  if (!row?.ok) {
    if (row?.error_code === "rate_limited") {
      return {
        ok: false,
        error: rateLimitErrorMessage({
          success: false,
          retryAfterSeconds: Number(row.retry_after_seconds ?? 60),
        }),
      };
    }
    return { ok: false, error: "Your request could not be saved. Please try again later." };
  }

  return { ok: true };
}

export async function submitContactAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = Object.fromEntries(formData.entries());
  if (raw.website) return { errors: ["Invalid request"] };

  const locale = parseFormLocale(raw.locale);
  const parsed = contactFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.issues.map((i) => i.message) };
  }

  const guard = await guardFormOrigin();
  if (guard) return { errors: guard };

  const storage = await persistPublicForm("contact", parsed.data.email, {
    name: parsed.data.name,
    email: parsed.data.email,
    company: parsed.data.company ?? null,
    phone: parsed.data.phone ?? null,
    subject: parsed.data.subject,
    message: parsed.data.message,
    locale,
  });
  if (!storage.ok) return { errors: [storage.error] };

  const confirm = await sendContactConfirmation(
    parsed.data.email,
    parsed.data.name,
    locale,
  );
  await sendContactNotification({ ...parsed.data, locale });

  return {
    success: true,
    mailPending: !confirm.sent,
  };
}

export async function submitQuoteAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = collectFormValues(formData);
  const attempt = Date.now();

  if (formData.get("website")) {
    return { errors: ["Invalid request"], values, attempt };
  }

  const locale = parseFormLocale(formData.get("locale"));
  const prepared = {
    ...Object.fromEntries(formData.entries()),
    privacyConsent: formData.get("privacyConsent") === "true" ? true : undefined,
    termsConsent: formData.get("termsConsent") === "true",
    packageSlug: String(formData.get("packageSlug") ?? "").trim() || undefined,
    productSlug: String(formData.get("productSlug") ?? "").trim() || undefined,
    preferredContactMethod:
      String(formData.get("preferredContactMethod") ?? "").trim() || undefined,
    budget: String(formData.get("budget") ?? "").trim() || undefined,
  };

  const parsed = quoteFormSchema.safeParse(prepared);
  if (!parsed.success) {
    return {
      errors: parsed.error.issues.map((i) => i.message),
      values,
      attempt,
    };
  }

  const guard = await guardFormOrigin();
  if (guard) return { errors: guard, values, attempt };

  const description = buildQuoteDescription(parsed.data);
  const budgetLabel = parsed.data.budget
    ? (BUDGET_LABELS[parsed.data.budget] ?? parsed.data.budget)
    : undefined;

  const storage = await persistPublicForm("quote", parsed.data.email, {
    name: parsed.data.name,
    email: parsed.data.email,
    company: parsed.data.company ?? null,
    phone: parsed.data.phone ?? null,
    project_type: parsed.data.projectType,
    budget: budgetLabel ?? null,
    timeline: parsed.data.timeline ?? null,
    description,
    locale,
  });
  if (!storage.ok) return { errors: [storage.error], values, attempt };

  const confirm = await sendQuoteConfirmation(
    parsed.data.email,
    parsed.data.name,
    locale,
  );
  await sendQuoteNotification({
    name: parsed.data.name,
    email: parsed.data.email,
    projectType: parsed.data.projectType,
    description,
    locale,
  });

  return { success: true, mailPending: !confirm.sent };
}

export async function submitSupportAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = Object.fromEntries(formData.entries());
  if (raw.website) return { errors: ["Invalid request"] };

  const locale = parseFormLocale(raw.locale);
  const parsed = supportFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.issues.map((i) => i.message) };
  }

  const guard = await guardFormOrigin();
  if (guard) return { errors: guard };

  const storage = await persistPublicForm("support", parsed.data.email, {
    name: parsed.data.name,
    email: parsed.data.email,
    subject: parsed.data.subject,
    message: parsed.data.message,
    priority: parsed.data.priority,
    order_reference: parsed.data.orderReference ?? null,
    locale,
  });
  if (!storage.ok) return { errors: [storage.error] };

  const confirm = await sendSupportConfirmation(
    parsed.data.email,
    parsed.data.name,
    locale,
  );
  return { success: true, mailPending: !confirm.sent };
}
