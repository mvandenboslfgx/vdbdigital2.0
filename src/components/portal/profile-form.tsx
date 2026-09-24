"use client";

import { useActionState } from "react";
import {
  updatePortalProfileAction,
  type PortalActionState,
} from "@/server/actions/portal-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const initial: PortalActionState = {};

export function ProfileForm({
  email,
  fullName,
  marketingOptIn,
  canManageOrganization,
  organization,
}: {
  email: string;
  fullName: string;
  marketingOptIn: boolean;
  canManageOrganization: boolean;
  organization?: {
    legalName?: string | null;
    tradeName?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    vatNumber?: string | null;
    kvkNumber?: string | null;
    invoiceAddress?: string | null;
  } | null;
}) {
  const [state, formAction, pending] = useActionState(
    updatePortalProfileAction,
    initial,
  );

  return (
    <form action={formAction} className="space-y-6">
      <section className="space-y-4 rounded-xl border border-border bg-surface p-5">
        <div>
          <h2 className="text-h3">Persoonlijk</h2>
          <p className="mt-1 text-small text-muted">
            Deze gegevens horen bij jouw eigen account.
          </p>
        </div>
        <div>
          <label className="block text-small font-medium mb-1">E-mailadres</label>
          <Input value={email} disabled readOnly />
        </div>
        <div>
          <label htmlFor="fullName" className="block text-small font-medium mb-1">
            Naam
          </label>
          <Input
            id="fullName"
            name="fullName"
            defaultValue={fullName}
            required
            maxLength={120}
          />
        </div>
      </section>

      {canManageOrganization ? (
        <section className="space-y-4 rounded-xl border border-border bg-surface p-5">
          <div>
            <h2 className="text-h3">Organisatie</h2>
            <p className="mt-1 text-small text-muted">
              Als primair contact kun je hier de klantgegevens beheren die VDB Digital
              gebruikt voor communicatie en administratie.
            </p>
          </div>

          <Input
            label="Officiële naam"
            value={organization?.legalName ?? ""}
            disabled
            readOnly
          />
          <Input
            name="tradeName"
            label="Handelsnaam / weergavenaam"
            defaultValue={organization?.tradeName ?? ""}
            maxLength={200}
            placeholder="Bijv. Van den Bos Media"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              name="contactEmail"
              label="Contact e-mail"
              type="email"
              defaultValue={organization?.contactEmail ?? email}
              maxLength={254}
            />
            <Input
              name="contactPhone"
              label="Telefoonnummer"
              type="tel"
              defaultValue={organization?.contactPhone ?? ""}
              maxLength={40}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              name="kvkNumber"
              label="KvK-nummer"
              defaultValue={organization?.kvkNumber ?? ""}
              maxLength={40}
            />
            <Input
              name="vatNumber"
              label="BTW-nummer"
              defaultValue={organization?.vatNumber ?? ""}
              maxLength={40}
            />
          </div>
          <Textarea
            name="invoiceAddress"
            label="Factuuradres"
            defaultValue={organization?.invoiceAddress ?? ""}
            rows={3}
            maxLength={500}
            placeholder="Straat + huisnummer, postcode en plaats"
          />
        </section>
      ) : null}

      <section className="space-y-3 rounded-xl border border-border bg-surface p-5">
        <div>
          <h2 className="text-h3">E-mailvoorkeuren</h2>
          <p className="mt-1 text-small text-muted">
            Transactionele e-mails over je account, project of bestelling blijven
            losstaan van deze keuze.
          </p>
        </div>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="marketingConsent"
            value="true"
            defaultChecked={marketingOptIn}
            className="mt-1 accent-primary"
          />
          <span className="text-small">
            Ik wil nieuws, tips en aanbiedingen van VDB Digital per e-mail ontvangen.
          </span>
        </label>
      </section>

      {state.error ? (
        <p className="text-small text-error" role="alert">{state.error}</p>
      ) : null}
      {state.message ? (
        <p className="text-small text-success" role="status">{state.message}</p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Opslaan…" : "Wijzigingen opslaan"}
      </Button>
    </form>
  );
}
