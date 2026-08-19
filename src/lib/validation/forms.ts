import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .min(5, "Email address is required")
  .max(254, "Email address is too long")
  .email("Please enter a valid email address");

const nameSchema = z
  .string()
  .trim()
  .min(2, "Name is required")
  .max(100, "Name is too long");

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

export const budgetRangeSchema = z.enum([
  "under_1000",
  "1000_2500",
  "2500_5000",
  "5000_10000",
  "10000_plus",
  "not_sure",
]);

export const quoteFormSchema = z
  .object({
    customerType: z.enum(["business", "consumer"], {
      message: "Please select whether you are a business or consumer",
    }),
    name: nameSchema,
    email: emailSchema,
    phone: z.string().trim().max(30).optional(),
    preferredContactMethod: z
      .enum(["email", "phone", "whatsapp"])
      .optional(),
    company: z.string().trim().max(200).optional(),
    companyWebsite: optionalTrimmed,
    vatNumber: z.string().trim().max(30).optional(),
    country: z.string().trim().max(100).optional(),
    industry: z.string().trim().max(200).optional(),
    projectType: z
      .string()
      .trim()
      .min(2, "Project type is required")
      .max(200),
    packageSlug: z.string().trim().max(100).optional(),
    productSlug: z.string().trim().max(100).optional(),
    requestIntent: z.string().trim().max(100).optional(),
    softwareSlug: z.string().trim().max(120).optional(),
    currentWebsite: optionalTrimmed,
    goals: z
      .string()
      .trim()
      .min(20, "Please describe your goals in at least 20 characters")
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
      message: "Please select a meeting preference",
    }),
    meetingLocation: z.string().trim().max(300).optional(),
    privacyConsent: z.literal(true, {
      message: "You must acknowledge the privacy policy",
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
          message: "Company name is required for business requests",
          path: ["company"],
        });
      }
    }
    if (data.meetingPreference === "in_person") {
      if (!data.meetingLocation || data.meetingLocation.trim().length < 2) {
        ctx.addIssue({
          code: "custom",
          message: "Please provide a location for an in-person meeting",
          path: ["meetingLocation"],
        });
      }
    }
  });

export const contactFormSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  company: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(30).optional(),
  subject: z
    .string()
    .trim()
    .min(3, "Subject is required")
    .max(200, "Subject is too long"),
  message: z
    .string()
    .trim()
    .min(10, "Message must be at least 10 characters")
    .max(5000, "Message is too long"),
  website: z.string().max(0).optional(), // honeypot
});

export const supportFormSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  orderReference: z.string().trim().max(100).optional(),
  priority: supportPrioritySchema,
  subject: z
    .string()
    .trim()
    .min(3, "Subject is required")
    .max(200),
  message: z
    .string()
    .trim()
    .min(10, "Please describe your issue in at least 10 characters")
    .max(5000),
  website: z.string().max(0).optional(), // honeypot
});

export const checkoutFormSchema = z.object({
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
    message: "You must agree to the terms and conditions",
  }),
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;
export type QuoteFormInput = z.infer<typeof quoteFormSchema>;
export type SupportFormInput = z.infer<typeof supportFormSchema>;
export type CheckoutFormInput = z.infer<typeof checkoutFormSchema>;
export type BudgetRange = z.infer<typeof budgetRangeSchema>;
