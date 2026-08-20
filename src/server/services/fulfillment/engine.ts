import "server-only";
import { writeAuditLog } from "@/lib/security/audit-log";

/**
 * Central fulfillment types. Concrete provider adapters land here;
 * until then jobs are audited and marked pending_manual_review.
 */
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

function inferFulfillmentType(productSlug: string | null | undefined): FulfillmentType {
  const slug = (productSlug ?? "").toLowerCase();
  if (slug.includes("custom") || slug.includes("quote")) return "QUOTE_REQUIRED";
  if (slug.includes("website") || slug.includes("webshop") || slug.includes("onepage")) {
    return "WEBSITE_PROJECT";
  }
  if (slug.includes("license") || slug.includes("software")) return "DIGITAL_LICENSE";
  if (slug.includes("care") || slug.includes("subscription") || slug.includes("jaar")) {
    return "SUBSCRIPTION";
  }
  return "MANUAL_REVIEW";
}

/**
 * Idempotent entry after payment.paid → delivery_released.
 * Does not call external providers yet — fail-closed to manual review + audit.
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
    args.productSlugs && args.productSlugs.length > 0
      ? args.productSlugs
      : [null];

  const jobs: FulfillmentJob[] = slugs.map((slug) => ({
    orderId: args.orderId,
    paymentId: args.paymentId,
    fulfillmentType: inferFulfillmentType(slug),
    status: "pending_manual_review" as const,
    provider: "internal",
  }));

  await writeAuditLog({
    action: "fulfillment.delivery_released",
    resourceType: "order",
    resourceId: args.orderId,
    metadata: {
      paymentId: args.paymentId ?? null,
      jobs: jobs.map((j) => ({
        type: j.fulfillmentType,
        status: j.status,
        provider: j.provider,
      })),
      note: "Provider adapters not yet provisioned — manual review required",
    },
  });

  return jobs;
}

/** Test-only reset for in-memory idempotency set. */
export function __resetFulfillmentIdempotencyForTests(): void {
  processedReleaseKeys.clear();
}
