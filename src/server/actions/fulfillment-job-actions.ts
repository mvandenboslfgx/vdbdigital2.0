"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth/require-admin";
import { requirePermission } from "@/server/auth/require-permission";
import {
  getFulfillmentJob,
  updateFulfillmentJobStatus,
} from "@/server/services/fulfillment/jobs";
import type { FulfillmentJobStatus } from "@/server/services/fulfillment/engine";
import { processDeliveryReleased } from "@/server/services/fulfillment/engine";

export async function retryFulfillmentJobAction(formData: FormData) {
  const ctx = await requireAdmin();
  await requirePermission(ctx, "jobs.review");
  const id = String(formData.get("jobId") ?? "");
  if (!id) return;

  const job = await getFulfillmentJob(id);
  if (!job) return;

  await updateFulfillmentJobStatus({ id, status: "queued", error: null });
  await processDeliveryReleased({
    orderId: job.orderId,
    paymentId: job.paymentId ?? undefined,
    productSlugs: job.productSlug ? [job.productSlug] : undefined,
    alreadyProcessed: false,
    forceRetry: true,
  });
  revalidatePath("/admin/jobs");
  revalidatePath("/admin/website-production");
  revalidatePath("/admin/automation");
}

export async function resolveFulfillmentJobAction(formData: FormData) {
  const ctx = await requireAdmin();
  await requirePermission(ctx, "jobs.review");
  const id = String(formData.get("jobId") ?? "");
  const status = String(formData.get("status") ?? "") as FulfillmentJobStatus;
  if (!id) return;
  if (status !== "completed" && status !== "pending_manual_review" && status !== "failed") {
    return;
  }
  await updateFulfillmentJobStatus({ id, status });
  revalidatePath("/admin/jobs");
}