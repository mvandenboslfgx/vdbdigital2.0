import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "@/components/auth/auth-forms";
import { GoogleLoginForm } from "@/components/auth/google-login-form";

export const metadata: Metadata = {
  title: "Account aanmaken",
  robots: { index: false },
};

export default function AccountAanmakenPage() {
  return (
    <>
      <h1 className="text-h2 mb-2 text-center">Account aanmaken</h1>
      <p className="text-muted text-small mb-6 text-center">
        Maak direct een VDB Digital-account aan. Je krijgt na je eerste login
        automatisch een beveiligde klantomgeving.
      </p>

      <GoogleLoginForm label="Account aanmaken met Google" />

      <div className="my-5 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted">of met e-mail</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <SignupForm />

      <p className="text-small text-muted text-center mt-5">
        Al een account?{" "}
        <Link href="/inloggen" className="text-primary hover:underline">
          Inloggen
        </Link>
      </p>
    </>
  );
}
