import { z } from "zod";
import { createT, type TranslateFn } from "@/i18n/create-t";
import en from "@/i18n/messages/en";

export const budgetRangeSchema = z.enum([
  "under_1000",
  "1000_2500",
  "2500_5000",
  "5000_10000",
  "10000_plus",
  "not_sure",
]);

/**
 * Builds locale-aware Zod schemas. Zod validation runs synchronously, so
 * callers resolve the request locale first (e.g. via `parseFormLocale` +
 * `getDictionary`) and pass a bound `t` here rather than awaiting per-field.
 */
export function createFormSchemas(t: TranslateFn) {
  const emailSchema = z
    .string()
    .trim()
    .min(5, t("errors.validation.emailRequired"))
    .max(254, t("errors.validation.emailTooLong"))
    .email(t("errors.validation.emailInvalid"));

  const nameSchema = z
    .string()
    .trim()
    .min(2, t("errors.validation.nameRequired"))
    .max(100, t("errors.validation.nameTooLong"));

  const supportPrioritySchema = z
    .enum(["low", "normal", "high", "laag", "normaal", "hoog"])
    .transform((value): "low" | "normal" | "high" => {
      switch (value) {
        case "laag":
          return "low";
        case "normaal":
          return "normal";
        case "hoog":
          return "high";
        default:
          return value;
      }
    });

  const optionalTrimmed = z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined));

  const quoteFormSchema = z
    .object({
      customerType: z.enum(["business", "consumer"], {
        message: t("errors.validation.customerTypeRequired"),
      }),
      name: nameSchema,
      email: emailSchema,
      phone: z.string().trim().max(30).optional(),
      preferredContactMethod: z.enum(["email", "phone", "whatsapp"]).optional(),
      company: z.string().trim().max(200).optional(),
      companyWebsite: optionalTrimmed,
      vatNumber: z.string().trim().max(30).optional(),
      country: z.string().trim().max(100).optional(),
      industry: z.string().trim().max(200).optional(),
      projectType: z
        .string()
        .trim()
        .min(2, t("errors.validation.projectTypeRequired"))
        .max(200),
      packageSlug: z.string().trim().max(100).optional(),
      productSlug: z.string().trim().max(100).optional(),
      currentWebsite: optionalTrimmed,
      goals: z
        .string()
        .trim()
        .min(20, t("errors.validation.goalsTooShort"))
        .max(5000),
      problems: z.string().trim().max(5000).optional(),
      requiredFunctionality: z.string().trim().max(5000).optional(),
      languages: z.string().trim().max(500).optional(),
      maintenanceNeed: z.string().trim().max(500).optional(),
      timeline: z.string().trim().max(200).optional(),
      budget: z
        .string()
        .trim()
        .optional()
        .transform((v) => (v && v.length > 0 ? v : undefined))
        .pipe(budgetRangeSchema.optional()),
      meetingPreference: z.enum(["online", "in_person", "either"], {
        message: t("errors.validation.meetingPreferenceRequired"),
      }),
      meetingLocation: z.string().trim().max(300).optional(),
      privacyConsent: z.literal(true, {
        message: t("errors.validation.privacyConsentRequired"),
      }),
      termsConsent: z.boolean().optional(),
      /** Legacy field name kept for callers that still send description */
      description: z.string().trim().max(10000).optional(),
      website: z.string().max(0).optional(), // honeypot
    })
    .superRefine((data, ctx) => {
      if (data.customerType === "business") {
        if (!data.company || data.company.trim().length < 2) {
          ctx.addIssue({
            code: "custom",
            message: t("errors.validation.companyRequired"),
            path: ["company"],
          });
        }
      }
      if (data.meetingPreference === "in_person") {
        if (!data.meetingLocation || data.meetingLocation.trim().length < 2) {
          ctx.addIssue({
            code: "custom",
            message: t("errors.validation.meetingLocationRequired"),
            path: ["meetingLocation"],
          });
        }
      }
    });

  const contactFormSchema = z.object({
    name: nameSchema,
    email: emailSchema,
    company: z.string().trim().max(200).optional(),
    phone: z.string().trim().max(30).optional(),
    subject: z
      .string()
      .trim()
      .min(3, t("errors.validation.subjectRequired"))
      .max(200, t("errors.validation.subjectTooLong")),
    message: z
      .string()
      .trim()
      .min(10, t("errors.validation.messageTooShort"))
      .max(5000, t("errors.validation.messageTooLong")),
    website: z.string().max(0).optional(), // honeypot
  });

  const supportFormSchema = z.object({
    name: nameSchema,
    email: emailSchema,
    orderReference: z.string().trim().max(100).optional(),
    priority: supportPrioritySchema,
    subject: z
      .string()
      .trim()
      .min(3, t("errors.validation.subjectRequired"))
      .max(200, t("errors.validation.subjectTooLong")),
    message: z
      .string()
      .trim()
      .min(10, t("errors.validation.issueDescriptionTooShort"))
      .max(5000, t("errors.validation.messageTooLong")),
    website: z.string().max(0).optional(), // honeypot
  });

  const checkoutFormSchema = z.object({
    email: emailSchema,
    firstName: nameSchema,
    lastName: nameSchema,
    company: z.string().trim().max(200).optional(),
    phone: z.string().trim().max(30).optional(),
    vatNumber: z.string().trim().max(30).optional(),
    addressLine1: z.string().trim().max(200).optional(),
    postalCode: z.string().trim().max(20).optional(),
    city: z.string().trim().max(100).optional(),
    country: z.string().trim().min(2).max(100).default("NL"),
    notes: z.string().trim().max(2000).optional(),
    customerType: z.enum(["B2B", "B2C"]),
    idempotencyKey: z.string().uuid().optional(),
    acceptTerms: z.literal(true, {
      message: t("errors.validation.termsConsentRequired"),
    }),
  });

  return { contactFormSchema, quoteFormSchema, supportFormSchema, checkoutFormSchema };
}

/** English-default schemas — used by callers that have not resolved a request locale yet. */
const defaultSchemas = createFormSchemas(createT(en));

export const contactFormSchema = defaultSchemas.contactFormSchema;
export const quoteFormSchema = defaultSchemas.quoteFormSchema;
export const supportFormSchema = defaultSchemas.supportFormSchema;
export const checkoutFormSchema = defaultSchemas.checkoutFormSchema;

export type ContactFormInput = z.infer<typeof contactFormSchema>;
export type QuoteFormInput = z.infer<typeof quoteFormSchema>;
export type SupportFormInput = z.infer<typeof supportFormSchema>;
export type CheckoutFormInput = z.infer<typeof checkoutFormSchema>;
export type BudgetRange = z.infer<typeof budgetRangeSchema>;
