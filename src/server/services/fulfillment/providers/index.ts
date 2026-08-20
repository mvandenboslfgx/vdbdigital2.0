import "server-only";
import type { FulfillmentType } from "@/server/services/fulfillment/engine";

/**
 * Provider adapter contract. Secrets stay server-side only.
 * No live provider calls until OWNER-approved credentials + product refs exist.
 */
export interface ProviderProvisionRequest {
  orderId: string;
  productSlug: string;
  providerProductRef: string;
  quantity: number;
  customerAccountId?: string;
}

export interface ProviderProvisionResult {
  ok: boolean;
  externalRef?: string;
  requiresManualReview?: boolean;
  error?: string;
}

export interface FulfillmentProviderAdapter {
  id: string;
  supports: FulfillmentType[];
  provision(req: ProviderProvisionRequest): Promise<ProviderProvisionResult>;
}

export const internalProviderAdapter: FulfillmentProviderAdapter = {
  id: "internal",
  supports: [
    "WEBSITE_PROJECT",
    "SERVICE",
    "MANUAL_REVIEW",
    "QUOTE_REQUIRED",
    "DOWNLOAD",
  ],
  async provision() {
    return {
      ok: false,
      requiresManualReview: true,
      error: "Internal provisioning not automated yet",
    };
  },
};

/** Registry — add providerA/providerB only with server secrets + OWNER gate. */
export const fulfillmentProviders: Record<string, FulfillmentProviderAdapter> = {
  internal: internalProviderAdapter,
};

export function getFulfillmentProvider(
  providerId: string | null | undefined,
): FulfillmentProviderAdapter {
  if (providerId && fulfillmentProviders[providerId]) {
    return fulfillmentProviders[providerId]!;
  }
  return internalProviderAdapter;
}
