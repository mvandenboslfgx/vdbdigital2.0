import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/container";
import { PortalMfaSetupForm } from "@/components/portal/mfa-setup-form";
import { getMfaStatus } from "@/server/auth/mfa-status";

export const metadata: Metadata = {
  title: "Beveiliging",
  robots: { index: false, follow: false },
};

export default async function PortalSecurityPage() {
  const mfa = await getMfaStatus();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-h1">Beveiliging</h1>
        <p className="text-small text-muted mt-1">
          Beheer je wachtwoord, tweestapsverificatie en actieve sessie.
        </p>
      </div>

      <Card className="space-y-5">
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

        <div className="border-t border-border pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="font-medium">Tweestapsverificatie (MFA)</h2>
              <p className="text-small text-muted mt-1">
                Optioneel voor klanten en sterk aanbevolen voor extra accountbeveiliging.
              </p>
            </div>
            <span
              className={
                mfa?.hasVerifiedFactor
                  ? "rounded-full bg-success/10 px-3 py-1 text-xs text-success"
                  : "rounded-full bg-surface-elevated px-3 py-1 text-xs text-muted"
              }
            >
              {mfa?.hasVerifiedFactor ? "Actief" : "Niet actief"}
            </span>
          </div>

          {mfa?.hasVerifiedFactor ? (
            <div className="rounded-lg border border-success/30 bg-success/10 p-4">
              <p className="text-small">
                MFA staat aan. Huidig beveiligingsniveau:{" "}
                <strong>{mfa.currentLevel.toUpperCase()}</strong>.
              </p>
            </div>
          ) : (
            <PortalMfaSetupForm />
          )}
        </div>

        <div className="border-t border-border pt-5">
          <h2 className="font-medium mb-1">Sessies</h2>
          <p className="text-small text-muted mb-3">
            Gebruik uitloggen om de huidige sessie op dit apparaat te beëindigen.
          </p>
          <Link href="/uitloggen" className="text-small text-primary hover:underline">
            Uitloggen
          </Link>
        </div>
      </Card>
    </div>
  );
}
