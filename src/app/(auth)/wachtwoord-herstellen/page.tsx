import type { Metadata } from "next";
import { PasswordUpdateForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = {
  title: "Wachtwoord herstellen",
  robots: { index: false },
};

export default function WachtwoordHerstellenPage() {
  return (
    <>
      <h1 className="text-h2 mb-2 text-center">Nieuw wachtwoord</h1>
      <p className="text-muted text-small mb-6 text-center">
        Kies een nieuw wachtwoord voor je account.
      </p>
      <PasswordUpdateForm />
    </>
  );
}
