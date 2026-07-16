import type { Metadata } from "next";
import { LegalPageContent } from "@/components/sections/legal-page";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Refund policy",
  description:
    "Refund and cancellation policy of VDB Digital for digital products and projects.",
  alternates: { canonical: "/refund-policy" },
};

export default function RefundPage() {
  return (
    <LegalPageContent title="Refund policy">
      <p>
        Because we primarily deliver digital services and custom work, refunds depend
        on the product type and project progress.
      </p>

      <h2 className="text-h3 text-light-foreground">Digital products</h2>
      <p>
        One-off digital products (templates, installations) cannot be returned after
        delivery, unless there is a technical defect we cannot resolve within a
        reasonable timeframe.
      </p>

      <h2 className="text-h3 text-light-foreground">Custom projects</h2>
      <p>
        For custom work, the agreed payment schedule applies. Work already delivered
        or performed is not refunded. Deposits for work not yet started may be
        refunded by mutual agreement.
      </p>

      <h2 className="text-h3 text-light-foreground">Subscriptions</h2>
      <p>
        Monthly or annual subscriptions can be cancelled at the end of the current
        period. Refunds for a period already started are not possible, unless we are
        structurally unable to deliver the service.
      </p>

      <h2 className="text-h3 text-light-foreground">Submitting a request</h2>
      <p>
        Send a refund request to{" "}
        <a href={`mailto:${siteConfig.supportEmail}`} className="text-primary underline">
          {siteConfig.supportEmail}
        </a>{" "}
        with your order reference, purchase date and explanation. We respond as
        quickly as possible on business days.
      </p>

      <p className="text-small text-light-muted">
        Last updated: {siteConfig.legal.lastUpdated}
      </p>
    </LegalPageContent>
  );
}
