import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageContent } from "@/components/sections/legal-page";
import { confirmAccountDeletionToken } from "@/server/actions/account-deletion-actions";
import { paths } from "@/i18n/config";

export const metadata: Metadata = {
  title: "Confirm account deletion",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function AccountDeletionConfirmPage({ searchParams }: Props) {
  const { token } = await searchParams;
  let title = "Confirm account deletion";
  let body: ReactNode;

  if (!token) {
    body = (
      <p className="text-danger">Missing verification token. Use the link from your email.</p>
    );
  } else {
    const result = await confirmAccountDeletionToken(token);
    if (result.ok) {
      title = "Deletion request verified";
      body = (
        <>
          <p className="text-success">
            Your account deletion request for VDB Digital has been verified and recorded. Our team
            will process it according to our retention policy. This confirmation does not
            immediately erase all data.
          </p>
          <p>
            Personal profile data is reviewed for removal. Financial and legal records may be
            retained where required by law. You will not need to take further action unless we
            contact you.
          </p>
          {result.requestId ? (
            <p className="text-sm text-muted mt-4">Reference: {result.requestId}</p>
          ) : null}
        </>
      );
    } else if (result.error === "TOKEN_EXPIRED") {
      body = <p className="text-danger">This verification link has expired. Submit a new request.</p>;
    } else if (result.error === "TOKEN_ALREADY_USED") {
      body = <p className="text-danger">This verification link was already used.</p>;
    } else {
      body = <p className="text-danger">This verification link is invalid.</p>;
    }
  }

  return (
    <LegalPageContent title={title}>
      {body}
      <p className="mt-6">
        <Link href={paths.accountDeletion} className="underline">
          Back to account deletion
        </Link>
        {" · "}
        <Link href={paths.privacy} className="underline">
          Privacy policy
        </Link>
      </p>
    </LegalPageContent>
  );
}
