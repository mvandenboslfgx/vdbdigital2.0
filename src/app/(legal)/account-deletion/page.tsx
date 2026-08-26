import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageContent } from "@/components/sections/legal-page";
import { AccountDeletionForm } from "@/components/forms/account-deletion-form";
import { siteConfig } from "@/config/site";
import { paths } from "@/i18n/config";

export const metadata: Metadata = {
  title: "Delete account",
  description:
    "Request deletion of your VDB Digital account and associated personal data.",
  alternates: { canonical: "/account-deletion" },
};

export default function AccountDeletionPage() {
  return (
    <LegalPageContent title="Account deletion">
      <p>
        You can request deletion of your {siteConfig.legalName} account and associated
        personal data from this page or from the VDB Digital mobile app (Meer → Account
        verwijderen). This page works without installing the app.
      </p>

      <h2 className="text-h3 text-light-foreground">What is deleted</h2>
      <ul className="list-disc pl-6 space-y-2">
        <li>Your login account and profile information</li>
        <li>Personal messages and notifications tied to your user</li>
        <li>Membership links to organizations where you are the only active member</li>
        <li>Sessions and access tokens</li>
      </ul>

      <h2 className="text-h3 text-light-foreground">What may be retained</h2>
      <p>
        We may retain invoices, payment records, quotes, and other data required for legal,
        tax, accounting, fraud prevention, or dispute resolution. Such records are kept
        only to the extent necessary and are no longer actively linked to a live account
        after deletion completes.
      </p>

      <h2 className="text-h3 text-light-foreground">Active projects and invoices</h2>
      <p>
        Open projects or unpaid invoices do not block the request, but financial and delivery
        records may remain as described above. Shared organizations with other active members
        are preserved; only your personal access is removed.
      </p>

      <h2 className="text-h3 text-light-foreground">Processing time</h2>
      <p>
        After you verify ownership by email, your deletion request is recorded and reviewed
        according to our retention policy. Some steps may complete promptly; legally retained
        records are not erased. You will receive a confirmation when the request is verified.
      </p>

      <h2 className="text-h3 text-light-foreground">Request deletion</h2>
      <AccountDeletionForm />

      <h2 className="text-h3 text-light-foreground">Support</h2>
      <p>
        Questions? Contact{" "}
        <a href={`mailto:${siteConfig.legal.privacyContact}`}>
          {siteConfig.legal.privacyContact}
        </a>{" "}
        or visit{" "}
        <Link href={paths.support} className="underline">
          support
        </Link>
        .
      </p>

      <p className="text-small text-light-muted">
        See also our{" "}
        <Link href={paths.privacy} className="underline">
          privacy policy
        </Link>
        .
      </p>
    </LegalPageContent>
  );
}
