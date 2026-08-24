import "server-only";
import { writeAuditLog } from "@/lib/security/audit-log";
import { createServiceRoleClient } from "@/lib/database/server";
import { getFulfillmentProvider } from "@/server/services/fulfillment/providers";
import { persistFulfillmentJob } from "@/server/services/fulfillment/jobs";
import { createProjectFromOrder } from "@/server/services/website-production/create-project-from-order";
import { emitPlatformEvent } from "@/server/services/platform-events";
import {
  asFulfillmentType,
  inferFulfillmentType,
  type FulfillmentType,
} from "@/lib/commerce/fulfillment-type";

export type { FulfillmentType };
export { inferFulfillmentType };

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

type FulfillmentLine = {
  slug: string | null;
  explicit: FulfillmentType | null;
};

async function loadFulfillmentLines(
  orderId: string,
  productSlugs?: string[],
): Promise<FulfillmentLine[]> {
  if (productSlugs && productSlugs.length > 0) {
    return productSlugs.map((slug) => ({ slug, explicit: null }));
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return [{ slug: null, explicit: null }];

  const { data: items } = await supabase
    .from("order_items")
    .select("product_slug, product_id")
    .eq("order_id", orderId);

  if (!items?.length) return [{ slug: null, explicit: null }];

  const productIds = items
    .map((row) => row.product_id as string | null)
    .filter((id): id is string => Boolean(id));

  const fulfillmentByProduct = new Map<string, FulfillmentType>();
  if (productIds.length) {
    const { data: products } = await supabase
      .from("products")
      .select("id, fulfillment_type")
      .in("id", productIds);
    for (const product of products ?? []) {
      const typed = asFulfillmentType(product.fulfillment_type as string | null);
      if (typed) fulfillmentByProduct.set(product.id as string, typed);
    }
  }

  return items.map((row) => ({
    slug: (row.product_slug as string | null) ?? null,
    explicit: row.product_id
      ? (fulfillmentByProduct.get(row.product_id as string) ?? null)
      : null,
  }));
}

/**
 * Idempotent entry after payment.paid → delivery_released.
 * Website packages create a project/intake/job. Unknown providers fail closed.
 */
export async function processDeliveryReleased(args: {
  orderId: string;
  paymentId?: string;
  productSlugs?: string[];
  alreadyProcessed?: boolean;
  forceRetry?: boolean;
}): Promise<FulfillmentJob[]> {
  if (args.alreadyProcessed) return [];

  const key = `delivery_released:${args.orderId}:${args.paymentId ?? "none"}`;
  if (!args.forceRetry && processedReleaseKeys.has(key)) return [];
  processedReleaseKeys.add(key);

  const lines = await loadFulfillmentLines(args.orderId, args.productSlugs);
  const jobs: FulfillmentJob[] = [];

  await emitPlatformEvent({
    eventType: "fulfillment.started",
    entityType: "orders",
    entityId: args.orderId,
    idempotencyKey: `fulfillment.started:${args.orderId}:${args.paymentId ?? "none"}`,
    payload: { paymentId: args.paymentId ?? null },
  });

  for (const line of lines) {
    const fulfillmentType = inferFulfillmentType(line.slug, line.explicit);

    if (fulfillmentType === "WEBSITE_PROJECT") {
      const created = await createProjectFromOrder({
        orderId: args.orderId,
        paymentId: args.paymentId,
        productSlug: line.slug,
      });

      const status: FulfillmentJobStatus = created.ok
        ? "completed"
        : created.error === "custom_requires_quote" || created.error === "not_a_website_package"
          ? "pending_manual_review"
          : "failed";

      const job: FulfillmentJob = {
        orderId: args.orderId,
        paymentId: args.paymentId,
        fulfillmentType,
        status,
        provider: "internal",
        error: created.ok ? undefined : created.error,
      };
      jobs.push(job);

      await persistFulfillmentJob({
        orderId: args.orderId,
        paymentId: args.paymentId,
        productSlug: line.slug,
        fulfillmentType,
        status,
        provider: "internal",
        error: created.error,
        metadata: {
          projectId: created.projectId,
          organizationId: created.organizationId,
          package: created.package,
          duplicate: created.duplicate,
          websiteAutomation: created.ok ? "project_created" : "failed",
        },
      });
      continue;
    }

    const provider = getFulfillmentProvider("internal");
    const provision = await provider.provision({
      orderId: args.orderId,
      productSlug: line.slug ?? "unknown",
      providerProductRef: line.slug ?? "unknown",
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
      productSlug: line.slug,
      fulfillmentType,
      status,
      provider: provider.id,
      error: provision.error,
      metadata: {
        externalRef: provision.externalRef ?? null,
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

  const allOk = jobs.every((job) => job.status === "completed");
  await emitPlatformEvent({
    eventType: allOk ? "fulfillment.completed" : "fulfillment.started",
    entityType: "orders",
    entityId: args.orderId,
    idempotencyKey: `fulfillment.completed:${args.orderId}:${args.paymentId ?? "none"}`,
    payload: {
      paymentId: args.paymentId ?? null,
      statuses: jobs.map((job) => job.status),
    },
  });

  return jobs;
}

export function __resetFulfillmentIdempotencyForTests(): void {
  processedReleaseKeys.clear();
}
