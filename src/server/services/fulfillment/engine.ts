import "server-only";
import { writeAuditLog } from "@/lib/security/audit-log";
import { getFulfillmentProvider } from "@/server/services/fulfillment/providers";
import { persistFulfillmentJob } from "@/server/services/fulfillment/jobs";

export type FulfillmentType =
  | "DIGITAL_LICENSE"
  | "SUBSCRIPTION"
  | "WEBSITE_PROJECT"
  | "SERVICE"
  | "DOWNLOAD"
  | "MANUAL_REVIEW"
  | "QUOTE_REQUIRED";

export type FulfillmentJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "pending_manual_review";

export interface FulfillmentJob {
  orderId: string;
  paymentId?: string;
  fulfillmentType: FulfillmentType;
  status: FulfillmentJobStatus;
  provider?: string;
  error?: string;
}

const processedReleaseKeys = new Set<string>();

export function inferFulfillmentType(
  productSlug: string | null | undefined,
  explicit?: FulfillmentType | null,
): FulfillmentType {
  if (explicit) return explicit;
  const slug = (productSlug ?? "").toLowerCase();
  if (slug.includes("custom") || slug.includes("quote")) return "QUOTE_REQUIRED";
  if (slug.includes("website") || slug.includes("webshop") || slug.includes("onepage")) {
    return "WEBSITE_PROJECT";
  }
  if (slug.includes("license") || slug.includes("software")) return "DIGITAL_LICENSE";
  if (slug.includes("download")) return "DOWNLOAD";
  if (slug.includes("service") || slug.includes("support")) return "SERVICE";
  if (slug.includes("care") || slug.includes("subscription") || slug.includes("jaar")) {
    return "SUBSCRIPTION";
  }
  return "MANUAL_REVIEW";
}

/**
 * Idempotent entry after payment.paid → delivery_released.
 * Provider adapters run here; unknown/unready providers fail closed to manual review.
 */
export async function processDeliveryReleased(args: {
  orderId: string;
  paymentId?: string;
  productSlugs?: string[];
  alreadyProcessed?: boolean;
}): Promise<FulfillmentJob[]> {
  if (args.alreadyProcessed) return [];

  const key = `delivery_released:${args.orderId}:${args.paymentId ?? "none"}`;
  if (processedReleaseKeys.has(key)) return [];
  processedReleaseKeys.add(key);

  const slugs =
    args.productSlugs && args.productSlugs.length > 0 ? args.productSlugs : [null];

  const jobs: FulfillmentJob[] = [];
  for (const slug of slugs) {
    const fulfillmentType = inferFulfillmentType(slug);
    const provider = getFulfillmentProvider("internal");
    const provision = await provider.provision({
      orderId: args.orderId,
      productSlug: slug ?? "unknown",
      providerProductRef: slug ?? "unknown",
      quantity: 1,
    });

    const status: FulfillmentJobStatus = provision.requiresManualReview
      ? "pending_manual_review"
      : provision.ok
        ? "completed"
        : "failed";

    const job: FulfillmentJob = {
      orderId: args.orderId,
      paymentId: args.paymentId,
      fulfillmentType,
      status,
      provider: provider.id,
      error: provision.error,
    };
    jobs.push(job);

    await persistFulfillmentJob({
      orderId: args.orderId,
      paymentId: args.paymentId,
      productSlug: slug,
      fulfillmentType,
      status,
      provider: provider.id,
      error: provision.error,
      metadata: {
        externalRef: provision.externalRef ?? null,
        websiteAutomation:
          fulfillmentType === "WEBSITE_PROJECT" ? "queued_intake_project_link" : null,
      },
    });
  }

  await writeAuditLog({
    action: "fulfillment.delivery_released",
    resourceType: "order",
    resourceId: args.orderId,
    metadata: {
      paymentId: args.paymentId ?? null,
      jobs: jobs.map((job) => ({
        type: job.fulfillmentType,
        status: job.status,
        provider: job.provider,
      })),
    },
  });

  return jobs;
}

export function __resetFulfillmentIdempotencyForTests(): void {
  processedReleaseKeys.clear();
}
