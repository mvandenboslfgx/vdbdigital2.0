import type { Metadata } from "next";
import { LegalPageContent } from "@/components/sections/legal-page";
import { CompanyLegalBlock } from "@/components/sections/company-legal-block";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "Privacy policy of VDB Digital — how we process personal data.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPageContent title="Privacy policy">
      <p>
        {siteConfig.legalName} values the protection of personal data. In this
        privacy policy we explain what data we process, why, and what rights you
        have.
      </p>

      <h2 className="text-h3 text-light-foreground">Data controller</h2>
      <CompanyLegalBlock />
      {siteConfig.legal.dpo ? (
        <p>Data protection officer: {siteConfig.legal.dpo}</p>
      ) : null}

      <h2 className="text-h3 text-light-foreground">What data we process</h2>
      <p>
        We process data you provide through forms, orders or communication, such
        as name, email address, company name, phone number, message content and
        (for orders) billing details.
      </p>

      <h2 className="text-h3 text-light-foreground">Purposes and legal bases</h2>
      <ul className="list-disc pl-6 space-y-2">
        <li>
          Responding to contact, quote and support requests (legitimate interest /
          performance of contract)
        </li>
        <li>Processing orders and payments (performance of contract)</li>
        <li>
          Sending transactional emails about orders (performance of contract)
        </li>
        <li>Security, fraud prevention and audit logging (legitimate interest)</li>
        <li>Optional analytics or marketing cookies only with consent</li>
      </ul>

      <h2 className="text-h3 text-light-foreground">Retention period</h2>
      <p>
        Data is not kept longer than necessary for the purpose for which it was
        collected, unless a legal retention obligation applies (for example tax
        records).
      </p>

      <h2 className="text-h3 text-light-foreground">Sharing with third parties</h2>
      <p>
        We only share data with processors necessary for our services (such as
        hosting, email and payment providers), under appropriate processor
        agreements. We do not sell personal data.
      </p>

      <h2 className="text-h3 text-light-foreground">Your rights</h2>
      <p>
        You have the right to access, rectification, erasure, restriction of
        processing, data portability and objection. Contact us at{" "}
        {siteConfig.legal.privacyContact}. You may also lodge a complaint with the
        Dutch Data Protection Authority (Autoriteit Persoonsgegevens).
      </p>

      <p className="text-small text-light-muted">
        Last updated: {siteConfig.legal.lastUpdated}
      </p>
    </LegalPageContent>
  );
}
