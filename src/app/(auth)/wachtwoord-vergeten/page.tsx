import type { Metadata } from "next";
import Link from "next/link";
import { PasswordResetRequestForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = {
  title: "Wachtwoord vergeten",
  robots: { index: false },
};

export default function WachtwoordVergetenPage() {
  return (
    <>
      <h1 className="text-h2 mb-2 text-center">Wachtwoord vergeten</h1>
      <p className="text-muted text-small mb-6 text-center">
        We sturen een resetlink als het e-mailadres bij ons bekend is.
      </p>
      <PasswordResetRequestForm />
      <p className="text-small text-muted text-center mt-4">
        <Link href="/inloggen" className="text-primary hover:underline">
          Terug naar inloggen
        </Link>
      </p>
    </>
  );
}
