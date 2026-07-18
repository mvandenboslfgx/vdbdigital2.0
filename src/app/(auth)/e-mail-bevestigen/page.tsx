import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "E-mail bevestigen",
  robots: { index: false },
};

export default function EmailBevestigenPage() {
  return (
    <>
      <h1 className="text-h2 mb-2 text-center">E-mail bevestigen</h1>
      <p className="text-muted text-small mb-6 text-center">
        Open de bevestigingslink in je e-mail. Daarna kun je inloggen. Zonder
        bevestiging krijg je geen toegang tot klantdata.
      </p>
      <p className="text-small text-center">
        <Link href="/inloggen" className="text-primary hover:underline">
          Naar inloggen
        </Link>
      </p>
    </>
  );
}
