"use server";

import { createFormSchemas } from "@/lib/validation/forms";
import { checkRateLimit, rateLimitErrorMessage } from "@/lib/security/rate-limit";
import { verifyOrigin } from "@/lib/security/origin";
import {
  sendContactConfirmation,
  sendContactNotification,
  sendQuoteConfirmation,
  sendQuoteNotification,
  sendSupportConfirmation,
} from "@/lib/email/resend";
import {
  createServiceRoleClient,
  isSupabaseDatabaseReady,
} from "@/lib/database/server";
import { isProductionRuntime } from "@/lib/runtime/environment";
import { parseFormLocale } from "@/i18n/locale-query";
import { getDictionary } from "@/i18n/get-dictionary";
import { randomUUID } from "crypto";

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

async function guardForm(
  bucket: string,
  email: string,
): Promise<string[] | null> {
  if (!(await verifyOrigin())) return ["Invalid request"];
  const rateLimit = await checkRateLimit(bucket, email);
  if (!rateLimit.success) return [rateLimitErrorMessage(rateLimit)];
  return null;
}

async function persistOrFail(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (isSupabaseDatabaseReady()) {
    return { ok: true };
  }
  if (isProductionRuntime()) {
    return { ok: false, error: "Form storage requires database configuration" };
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
  const { t } = await getDictionary(locale);
  const { contactFormSchema } = createFormSchemas(t);
  const parsed = contactFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.issues.map((i) => i.message) };
  }

  const guard = await guardForm("contact", parsed.data.email);
  if (guard) return { errors: guard };

  const storage = await persistOrFail();
  if (!storage.ok) return { errors: [storage.error] };

  if (isSupabaseDatabaseReady()) {
    const supabase = createServiceRoleClient();
    const { error } = await supabase!.from("contact_submissions").insert({
      id: randomUUID(),
      name: parsed.data.name,
      email: parsed.data.email,
      company: parsed.data.company,
      phone: parsed.data.phone,
      subject: parsed.data.subject,
      message: parsed.data.message,
      locale,
    });
    if (error) {
      return {
        errors: ["Your request could not be saved. Please try again later."],
      };
    }
  }

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
  const { t } = await getDictionary(locale);
  const { quoteFormSchema } = createFormSchemas(t);
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

  const guard = await guardForm("quote", parsed.data.email);
  if (guard) return { errors: guard, values, attempt };

  const storage = await persistOrFail();
  if (!storage.ok) return { errors: [storage.error], values, attempt };

  const description = buildQuoteDescription(parsed.data);
  const budgetLabel = parsed.data.budget
    ? (BUDGET_LABELS[parsed.data.budget] ?? parsed.data.budget)
    : undefined;

  if (isSupabaseDatabaseReady()) {
    const supabase = createServiceRoleClient();
    const { error } = await supabase!.from("quote_requests").insert({
      id: randomUUID(),
      name: parsed.data.name,
      email: parsed.data.email,
      company: parsed.data.company,
      phone: parsed.data.phone,
      project_type: parsed.data.projectType,
      budget: budgetLabel,
      timeline: parsed.data.timeline,
      description,
      status: "NEW",
      locale,
    });
    if (error) {
      console.error("[submitQuoteAction] quote_requests insert failed", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return {
        errors: ["Your quote request could not be saved."],
        values,
        attempt,
      };
    }
  }

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
  const { t } = await getDictionary(locale);
  const { supportFormSchema } = createFormSchemas(t);
  const parsed = supportFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.issues.map((i) => i.message) };
  }

  const guard = await guardForm("support", parsed.data.email);
  if (guard) return { errors: guard };

  const storage = await persistOrFail();
  if (!storage.ok) return { errors: [storage.error] };

  if (isSupabaseDatabaseReady()) {
    const supabase = createServiceRoleClient();
    const { error } = await supabase!.from("leads").insert({
      id: randomUUID(),
      type: "SUPPORT",
      name: parsed.data.name,
      email: parsed.data.email,
      subject: parsed.data.subject,
      message: parsed.data.message,
      status: "NEW",
      metadata: {
        priority: parsed.data.priority,
        orderReference: parsed.data.orderReference,
        locale,
      },
    });
    if (error) {
      return { errors: ["Your support request could not be saved."] };
    }
  }

  const confirm = await sendSupportConfirmation(
    parsed.data.email,
    parsed.data.name,
    locale,
  );
  return { success: true, mailPending: !confirm.sent };
}
