import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Account activeren",
  robots: { index: false },
};

export default function AccountActiverenPage() {
  return (
    <>
      <h1 className="text-h2 mb-2 text-center">Account activeren</h1>
      <p className="text-muted text-small mb-6 text-center">
        Activeer je account via de uitnodigingslink in je e-mail, of bevestig eerst
        je e-mailadres.
      </p>
      <ul className="text-small space-y-2 text-muted">
        <li>
          <Link href="/uitnodiging/accepteren" className="text-primary hover:underline">
            Uitnodiging accepteren
          </Link>
        </li>
        <li>
          <Link href="/e-mail-bevestigen" className="text-primary hover:underline">
            E-mail bevestigen
          </Link>
        </li>
        <li>
          <Link href="/inloggen" className="text-primary hover:underline">
            Naar inloggen
          </Link>
        </li>
      </ul>
    </>
  );
}
