import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/container";
import { LinkButton } from "@/components/ui/link-button";
import { requirePortalCustomer } from "@/server/auth/require-portal-customer";
import { createServerSupabaseClient } from "@/lib/database/server";

export const metadata: Metadata = {
  title: "Beveiliging",
  robots: { index: false },
};

export default async function PortalSecurityPage() {
  const ctx = await requirePortalCustomer();
  const supabase = await createServerSupabaseClient();

  let email = ctx.user.email ?? "—";
  let providers: string[] = [];
  let aal: string | null = null;
  let lastSignIn: string | null = null;

  if (supabase) {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (user) {
      email = user.email ?? email;
      providers = (user.app_metadata?.providers as string[] | undefined) ?? [];
      if (!providers.length && user.app_metadata?.provider) {
        providers = [String(user.app_metadata.provider)];
      }
      lastSignIn = user.last_sign_in_at ?? null;
    }
    try {
      const { data: aalData } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      aal = aalData?.currentLevel ?? null;
    } catch {
      aal = null;
    }
  }

  const hasPassword = providers.includes("email") || providers.length === 0;
  const hasGoogle = providers.includes("google");

  return (
    <div className="space-y-6 max-w-lg">
      <header className="space-y-2">
        <h1 className="text-h1">Beveiliging</h1>
        <p className="text-muted text-small">
          Accountbeveiliging voor {email}. Alleen acties die door onze authprovider
          worden ondersteund.
        </p>
      </header>

      <Card className="space-y-5">
        <div>
          <h2 className="font-medium mb-1">Inlogmethoden</h2>
          <ul className="text-small text-muted space-y-1">
            <li>E-mail: {email}</li>
            <li>
              Providers:{" "}
              {providers.length
                ? providers.map((p) => (p === "google" ? "Google" : p)).join(", ")
                : "E-mail / wachtwoord"}
            </li>
            {lastSignIn ? (
              <li>
                Laatste login: {new Date(lastSignIn).toLocaleString("nl-NL")}
              </li>
            ) : null}
            {aal ? <li>Huidig beveiligingsniveau: {aal.toUpperCase()}</li> : null}
          </ul>
        </div>

        {hasPassword ? (
          <div className="border-t border-border pt-4">
            <h2 className="font-medium mb-1">Wachtwoord</h2>
            <p className="text-small text-muted mb-3">
              Wijzig je wachtwoord via de beveiligde resetflow van Supabase Auth.
            </p>
            <LinkButton href="/wachtwoord-vergeten" variant="outline">
              Wachtwoord resetten
            </LinkButton>
          </div>
        ) : null}

        {hasGoogle ? (
          <div className="border-t border-border pt-4">
            <h2 className="font-medium mb-1">Google</h2>
            <p className="text-small text-muted">
              Je account is gekoppeld aan Google. Beheer wachtwoord en 2FA in je
              Google-account; VDB Digital gebruikt die sessie via OAuth.
            </p>
          </div>
        ) : null}

        <div className="border-t border-border pt-4">
          <h2 className="font-medium mb-1">Extra authenticatie (MFA)</h2>
          <p className="text-small text-muted">
            Voor klanten is MFA optioneel. Voor beheerders is MFA verplicht (AAL2).
            Er is geen aparte klant-MFA-inschrijving in dit portaal.
          </p>
        </div>

        <div className="border-t border-border pt-4">
          <h2 className="font-medium mb-1">Sessie</h2>
          <p className="text-small text-muted mb-3">
            Beëindig de sessie op dit apparaat. Na uitloggen heb je opnieuw een
            geldige login nodig.
          </p>
          <form action="/uitloggen" method="POST">
            <button
              type="submit"
              className="inline-flex items-center justify-center min-h-11 px-4 rounded-lg border border-border text-sm hover:bg-surface"
            >
              Uitloggen
            </button>
          </form>
        </div>

        <div className="border-t border-border pt-4">
          <Link href="/portal/instellingen" className="text-small text-primary hover:underline">
            Naar accountinstellingen
          </Link>
        </div>
      </Card>
    </div>
  );
}
