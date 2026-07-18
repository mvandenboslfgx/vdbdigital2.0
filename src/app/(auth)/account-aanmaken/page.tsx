import type { Metadata } from "next";
import Link from "next/link";
import { AccountRequestForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = {
  title: "Account aanvragen",
  robots: { index: false },
};

export default function AccountAanmakenPage() {
  return (
    <>
      <h1 className="text-h2 mb-2 text-center">Account aanvragen</h1>
      <p className="text-muted text-small mb-6 text-center">
        Open registratie geeft geen toegang tot klantdata. Na beoordeling nodigen
        we je uit.
      </p>
      <AccountRequestForm />
      <p className="text-small text-muted text-center mt-4">
        Al een account?{" "}
        <Link href="/inloggen" className="text-primary hover:underline">
          Inloggen
        </Link>
      </p>
    </>
  );
}
