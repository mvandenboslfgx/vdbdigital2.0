import { z } from "zod";

export const PROJECT_TYPES = [
  "WEBSITE",
  "WEBSHOP",
  "SOFTWARE",
  "OPTIMISATION",
  "MAINTENANCE",
  "BRANDING",
  "INTEGRATION",
  "SUPPORT",
  "OTHER",
] as const;

export const PROJECT_STATUSES = [
  "DRAFT",
  "PLANNED",
  "IN_PROGRESS",
  "WAITING_FOR_CUSTOMER",
  "REVIEW",
  "COMPLETED",
  "ON_HOLD",
  "CANCELED",
  "ARCHIVED",
] as const;

export const PROJECT_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

export const createProjectSchema = z.object({
  organizationId: z.string().uuid("Selecteer een geldige organisatie."),
  name: z.string().trim().min(2, "Naam is te kort.").max(200),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  projectType: z.enum(PROJECT_TYPES),
  priority: z.enum(PROJECT_PRIORITIES).default("NORMAL"),
  status: z.enum(["DRAFT", "PLANNED"]).default("DRAFT"),
  visibility: z.enum(["INTERNAL", "CUSTOMER_VISIBLE"]).default("INTERNAL"),
  startDate: z.string().optional().or(z.literal("")),
  plannedDeliveryDate: z.string().optional().or(z.literal("")),
  projectManagerId: z.string().uuid().optional().or(z.literal("")),
});

export const updateProjectSchema = z.object({
  projectId: z.string().uuid(),
  expectedVersion: z.coerce.number().int().positive(),
  name: z.string().trim().min(2).max(200),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  projectType: z.enum(PROJECT_TYPES),
  status: z.enum(PROJECT_STATUSES),
  priority: z.enum(PROJECT_PRIORITIES),
  visibility: z.enum(["INTERNAL", "CUSTOMER_VISIBLE"]),
  progressPercent: z.coerce.number().int().min(0).max(100),
  startDate: z.string().optional().or(z.literal("")),
  plannedDeliveryDate: z.string().optional().or(z.literal("")),
  actualDeliveryDate: z.string().optional().or(z.literal("")),
  projectManagerId: z.string().uuid().optional().or(z.literal("")),
  completeOverride: z.boolean().optional(),
});

export const milestoneSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
  customerVisible: z.boolean().default(false),
  requiresCustomerAction: z.boolean().default(false),
  status: z
    .enum([
      "NOT_STARTED",
      "IN_PROGRESS",
      "WAITING_FOR_CUSTOMER",
      "COMPLETED",
      "SKIPPED",
    ])
    .default("NOT_STARTED"),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const updateMilestoneSchema = milestoneSchema.extend({
  milestoneId: z.string().uuid(),
  expectedVersion: z.coerce.number().int().positive(),
});

export const actionSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  assignedToType: z.enum(["INTERNAL", "CUSTOMER", "UNASSIGNED"]),
  assignedUserId: z.string().uuid().optional().or(z.literal("")),
  priority: z.enum(PROJECT_PRIORITIES).default("NORMAL"),
  dueDate: z.string().optional().or(z.literal("")),
  customerVisible: z.boolean().default(false),
});

export const completeActionSchema = z.object({
  actionId: z.string().uuid(),
  expectedVersion: z.coerce.number().int().positive(),
  note: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const deliverableSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  requiresApproval: z.boolean().default(false),
});

export const shareDeliverableSchema = z.object({
  deliverableId: z.string().uuid(),
  expectedVersion: z.coerce.number().int().positive(),
});

export const approveDeliverableSchema = z.object({
  deliverableId: z.string().uuid(),
  expectedVersion: z.coerce.number().int().positive(),
  confirm: z.literal("yes"),
});

export const rejectDeliverableSchema = z.object({
  deliverableId: z.string().uuid(),
  expectedVersion: z.coerce.number().int().positive(),
  reason: z.string().trim().min(3, "Geef een reden op.").max(2000),
});

export const feedbackSchema = z.object({
  projectId: z.string().uuid(),
  deliverableId: z.string().uuid().optional().or(z.literal("")),
  body: z.string().trim().min(2, "Feedback is te kort.").max(4000),
});

/** Strip tags / scripts — feedback is plain text only. */
export function sanitizeFeedbackBody(input: string): string {
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .trim();
}

export function slugifyProjectName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "project";
}
