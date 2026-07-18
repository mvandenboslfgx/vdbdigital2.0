import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Beveiliging",
  robots: { index: false },
};

export default function PortalSecurityPage() {
  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-h1">Beveiliging</h1>
      <Card className="space-y-4">
        <div>
          <h2 className="font-medium mb-1">Wachtwoord</h2>
          <p className="text-small text-muted mb-3">
            Wijzig je wachtwoord via de beveiligde resetflow.
          </p>
          <Link
            href="/wachtwoord-vergeten"
            className="text-small text-primary hover:underline"
          >
            Wachtwoord resetten
          </Link>
        </div>
        <div className="border-t border-border pt-4">
          <h2 className="font-medium mb-1">MFA (optioneel)</h2>
          <p className="text-small text-muted">
            Extra authenticatie is optioneel voor klanten. Voor beheerders is
            MFA verplicht (AAL2).
          </p>
        </div>
        <div className="border-t border-border pt-4">
          <h2 className="font-medium mb-1">Sessies</h2>
          <p className="text-small text-muted mb-3">
            Log uit op dit apparaat om de sessie te beëindigen.
          </p>
          <Link href="/uitloggen" className="text-small text-primary hover:underline">
            Uitloggen
          </Link>
        </div>
      </Card>
    </div>
  );
}
