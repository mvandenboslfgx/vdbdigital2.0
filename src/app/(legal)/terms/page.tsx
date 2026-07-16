import type { Metadata } from "next";
import { LegalPageContent } from "@/components/sections/legal-page";
import { CompanyLegalBlock } from "@/components/sections/company-legal-block";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Terms and conditions",
  description: "Terms and conditions of VDB Digital for services and digital products.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPageContent title="Terms and conditions">
      <p>
        These terms and conditions apply to all services and products offered by{" "}
        {siteConfig.legalName} through the website, shop or custom agreements.
      </p>

      <h2 className="text-h3 text-light-foreground">Company details</h2>
      <CompanyLegalBlock />

      <h2 className="text-h3 text-light-foreground">Offer and agreement</h2>
      <p>
        Quotes and shop offers are non-binding until acceptance and payment (shop)
        or until written confirmation of the agreement (custom work). Obvious errors
        in price or description do not bind us.
      </p>

      <h2 className="text-h3 text-light-foreground">Orders and payment</h2>
      <p>
        Shop orders are processed after successful payment via Mollie. Prices are
        shown inclusive or exclusive of VAT as indicated on the product page.
        Subscriptions are invoiced periodically according to the selected billing
        frequency.
      </p>

      <h2 className="text-h3 text-light-foreground">Delivery</h2>
      <p>
        Delivery times are indicative and confirmed per product or project. Digital
        services begin after payment or according to the agreed schedule.
      </p>

      <h2 className="text-h3 text-light-foreground">Intellectual property</h2>
      <p>
        Design, code and documentation remain the property of VDB Digital or
        licensors, unless otherwise agreed in writing. Clients receive a right of
        use for the intended purpose.
      </p>

      <h2 className="text-h3 text-light-foreground">Liability</h2>
      <p>
        Our liability is limited to the amount paid for the relevant assignment or
        order, to the extent permitted by mandatory law. Indirect damage is
        excluded where legally permitted.
      </p>

      <h2 className="text-h3 text-light-foreground">Applicable law</h2>
      <p>
        These terms are governed by Dutch law. Disputes are submitted to the
        competent court in the Netherlands, without prejudice to mandatory consumer
        protection.
      </p>

      <p className="text-small text-light-muted">
        Last updated: {siteConfig.legal.lastUpdated}
      </p>
    </LegalPageContent>
  );
}
